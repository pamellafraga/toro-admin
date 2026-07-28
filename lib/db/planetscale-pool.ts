import { connect, type Connection, type ExecutedQuery } from "@planetscale/database"
import type { RowDataPacket } from "mysql2/promise"
import { getDatabaseConfig, usePlanetScaleDriver } from "./config"

let connection: Connection | null = null

function getPlanetScaleConnection(): Connection {
  if (!connection) {
    const url = process.env.DATABASE_URL?.trim()
    if (url) {
      connection = connect({ url })
    } else {
      const cfg = getDatabaseConfig()
      connection = connect({
        host: cfg.host,
        username: cfg.user,
        password: cfg.password,
      })
    }
  }
  return connection
}

/** Converte SQL legado PostgreSQL para MySQL (mesma lógica do pool mysql2) */
function toMysqlSql(sql: string): string {
  return sql
    .replace(/::jsonb/gi, "")
    .replace(/::text/gi, "")
    .replace(/::int/gi, "")
    .replace(/::float/gi, "")
    .replace(/'\{\}'::jsonb/gi, "'{}'")
    .replace(/metadata->>'(\w+)'/g, "JSON_UNQUOTE(JSON_EXTRACT(metadata, '$.$1'))")
    .replace(/([a-z_]+)->>'(\w+)'/gi, "JSON_UNQUOTE(JSON_EXTRACT($1, '$.$2'))")
    .replace(/\$(\d+)/g, "?")
    .replace(/\bILIKE\b/gi, "LIKE")
    .replace(/\bnow\(\)/gi, "CURRENT_TIMESTAMP")
    .replace(/date_trunc\('year', CURRENT_DATE\)/gi, "DATE_FORMAT(CURRENT_DATE, '%Y-01-01')")
    .replace(/EXTRACT\(MONTH FROM created_at\)/gi, "MONTH(created_at)")
    .replace(/COUNT\(\*\)::int/gi, "CAST(COUNT(*) AS SIGNED)")
    .replace(/COUNT\(\*\)::text/gi, "CAST(COUNT(*) AS CHAR)")
    .replace(/COALESCE\(SUM\([^)]+\), 0\)::float/gi, (m) => m.replace("::float", ""))
    .replace(/::text AS/gi, " AS")
}

function parseJsonFields<T>(row: T): T {
  if (!row || typeof row !== "object") return row
  const out = { ...row } as Record<string, unknown>
  for (const [key, value] of Object.entries(out)) {
    if (
      typeof value === "string" &&
      (key === "metadata" || key === "items" || key === "address" || key === "status_history" || key === "stock_by_size")
    ) {
      try {
        out[key] = JSON.parse(value)
      } catch {
        // keep string
      }
    }
  }
  return out as T
}

function mapExecutedQuery<T extends RowDataPacket>(
  result: ExecutedQuery,
): { rows: T[]; insertId?: number; affectedRows?: number } {
  const rows = (result.rows ?? []).map((r) => parseJsonFields(r as T)) as T[]
  const header = result as ExecutedQuery & { insertId?: number; affectedRows?: number }
  return {
    rows,
    insertId: header.insertId,
    affectedRows: header.rowsAffected ?? header.affectedRows,
  }
}

export async function planetscaleQuery<T extends RowDataPacket = RowDataPacket>(
  text: string,
  params: unknown[] = [],
): Promise<{ rows: T[]; insertId?: number; affectedRows?: number }> {
  const sql = toMysqlSql(text)
  const conn = getPlanetScaleConnection()
  const result = await conn.execute(sql, params)
  return mapExecutedQuery<T>(result)
}

export async function planetscaleQueryOne<T extends RowDataPacket = RowDataPacket>(
  text: string,
  params?: unknown[],
): Promise<T | null> {
  const result = await planetscaleQuery<T>(text, params)
  return result.rows[0] ?? null
}

export async function planetscaleQueryMany<T extends RowDataPacket = RowDataPacket>(
  text: string,
  params?: unknown[],
): Promise<T[]> {
  const result = await planetscaleQuery<T>(text, params)
  return result.rows
}

export function isPlanetScaleEnabled(): boolean {
  return usePlanetScaleDriver()
}
