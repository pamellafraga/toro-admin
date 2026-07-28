/**
 * Copia dados do MySQL Locaweb (SOURCE) para um MySQL na nuvem (TARGET).
 *
 * Uso:
 *   1. SOURCE = .env.local (Locaweb — conecta do seu PC)
 *   2. TARGET = .env.cloud (Railway, TiDB, PlanetScale TCP, etc.)
 *
 *   node scripts/clone-mysql-database.js
 *
 * Depois atualize o Vercel com as variáveis TARGET (ou DATABASE_URL).
 */
const fs = require("fs")
const path = require("path")
const mysql = require("mysql2/promise")

const TABLES = [
  "dashboard_users",
  "products",
  "toro_orders",
  "toro_store_customers",
  "toro_factory_orders",
  "toro_product_images",
  "internal_support_tickets",
  "company_expenses",
  "password_reset_codes",
  "activity_log",
]

function loadEnvFile(name) {
  const envPath = path.join(__dirname, "..", name)
  if (!fs.existsSync(envPath)) return {}
  const out = {}
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const t = line.trim()
    if (!t || t.startsWith("#")) continue
    const i = t.indexOf("=")
    if (i === -1) continue
    out[t.slice(0, i).trim()] = t.slice(i + 1).trim().replace(/^["']|["']$/g, "")
  }
  return out
}

function configFromEnv(env, prefix = "") {
  const url = env[`${prefix}DATABASE_URL`]
  if (url) {
    const parsed = new URL(url)
    return {
      host: parsed.hostname,
      port: Number(parsed.port || 3306),
      database: parsed.pathname.replace(/^\//, "").split("?")[0],
      user: decodeURIComponent(parsed.username),
      password: decodeURIComponent(parsed.password),
      ssl: !parsed.searchParams.get("sslaccept")?.includes("disable"),
    }
  }
  return {
    host: env[`${prefix}DATABASE_HOST`],
    port: Number(env[`${prefix}DATABASE_PORT`] || 3306),
    database: env[`${prefix}DATABASE_NAME`],
    user: env[`${prefix}DATABASE_USER`],
    password: env[`${prefix}DATABASE_PASSWORD`] || "",
    ssl: env[`${prefix}DATABASE_SSL`] === "true",
  }
}

async function connect(cfg, label) {
  const opts = {
    host: cfg.host,
    port: cfg.port,
    database: cfg.database,
    user: cfg.user,
    password: cfg.password,
    multipleStatements: true,
  }
  if (cfg.ssl || /tidbcloud|railway|psdb\.cloud/i.test(cfg.host)) {
    opts.ssl = { rejectUnauthorized: true }
  }
  try {
    const conn = await mysql.createConnection(opts)
    console.log(`${label}: conectado (${cfg.host}/${cfg.database})`)
    return conn
  } catch (e) {
    throw new Error(`${label}: falha — ${e.message}`)
  }
}

async function cloneTable(source, target, table) {
  const [rows] = await source.query(`SELECT * FROM \`${table}\``)
  if (!rows.length) {
    console.log(`  ${table}: vazio, pulando`)
    return
  }

  await target.query(`DELETE FROM \`${table}\``)
  const cols = Object.keys(rows[0])
  const placeholders = cols.map(() => "?").join(", ")
  const colList = cols.map((c) => `\`${c}\``).join(", ")

  for (const row of rows) {
    const values = cols.map((c) => {
      const v = row[c]
      if (v !== null && typeof v === "object" && !(v instanceof Date) && !Buffer.isBuffer(v)) {
        return JSON.stringify(v)
      }
      return v
    })
    await target.query(`INSERT INTO \`${table}\` (${colList}) VALUES (${placeholders})`, values)
  }
  console.log(`  ${table}: ${rows.length} registro(s)`)
}

async function main() {
  const sourceEnv = loadEnvFile(".env.local")
  const targetEnv = loadEnvFile(".env.cloud")

  const sourceCfg = configFromEnv(sourceEnv)
  const targetCfg = configFromEnv(targetEnv)

  if (!sourceCfg.host) throw new Error("SOURCE: configure .env.local com Locaweb")
  if (!targetCfg.host) {
    console.log(`
TARGET não configurado.

Crie o arquivo .env.cloud com o MySQL na nuvem (Railway, TiDB, etc.):

  DATABASE_URL=mysql://user:pass@host:3306/railway

ou:

  TARGET_DATABASE_HOST=...
  TARGET_DATABASE_USER=...
  TARGET_DATABASE_PASSWORD=...
  TARGET_DATABASE_NAME=...

Depois rode: node scripts/run-mysql-setup.js  (com .env.cloud copiado para .env.local)
             node scripts/clone-mysql-database.js
`)
    process.exit(1)
  }

  const schemaPath = path.join(__dirname, "mysql", "001_toro_schema.sql")
  const schemaSql = fs.readFileSync(schemaPath, "utf8")

  const source = await connect(sourceCfg, "SOURCE (Locaweb)")
  const target = await connect(targetCfg, "TARGET (nuvem)")

  console.log("Aplicando schema no TARGET…")
  for (const stmt of schemaSql.split(";")) {
    const sql = stmt.trim()
    if (sql) await target.query(sql)
  }

  console.log("Copiando tabelas…")
  for (const table of TABLES) {
    try {
      await cloneTable(source, target, table)
    } catch (e) {
      if (/doesn't exist|Unknown table/i.test(e.message)) {
        console.log(`  ${table}: não existe na origem, pulando`)
      } else {
        throw e
      }
    }
  }

  await source.end()
  await target.end()
  console.log("\nConcluído! Atualize o Vercel com DATABASE_URL ou DATABASE_* do TARGET.")
}

main().catch((e) => {
  console.error(e.message || e)
  process.exit(1)
})
