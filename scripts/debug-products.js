const { Client } = require("pg")

async function main() {
  const c = new Client({
    host: process.env.DATABASE_HOST || "admxpress.postgresql.dbaas.com.br",
    port: Number(process.env.DATABASE_PORT || 5432),
    database: process.env.DATABASE_NAME || "admxpress",
    user: process.env.DATABASE_USER || "admxpress",
    password: process.env.DATABASE_PASSWORD || "Xpress@101029",
  })
  await c.connect()
  const all = await c.query(
    `SELECT slug, external_id, name, metadata->>'gender' AS gender FROM products ORDER BY name`,
  )
  console.log("ALL products:", all.rows.length)
  all.rows.forEach((r) => console.log(r.slug, r.external_id, r.gender, r.name))

  const toro = await c.query(
    `SELECT slug FROM products WHERE external_id IS NOT NULL AND metadata->>'gender' IS NOT NULL`,
  )
  console.log("\nToro filter:", toro.rows.length)
  await c.end()
}

main().catch(console.error)
