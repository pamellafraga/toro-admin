import pg from "pg"

const pool = new pg.Pool({
  host: process.env.DATABASE_HOST || "admxpress.postgresql.dbaas.com.br",
  port: 5432,
  database: process.env.DATABASE_NAME || "admxpress",
  user: process.env.DATABASE_USER || "admxpress",
  password: process.env.DATABASE_PASSWORD || "Xpress@101029",
  ssl: false,
})

try {
  const { rows } = await pool.query(
    "SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename",
  )
  console.log("TABELAS:", rows.map((r) => r.tablename).join(", ") || "(nenhuma)")

  for (const t of ["clients", "contracts", "products", "notifications", "activity_log"]) {
    const cols = await pool.query(
      "SELECT column_name FROM information_schema.columns WHERE table_name=$1 ORDER BY ordinal_position",
      [t],
    )
    console.log(`${t.toUpperCase()}:`, cols.rows.map((r) => r.column_name).join(", ") || "NAO EXISTE")
  }
} catch (e) {
  console.error("ERRO:", e.message)
} finally {
  await pool.end()
}
