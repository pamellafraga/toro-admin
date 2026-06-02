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
  const r = await c.query("SELECT id, name, slug, description FROM products ORDER BY name")
  console.log(JSON.stringify(r.rows, null, 2))
  await c.end()
})().catch((e) => console.error(e.message))
