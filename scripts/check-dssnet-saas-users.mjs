import pg from "pg"

const saasPool = new pg.Pool({
  host: "licitapro.postgresql.dbaas.com.br",
  port: 5432,
  database: "licitapro",
  user: "licitapro",
  password: "Xpress@101029",
  ssl: { rejectUnauthorized: false },
})

const res = await saasPool.query(
  `SELECT id, login, email, "createdAt" FROM "Usuario" WHERE "empresaId" = 'cmqclox950000ic0449pipawz' AND ativo = true ORDER BY "createdAt" ASC`,
)
console.log(res.rows)
await saasPool.end()
