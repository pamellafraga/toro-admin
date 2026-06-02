import pg from "pg"
import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const pool = new pg.Pool({
  host: process.env.DATABASE_HOST || "admxpress.postgresql.dbaas.com.br",
  port: Number(process.env.DATABASE_PORT || 5432),
  database: process.env.DATABASE_NAME || "admxpress",
  user: process.env.DATABASE_USER || "admxpress",
  password: process.env.DATABASE_PASSWORD || "Xpress@101029",
  ssl: process.env.DATABASE_SSL === "true",
})

const file = process.argv[2] || "004_notifications_link.sql"
const sql = fs.readFileSync(path.join(__dirname, "locaweb", file), "utf8")

try {
  await pool.query(sql)
  console.log(`OK: ${file} aplicado.`)
} catch (e) {
  console.error("ERRO:", e.message)
  process.exit(1)
} finally {
  await pool.end()
}
