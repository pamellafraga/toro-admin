import mysql, { type Pool, type PoolOptions, type RowDataPacket, type ResultSetHeader } from "mysql2/promise"
import { getDatabaseConfig, isDatabaseConfigured } from "./config"
import {
  isPlanetScaleEnabled,
  planetscaleQuery,
  planetscaleQueryMany,
  planetscaleQueryOne,
} from "./planetscale-pool"

let pool: Pool | null = null

export function getPool(): Pool {
  if (!isDatabaseConfigured()) {
    throw new Error("DATABASE_HOST não configurado.")
  }
  if (!pool) {
    const cfg = getDatabaseConfig()
    const options: PoolOptions = {
      host: cfg.host,
      port: cfg.port,
      database: cfg.database,
      user: cfg.user,
      password: cfg.password,
      connectionLimit: cfg.max,
      waitForConnections: true,
      timezone: "Z",
      dateStrings: true,
      enableKeepAlive: true,
    }
    if (cfg.ssl) {
      options.ssl = {
        rejectUnauthorized: /tidbcloud|psdb\.cloud|railway/i.test(cfg.host),
      }
    }
    pool = mysql.createPool(options)
  }
  return pool
}

/** Converte SQL legado PostgreSQL para MySQL */
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
    if (typeof value === "string" && (key === "metadata" || key === "items" || key === "address" || key === "status_history")) {
      try {
        out[key] = JSON.parse(value)
      } catch {
        // keep string
      }
    }
  }
  return out as T
}

export async function query<T extends RowDataPacket = RowDataPacket>(
  text: string,
  params: unknown[] = [],
): Promise<{ rows: T[]; insertId?: number; affectedRows?: number }> {
  if (isPlanetScaleEnabled()) {
    return planetscaleQuery<T>(text, params)
  }
  const sql = toMysqlSql(text)
  const p = getPool()
  const [result, fields] = await p.execute(sql, params)
  if (Array.isArray(result)) {
    return { rows: result.map((r) => parseJsonFields(r as T)) as T[] }
  }
  const header = result as ResultSetHeader
  return { rows: [], insertId: header.insertId, affectedRows: header.affectedRows }
}

export async function queryOne<T extends RowDataPacket = RowDataPacket>(
  text: string,
  params?: unknown[],
): Promise<T | null> {
  if (isPlanetScaleEnabled()) {
    return planetscaleQueryOne<T>(text, params)
  }
  const result = await query<T>(text, params)
  return result.rows[0] ?? null
}

export async function queryMany<T extends RowDataPacket = RowDataPacket>(
  text: string,
  params?: unknown[],
): Promise<T[]> {
  if (isPlanetScaleEnabled()) {
    return planetscaleQueryMany<T>(text, params)
  }
  const result = await query<T>(text, params)
  return result.rows
}

export async function withTransaction<T>(fn: (connection: mysql.PoolConnection) => Promise<T>): Promise<T> {
  const p = getPool()
  const connection = await p.getConnection()
  try {
    await connection.beginTransaction()
    const result = await fn(connection)
    await connection.commit()
    return result
  } catch (e) {
    await connection.rollback()
    throw e
  } finally {
    connection.release()
  }
}
