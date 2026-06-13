import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"
import pg from "pg"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const envPath = path.join(__dirname, "..", ".env.local")
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith("#")) continue
    const idx = trimmed.indexOf("=")
    if (idx <= 0) continue
    const key = trimmed.slice(0, idx).trim()
    const value = trimmed.slice(idx + 1).trim()
    if (!process.env[key]) process.env[key] = value
  }
}

import { sendLiticaProCompanyWelcomeEmails } from "../lib/liticapro/send-company-welcome-emails"
import type { LiticaProSaaSUser } from "../lib/liticapro/types"

const pool = new pg.Pool({
  host: process.env.DATABASE_HOST,
  port: Number(process.env.DATABASE_PORT),
  database: process.env.DATABASE_NAME,
  user: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
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

async function main() {
  const clientRes = await pool.query(
    `SELECT id, name, liticapro_data FROM clients WHERE regexp_replace(cpf_cnpj, '[^0-9]', '', 'g') = '03627226000105'`,
  )
  const client = clientRes.rows[0]
  const contractRes = await pool.query(
    `SELECT id, liticapro_meta FROM contracts WHERE client_id = $1 ORDER BY created_at DESC LIMIT 1`,
    [client.id],
  )
  const contract = contractRes.rows[0]
  const meta = contract.liticapro_meta ?? {}
  let saasUsers = (client.liticapro_data?.saas_users ?? []) as LiticaProSaaSUser[]

  const saasRes = await saasPool.query(
    `SELECT id, email FROM "Usuario" WHERE "empresaId" = $1 AND ativo = true`,
    [meta.saas_empresa_id],
  )
  const idByEmail = new Map(
    saasRes.rows.map((row) => [String(row.email ?? "").trim().toLowerCase(), row.id]),
  )

  saasUsers = saasUsers.map((user) => ({
    ...user,
    saas_usuario_id: idByEmail.get(user.email.trim().toLowerCase()) ?? user.saas_usuario_id,
  }))

  await pool.query(
    `UPDATE clients SET liticapro_data = jsonb_set(liticapro_data, '{saas_users}', $2::jsonb, true) WHERE id = $1`,
    [client.id, JSON.stringify(saasUsers)],
  )
  await pool.query(
    `UPDATE contracts SET liticapro_meta = liticapro_meta || $2::jsonb WHERE id = $1`,
    [contract.id, JSON.stringify({ saas_usuario_ids: [...idByEmail.values()] })],
  )

  const result = await sendLiticaProCompanyWelcomeEmails({
    companyName: client.name,
    users: saasUsers,
    loginUrl: process.env.LICITAPREGAO_LOGIN_URL,
    statesOfInterest: meta.states_of_interest ?? [],
  })

  console.log("Emails enviados:", result.sentCount)
  console.log("Destinatários:", [...result.sentEmails])
  if (result.errors.length) console.log("Erros:", result.errors)

  const sentAt = new Date().toISOString()
  const updatedUsers = saasUsers.map((user) =>
    result.sentEmails.has(user.email.trim().toLowerCase())
      ? { ...user, welcome_email_sent_at: sentAt }
      : user,
  )
  await pool.query(
    `UPDATE clients SET liticapro_data = jsonb_set(liticapro_data, '{saas_users}', $2::jsonb, true) WHERE id = $1`,
    [client.id, JSON.stringify(updatedUsers)],
  )
  await pool.query(
    `UPDATE contracts SET liticapro_meta = liticapro_meta || $2::jsonb WHERE id = $1`,
    [
      contract.id,
      JSON.stringify({
        welcome_email_sent_at: sentAt,
        welcome_email_channel: result.channel ?? null,
      }),
    ],
  )
}

main()
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(async () => {
    await pool.end()
    await saasPool.end()
  })
