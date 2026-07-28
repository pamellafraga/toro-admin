export interface DatabaseConfig {
  host: string
  port: number
  database: string
  user: string
  password: string
  ssl: boolean
  max: number
}

function parseDatabaseUrl(url: string): DatabaseConfig {
  const parsed = new URL(url)
  const database = parsed.pathname.replace(/^\//, "").split("?")[0]
  const sslParam = parsed.searchParams.get("sslaccept") ?? parsed.searchParams.get("ssl")
  const ssl =
    sslParam === "false" || sslParam === "disable"
      ? false
      : sslParam === "true" || sslParam === "strict" || parsed.protocol === "mysqls:"
        ? true
        : parsed.hostname.includes("dbaas.com.br")
          ? false
          : parsed.hostname.includes("railway") ||
              parsed.hostname.includes("tidb") ||
              parsed.hostname.includes("psdb.cloud") ||
              parsed.hostname.includes("aiven")
            ? true
            : false

  return {
    host: parsed.hostname,
    port: Number(parsed.port || 3306),
    database: database || "toro_xp",
    user: decodeURIComponent(parsed.username),
    password: decodeURIComponent(parsed.password),
    ssl,
    max: Number(process.env.DATABASE_POOL_MAX || 10),
  }
}

export function getDatabaseConfig(): DatabaseConfig {
  const databaseUrl = process.env.DATABASE_URL?.trim()
  if (databaseUrl) {
    return parseDatabaseUrl(databaseUrl)
  }

  const host = process.env.DATABASE_HOST?.trim()
  const database = process.env.DATABASE_NAME?.trim() || "toro_xp"
  const user = process.env.DATABASE_USER?.trim() || "toro_xp"
  const password = process.env.DATABASE_PASSWORD ?? ""

  if (!host) {
    throw new Error(
      "DATABASE_HOST ou DATABASE_URL não configurado. Defina o MySQL no .env.local ou Vercel.",
    )
  }

  return {
    host,
    port: Number(process.env.DATABASE_PORT || 3306),
    database,
    user,
    password,
    ssl: process.env.DATABASE_SSL === "true",
    max: Number(process.env.DATABASE_POOL_MAX || 10),
  }
}

export function isDatabaseConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL?.trim() || process.env.DATABASE_HOST?.trim())
}

export function usePlanetScaleDriver(): boolean {
  if (process.env.DATABASE_DRIVER === "planetscale") return true
  const url = process.env.DATABASE_URL?.trim() ?? ""
  return url.includes("psdb.cloud") || url.includes("connect.psdb.cloud")
}
