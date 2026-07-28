const { Client } = require("pg")
const fs = require("fs")
const path = require("path")

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
  const sql = fs.readFileSync(path.join(__dirname, "037_toro_product_images.sql"), "utf8")
  await c.query(sql)
  console.log("Tabela toro_product_images criada.")
  await c.end()
}

main().catch((e) => {
  console.error(e.message)
  process.exit(1)
})
