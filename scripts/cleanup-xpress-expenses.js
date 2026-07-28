const fs = require("fs")
const path = require("path")
const mysql = require("mysql2/promise")

function loadEnvLocal() {
  const envPath = path.join(__dirname, "..", ".env.local")
  if (!fs.existsSync(envPath)) return
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const t = line.trim()
    if (!t || t.startsWith("#")) continue
    const i = t.indexOf("=")
    if (i === -1) continue
    const key = t.slice(0, i).trim()
    const val = t.slice(i + 1).trim().replace(/^["']|["']$/g, "")
    if (!process.env[key]) process.env[key] = val
  }
}

async function main() {
  loadEnvLocal()
  const c = await mysql.createConnection({
    host: process.env.DATABASE_HOST,
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_NAME,
    port: Number(process.env.DATABASE_PORT || 3306),
  })
  const [result] = await c.execute(
    "DELETE FROM company_expenses WHERE id LIKE 'a1000001-%'",
  )
  console.log("Gastos padrão Xpress removidos:", result.affectedRows)
  await c.end()
}

main().catch((err) => {
  console.error(err.message)
  process.exit(1)
})
