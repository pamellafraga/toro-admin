const fs = require("fs")
const { Client } = require("pg")
const env = Object.fromEntries(
  fs.readFileSync(".env.local", "utf8").split(/\r?\n/).filter((l) => l && !l.startsWith("#")).map((l) => {
    const i = l.indexOf("=")
    return [l.slice(0, i), l.slice(i + 1)]
  }),
)
;(async () => {
  const c = new Client({
    host: env.DATABASE_HOST,
    port: 5432,
    database: env.DATABASE_NAME,
    user: env.DATABASE_USER,
    password: env.DATABASE_PASSWORD,
  })
  await c.connect()
  const cols = await c.query(
    "SELECT column_name FROM information_schema.columns WHERE table_name = 'products' ORDER BY ordinal_position",
  )
  console.log("columns:", cols.rows.map((r) => r.column_name).join(", "))
  const data = await c.query("SELECT id, name, slug, product_status FROM products ORDER BY name")
  console.log("products:", data.rows)

  // test update
  const segura = data.rows.find((r) => r.slug === "segura")
  if (segura) {
    await c.query("UPDATE products SET product_status = $1 WHERE id = $2", ["pausado", segura.id])
    const after = await c.query("SELECT slug, product_status FROM products WHERE id = $1", [segura.id])
    console.log("after update:", after.rows[0])
    await c.query("UPDATE products SET product_status = $1 WHERE id = $2", ["no_ar", segura.id])
  }
  await c.end()
})().catch((e) => console.error("ERRO:", e.message))
