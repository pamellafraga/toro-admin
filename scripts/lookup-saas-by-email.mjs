import pg from "pg"

const saasPool = new pg.Pool({
  host: "licitapro.postgresql.dbaas.com.br",
  port: 5432,
  database: "licitapro",
  user: "licitapro",
  password: "Xpress@101029",
  ssl: { rejectUnauthorized: false },
})

const emails = [
  "engenharia.verdant@gmail.com",
  "interiorconstrutora@hotmail.com",
  "renatoadm50@gmail.com",
  "eduribeiro2002@yahoo.com.br",
  "leandroprrosa@gmail.com",
]

for (const email of emails) {
  const r = await saasPool.query(
    `SELECT u.id, u.login, u.email, e.id AS empresa_id, e.nome, e."emTesteGratuito", e."assinaturaVencimento", e.ativa
     FROM "Usuario" u
     JOIN "Empresa" e ON e.id = u."empresaId"
     WHERE lower(u.email) = lower($1)`,
    [email],
  )
  console.log(email, r.rows)
}

await saasPool.end()
