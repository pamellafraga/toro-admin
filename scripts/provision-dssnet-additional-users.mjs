import pg from "pg"
import { createRequire } from "module"
import path from "path"
import { fileURLToPath } from "url"

const require = createRequire(import.meta.url)
const bcrypt = require(path.join(
  fileURLToPath(new URL(".", import.meta.url)),
  "..",
  "..",
  "LicitaPregão",
  "licitapro-main",
  "node_modules",
  "bcryptjs",
))

const adminPool = new pg.Pool({
  host: process.env.DATABASE_HOST || "admxpress.postgresql.dbaas.com.br",
  port: 5432,
  database: process.env.DATABASE_NAME || "admxpress",
  user: process.env.DATABASE_USER || "admxpress",
  password: process.env.DATABASE_PASSWORD || "Xpress@101029",
  ssl: false,
})

const saasPool = new pg.Pool({
  host: "licitapro.postgresql.dbaas.com.br",
  port: 5432,
  database: "licitapro",
  user: "licitapro",
  password: "Xpress@101029",
  ssl: { rejectUnauthorized: false },
})

const EMPRESA_ID = "cmqclox950000ic0449pipawz"
const CLIENT_CNPJ = "03627226000105"

function normalizeAuthKey(value) {
  return value.trim().replace(/\s+/g, " ").toLowerCase()
}

function formatAuthCapsStored(value) {
  return value.replace(/\s+/g, " ").toUpperCase().trim()
}

const ADDITIONAL_USERS = [
  {
    email: "pamela.silva@dssnet.com.br",
    login: "PAMELA MARTINS",
    senha: "GQHFyk2Nmq1!",
    cpf: "06185375117",
    full_name: "Pamela Martins Silva",
    birth_date: "1998-09-10",
  },
  {
    email: "danielle.camilo@dssnet.com.br",
    login: "DANIELLE MARTINS",
    senha: "N05u5vpI661!",
    cpf: "99212544134",
    full_name: "Danielle Martins Camilo",
    birth_date: "1982-02-11",
  },
  {
    email: "igor.brandao@dssnet.com.br",
    login: "IGOR BRANDÃO",
    senha: "QmjYS5KjbC1!",
    cpf: "12431258610",
    full_name: "Igor Brandão Alves",
    birth_date: "1993-04-26",
  },
]

async function upsertUser(client, user) {
  const loginKey = normalizeAuthKey(user.login)
  const login = formatAuthCapsStored(user.login)
  const passwordHash = await bcrypt.hash(user.senha, 12)
  const email = user.email.trim().toLowerCase()

  const existing = await client.query(
    `SELECT id FROM "Usuario" WHERE "empresaId" = $1 AND "loginKey" = $2`,
    [EMPRESA_ID, loginKey],
  )

  if (existing.rows[0]?.id) {
    await client.query(
      `UPDATE "Usuario"
       SET login = $2, "passwordHash" = $3, email = $4, ativo = true,
           "failedLoginAttempts" = 0, "lockedUntil" = NULL, "updatedAt" = NOW()
       WHERE id = $1`,
      [existing.rows[0].id, login, passwordHash, email],
    )
    return existing.rows[0].id
  }

  const id = `usr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  await client.query(
    `INSERT INTO "Usuario"
      (id, "empresaId", login, "loginKey", email, "passwordHash", ativo, "failedLoginAttempts", "createdAt", "updatedAt")
     VALUES ($1, $2, $3, $4, $5, $6, true, 0, NOW(), NOW())`,
    [id, EMPRESA_ID, login, loginKey, email, passwordHash],
  )
  return id
}

async function main() {
  const saasClient = await saasPool.connect()
  try {
    await saasClient.query("BEGIN")
    for (const user of ADDITIONAL_USERS) {
      const id = await upsertUser(saasClient, user)
      console.log("SaaS user OK:", user.email, id)
    }

    const usersRes = await saasClient.query(
      `SELECT id, login, email FROM "Usuario" WHERE "empresaId" = $1 AND ativo = true ORDER BY "createdAt" ASC`,
      [EMPRESA_ID],
    )

    const allProfiles = [
      {
        cpf: "39267598600",
        nomeCompleto: "Fernando Antonio Bellezzia",
        dataNascimento: "1964-06-06",
        email: "fernando.bellezzia@dssnet.com.br",
      },
      ...ADDITIONAL_USERS.map((u) => ({
        cpf: u.cpf,
        nomeCompleto: u.full_name,
        dataNascimento: u.birth_date,
        email: u.email,
      })),
    ].map((profile, index) => ({
      ...profile,
      usuarioId: usersRes.rows[index]?.id,
    }))

    const empresaRes = await saasClient.query(`SELECT "perfilEmpresa" FROM "Empresa" WHERE id = $1`, [EMPRESA_ID])
    const perfil = empresaRes.rows[0]?.perfilEmpresa || {}
    await saasClient.query(`UPDATE "Empresa" SET "perfilEmpresa" = $2::jsonb WHERE id = $1`, [
      EMPRESA_ID,
      JSON.stringify({ ...perfil, usuariosPlataforma: allProfiles }),
    ])
    await saasClient.query("COMMIT")

    const ids = usersRes.rows.map((row) => row.id)
    console.log("SaaS usuario ids:", ids)

    const clientRes = await adminPool.query(
      `SELECT id, liticapro_data FROM clients WHERE regexp_replace(cpf_cnpj, '[^0-9]', '', 'g') = $1`,
      [CLIENT_CNPJ],
    )
    const client = clientRes.rows[0]
    const saasUsers = client.liticapro_data?.saas_users ?? []
    const updatedUsers = saasUsers.map((user, index) => ({
      ...user,
      saas_usuario_id: ids[index] ?? user.saas_usuario_id,
    }))
    await adminPool.query(
      `UPDATE clients SET liticapro_data = jsonb_set(liticapro_data, '{saas_users}', $2::jsonb, true) WHERE id = $1`,
      [client.id, JSON.stringify(updatedUsers)],
    )
    const contractRes = await adminPool.query(
      `SELECT id, liticapro_meta FROM contracts WHERE client_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [client.id],
    )
    await adminPool.query(
      `UPDATE contracts SET liticapro_meta = liticapro_meta || $2::jsonb WHERE id = $1`,
      [contractRes.rows[0].id, JSON.stringify({ saas_usuario_ids: ids })],
    )
    console.log("Admin dashboard atualizado.")
  } catch (err) {
    await saasClient.query("ROLLBACK")
    throw err
  } finally {
    saasClient.release()
    await saasPool.end()
    await adminPool.end()
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
