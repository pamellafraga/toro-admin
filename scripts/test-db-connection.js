/**
 * Testa conexão MySQL e login do usuário Toro.
 * Uso: node scripts/test-db-connection.js
 */
const fs = require("fs")
const path = require("path")
const crypto = require("crypto")

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
  const mysql = require("mysql2/promise")
  const conn = await mysql.createConnection({
    host: process.env.DATABASE_HOST,
    port: Number(process.env.DATABASE_PORT || 3306),
    database: process.env.DATABASE_NAME,
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
  })

  const [tables] = await conn.execute("SHOW TABLES")
  console.log("Conectado:", process.env.DATABASE_HOST)
  console.log("Tabelas:", tables.map((r) => Object.values(r)[0]).join(", "))

  const hash = crypto.createHash("sha256").update("toro@101029").digest("hex")
  const [users] = await conn.execute(
    "SELECT username, role FROM dashboard_users WHERE password_hash = ? LIMIT 1",
    [hash],
  )
  console.log("Login Toro:", users[0] ? "OK" : "FALHOU")

  const [products] = await conn.execute(
    "SELECT COUNT(*) AS n FROM products WHERE JSON_UNQUOTE(JSON_EXTRACT(metadata, '$.gender')) IS NOT NULL",
  )
  console.log("Produtos Toro:", products[0].n)

  await conn.end()
}

main().catch((e) => {
  console.error(e.message)
  process.exit(1)
})
