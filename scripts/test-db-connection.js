const fs = require("fs")
const { Client } = require("pg")

const env = Object.fromEntries(
  fs
    .readFileSync(".env.local", "utf8")
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith("#"))
    .map((l) => {
      const i = l.indexOf("=")
      return [l.slice(0, i), l.slice(i + 1)]
    }),
)

const client = new Client({
  host: env.DATABASE_HOST,
  port: Number(env.DATABASE_PORT || 5432),
  database: env.DATABASE_NAME,
  user: env.DATABASE_USER,
  password: env.DATABASE_PASSWORD,
  ssl: env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : false,
})

async function main() {
  await client.connect()
  console.log("Conectado:", env.DATABASE_HOST)

  const tables = await client.query(
    "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name",
  )
  if (tables.rows.length === 0) {
    console.log("Nenhuma tabela ainda — execute scripts/locaweb/001_schema.sql no phpPgAdmin.")
  } else {
    console.log("Tabelas:", tables.rows.map((r) => r.table_name).join(", "))
  }

  const users = await client.query(
    "SELECT username, role FROM dashboard_users ORDER BY display_name",
  ).catch(() => ({ rows: [] }))

  const products = await client.query(
    "SELECT id, name, slug FROM products ORDER BY name",
  ).catch(() => ({ rows: [] }))

  if (products.rows.length) {
    console.log("Produtos:", products.rows.map((p) => `${p.name} (${p.slug ?? "sem slug"})`).join(", "))
  }

  if (users.rows.length) {
    console.log("Usuarios:", users.rows.map((u) => `${u.username} (${u.role})`).join(", "))
  }

  await client.end()
}

main().catch((e) => {
  console.error("ERRO:", e.message)
  process.exit(1)
})
