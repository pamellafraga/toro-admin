const { Client } = require("pg")
const crypto = require("crypto")

const hash = crypto.createHash("sha256").update("toro@101029").digest("hex")

async function main() {
  const c = new Client({
    host: process.env.DATABASE_HOST || "admxpress.postgresql.dbaas.com.br",
    port: Number(process.env.DATABASE_PORT || 5432),
    database: process.env.DATABASE_NAME || "admxpress",
    user: process.env.DATABASE_USER || "admxpress",
    password: process.env.DATABASE_PASSWORD || "Xpress@101029",
    ssl: process.env.DATABASE_SSL === "true",
  })
  await c.connect()
  await c.query(
    `INSERT INTO dashboard_users (username, password_hash, role, display_name)
     VALUES ('Toro', $1, 'admin', 'Toro')
     ON CONFLICT (username) DO UPDATE SET
       password_hash = EXCLUDED.password_hash,
       role = 'admin',
       display_name = 'Toro'`,
    [hash],
  )
  console.log("Usuario Toro criado/atualizado.")
  await c.end()
}

main().catch((e) => {
  console.error(e.message)
  process.exit(1)
})
