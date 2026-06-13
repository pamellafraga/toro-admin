import pg from "pg"

const pool = new pg.Pool({
  host: process.env.DATABASE_HOST || "admxpress.postgresql.dbaas.com.br",
  port: 5432,
  database: process.env.DATABASE_NAME || "admxpress",
  user: process.env.DATABASE_USER || "admxpress",
  password: process.env.DATABASE_PASSWORD || "Xpress@101029",
  ssl: false,
})

const clientRes = await pool.query(
  `SELECT id, name, email, liticapro_data
   FROM clients
   WHERE regexp_replace(cpf_cnpj, '[^0-9]', '', 'g') = '03627226000105'`,
)

const client = clientRes.rows[0]
console.log("client:", client?.name, client?.email)
const data = client?.liticapro_data
console.log("saas_users:", JSON.stringify(data?.saas_users, null, 2))

const contractRes = await pool.query(
  `SELECT liticapro_meta FROM contracts WHERE client_id = $1 ORDER BY created_at DESC LIMIT 1`,
  [client.id],
)
console.log("meta:", JSON.stringify(contractRes.rows[0]?.liticapro_meta, null, 2))

await pool.end()
