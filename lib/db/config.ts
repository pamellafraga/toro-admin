export interface DatabaseConfig {
  host: string
  port: number
  database: string
  user: string
  password: string
  ssl: boolean
  max: number
}

export function getDatabaseConfig(): DatabaseConfig {
  const host = process.env.DATABASE_HOST?.trim()
  const database = process.env.DATABASE_NAME?.trim() || "toro_admin"
  const user = process.env.DATABASE_USER?.trim() || "toro_admin"
  const password = process.env.DATABASE_PASSWORD ?? ""

  if (!host) {
    throw new Error(
      "DATABASE_HOST não configurado. Defina o servidor PostgreSQL da Locaweb no .env.local.",
    )
  }

  return {
    host,
    port: Number(process.env.DATABASE_PORT || 5432),
    database,
    user,
    password,
    ssl: process.env.DATABASE_SSL === "true",
    max: Number(process.env.DATABASE_POOL_MAX || 10),
  }
}

export function isDatabaseConfigured(): boolean {
  return Boolean(process.env.DATABASE_HOST?.trim())
}
