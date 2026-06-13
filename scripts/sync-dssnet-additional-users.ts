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

const pool = new pg.Pool({
  host: process.env.DATABASE_HOST,
  port: Number(process.env.DATABASE_PORT),
  database: process.env.DATABASE_NAME,
  user: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  ssl: false,
})

async function main() {
const clientRes = await pool.query(
  `SELECT id, name, liticapro_data FROM clients WHERE regexp_replace(cpf_cnpj, '[^0-9]', '', 'g') = '03627226000105'`,
)
const contractRes = await pool.query(
  `SELECT id, liticapro_meta, trial_ends_at, start_date FROM contracts WHERE client_id = $1 ORDER BY created_at DESC LIMIT 1`,
  [clientRes.rows[0].id],
)

const client = clientRes.rows[0]
const contract = contractRes.rows[0]
const saasUsers = client.liticapro_data?.saas_users ?? []
const meta = contract.liticapro_meta ?? {}
const primary = saasUsers[0]
const additional = saasUsers.slice(1)

const baseUrl = process.env.LICITAPREGAO_API_URL?.replace(/\/$/, "")
const apiKey = process.env.LICITAPREGAO_API_KEY

const body = {
  customer_type: "empresa",
  email: primary.email,
  trial_starts_at: String(contract.start_date).slice(0, 10),
  trial_ends_at: String(contract.trial_ends_at).slice(0, 10),
  states_of_interest: meta.states_of_interest ?? [],
  credentials: primary.credentials,
  additional_users: additional.map((user: { email: string; cpf: string; full_name: string; birth_date: string; credentials: { usuario: string; senha: string } }) => ({
    email: user.email,
    cpf: user.cpf,
    full_name: user.full_name,
    birth_date: user.birth_date,
    credentials: {
      usuario: user.credentials.usuario,
      senha: user.credentials.senha,
    },
  })),
  external_client_id: client.id,
  external_contract_id: contract.id,
  cnpj: "03627226000105",
  company_name: client.name,
  phone: "65981590281",
  client_name: client.name,
  company_users: saasUsers.map((user: { cpf: string; full_name: string; birth_date: string; email: string }) => ({
    cpf: user.cpf,
    full_name: user.full_name,
    birth_date: user.birth_date,
    email: user.email,
  })),
}

console.log("POST", `${baseUrl}/api/provision`)
const res = await fetch(`${baseUrl}/api/provision`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`,
  },
  body: JSON.stringify(body),
})

const data = await res.json().catch(() => ({}))
console.log("status:", res.status)
console.log(JSON.stringify(data, null, 2))

if (res.ok && data.provisioned_users) {
  const ids = [data.usuario_id, ...data.provisioned_users.map((u: { usuario_id: string }) => u.usuario_id)]
  await pool.query(
    `UPDATE contracts SET liticapro_meta = liticapro_meta || $2::jsonb WHERE id = $1`,
    [contract.id, JSON.stringify({ saas_usuario_ids: ids })],
  )
  const updatedUsers = saasUsers.map((user: { saas_usuario_id?: string }, index: number) => ({
    ...user,
    saas_usuario_id: ids[index] ?? user.saas_usuario_id,
  }))
  await pool.query(
    `UPDATE clients SET liticapro_data = jsonb_set(liticapro_data, '{saas_users}', $2::jsonb, true) WHERE id = $1`,
    [client.id, JSON.stringify(updatedUsers)],
  )
  console.log("Updated saas_usuario_ids:", ids)
}

await pool.end()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
