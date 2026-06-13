import pg from "pg"

const pool = new pg.Pool({
  host: process.env.DATABASE_HOST || "admxpress.postgresql.dbaas.com.br",
  port: 5432,
  database: process.env.DATABASE_NAME || "admxpress",
  user: process.env.DATABASE_USER || "admxpress",
  password: process.env.DATABASE_PASSWORD || "Xpress@101029",
  ssl: false,
})

const cnpj = "03627226000105"

const clientRes = await pool.query(
  `SELECT id, name, email, cpf_cnpj, liticapro_data
   FROM clients
   WHERE regexp_replace(cpf_cnpj, '[^0-9]', '', 'g') = $1`,
  [cnpj],
)
console.log("clients:", JSON.stringify(clientRes.rows, null, 2))

if (clientRes.rows[0]) {
  const contractRes = await pool.query(
    `SELECT c.id, c.status, c.liticapro_meta, p.slug
     FROM contracts c
     JOIN products p ON p.id = c.product_id
     WHERE c.client_id = $1
     ORDER BY c.created_at DESC
     LIMIT 3`,
    [clientRes.rows[0].id],
  )
  console.log("contracts:", JSON.stringify(contractRes.rows, null, 2))
}

await pool.end()
