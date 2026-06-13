import pg from "pg"

const pool = new pg.Pool({
  host: "admxpress.postgresql.dbaas.com.br",
  port: 5432,
  database: "admxpress",
  user: "admxpress",
  password: "Xpress@101029",
  ssl: false,
})

const r = await pool.query(`
  SELECT c.id, c.status, c.payment_status, c.trial_ends_at, cl.name, cl.email,
         c.liticapro_meta->>'courtesy_extended_at' AS courtesy
  FROM contracts c
  JOIN clients cl ON cl.id = c.client_id
  JOIN products p ON p.id = c.product_id
  WHERE lower(p.slug) = 'liticapro'
    AND COALESCE(c.trial_ends_at, c.created_at + interval '7 days')::date < CURRENT_DATE
    AND (
      c.status IN ('trial', 'trial_encerrado')
      OR c.payment_status IN ('trial', 'trial_expirado')
    )
  ORDER BY c.trial_ends_at ASC
`)

console.log("total expirados:", r.rows.length)
console.log(JSON.stringify(r.rows, null, 2))
await pool.end()
