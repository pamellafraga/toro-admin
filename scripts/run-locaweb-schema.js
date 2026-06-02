const fs = require("fs")
const path = require("path")
const { Client } = require("pg")

const env = Object.fromEntries(
  fs
    .readFileSync(path.join(__dirname, "..", ".env.local"), "utf8")
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith("#"))
    .map((l) => {
      const i = l.indexOf("=")
      return [l.slice(0, i), l.slice(i + 1)]
    }),
)

async function main() {
  const sql = fs.readFileSync(path.join(__dirname, "locaweb", "001_schema.sql"), "utf8")
  const client = new Client({
    host: env.DATABASE_HOST,
    port: Number(env.DATABASE_PORT || 5432),
    database: env.DATABASE_NAME,
    user: env.DATABASE_USER,
    password: env.DATABASE_PASSWORD,
    ssl: env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : false,
  })

  await client.connect()
  console.log("Aplicando schema...")
  await client.query(sql)
  const users = await client.query("SELECT username, role FROM dashboard_users ORDER BY display_name")
  console.log("Schema aplicado. Usuarios:", users.rows.map((u) => u.username).join(", "))
  await client.end()
}

main().catch((e) => {
  console.error("ERRO:", e.message)
  process.exit(1)
})
