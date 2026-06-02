import {
  STEFANIE_ORIGEM_CAPTACAO,
  STEFANIE_ORIGEM_COMERCIAL,
  origemCaptacaoForComercial,
} from "@/lib/constants/origem-captacao"
import { queryMany, queryOne } from "@/lib/db/pool"

export type ClientesListView = "geral" | "stefanie" | "comercial-geral" | "comercial-meu"

type ClientRow = {
  id: string
  name: string
  email: string | null
  phone: string | null
  cpf_cnpj: string | null
  company: string | null
  address: string | null
  number: string | null
  district: string | null
  city: string | null
  state: string | null
  zip_code: string | null
  origem_captacao: string | null
  status_lead: string | null
  created_at: string
  updated_at: string
}

export async function listClientsForDashboard(
  view: ClientesListView,
  comercialDisplayName?: string | null,
): Promise<ClientRow[]> {
  if (view === "comercial-geral") {
    return queryMany<ClientRow>(
      `SELECT * FROM clients
       WHERE TRIM(COALESCE(origem_captacao, '')) = ''
       ORDER BY created_at ASC, name ASC
       LIMIT 10000`,
    )
  }

  if (view === "comercial-meu" && comercialDisplayName) {
    const origem = origemCaptacaoForComercial(comercialDisplayName)
    return queryMany<ClientRow>(
      `SELECT * FROM clients WHERE origem_captacao = $1 ORDER BY created_at ASC, name ASC LIMIT 10000`,
      [origem],
    )
  }

  if (view === "stefanie") {
    return queryMany<ClientRow>(
      `SELECT * FROM clients c
       WHERE c.origem_captacao = ANY($1::text[])
          OR c.id IN (
            SELECT DISTINCT client_id FROM contracts WHERE origem_comercial = $2
          )
       ORDER BY c.created_at ASC, c.name ASC
       LIMIT 10000`,
      [STEFANIE_ORIGEM_CAPTACAO, STEFANIE_ORIGEM_COMERCIAL],
    )
  }

  // Aba Geral (admin): website, xpress, compra manual etc. — exceto contatos da Stefanie
  return queryMany<ClientRow>(
    `SELECT * FROM clients c
     WHERE COALESCE(c.origem_captacao, '') <> ALL($1::text[])
       AND c.id NOT IN (
         SELECT DISTINCT client_id FROM contracts WHERE origem_comercial = $2
       )
     ORDER BY c.created_at ASC, c.name ASC
     LIMIT 10000`,
    [STEFANIE_ORIGEM_CAPTACAO, STEFANIE_ORIGEM_COMERCIAL],
  )
}

export async function deleteClient(id: string): Promise<void> {
  await queryOne(`DELETE FROM clients WHERE id = $1`, [id])
}

export async function updateClientFromDashboard(
  id: string,
  payload: {
    name: string
    email: string | null
    phone: string | null
    cpf_cnpj: string | null
    company: string | null
    address: string | null
    number?: string | null
    district?: string | null
    city?: string | null
    state?: string | null
    zip_code?: string | null
    origem_captacao: string | null
    status_lead: string | null
    customer_type?: "empresa" | "profissional_liberal"
  },
): Promise<void> {
  const isProf = payload.customer_type === "profissional_liberal"
  const company = isProf ? null : payload.company
  const address = isProf ? null : payload.address
  const number = isProf ? null : (payload.number ?? null)
  const district = isProf ? null : (payload.district ?? null)
  const city = isProf ? null : (payload.city ?? null)
  const state = isProf ? null : (payload.state ?? null)
  const zipCode = isProf ? null : (payload.zip_code ?? null)

  await queryOne(
    `UPDATE clients SET
       name = $1, email = $2, phone = $3, cpf_cnpj = $4, company = $5,
       address = $6, number = $7, district = $8, city = $9, state = $10, zip_code = $11,
       origem_captacao = $12, status_lead = $13,
       liticapro_data = COALESCE(liticapro_data, '{}'::jsonb) || CASE
         WHEN $14::text IS NOT NULL THEN jsonb_build_object('customer_type', $14)
         ELSE '{}'::jsonb
       END,
       updated_at = now()
     WHERE id = $15`,
    [
      payload.name,
      payload.email ?? "",
      payload.phone ?? "",
      payload.cpf_cnpj,
      company,
      address,
      number,
      district,
      city,
      state,
      zipCode,
      payload.origem_captacao,
      payload.status_lead,
      payload.customer_type ?? null,
      id,
    ],
  )
}

export async function searchClientByName(name: string) {
  return queryOne(
    `SELECT id, name, email, cpf_cnpj, address, number, district, city, state, zip_code
     FROM clients WHERE name ILIKE $1 LIMIT 1`,
    [`%${name}%`],
  )
}

export async function findClientByCpfCnpj(cpfCnpj: string) {
  return queryOne<{ id: string; name: string; liticapro_data: Record<string, unknown> | null }>(
    `SELECT id, name, liticapro_data FROM clients WHERE cpf_cnpj = $1 LIMIT 1`,
    [cpfCnpj],
  )
}

export async function getClientLiticaProData(id: string) {
  return queryOne<{ liticapro_data: Record<string, unknown> | null }>(
    `SELECT liticapro_data FROM clients WHERE id = $1`,
    [id],
  )
}

export async function updateClientLiticaProData(
  id: string,
  patch: Record<string, unknown>,
): Promise<void> {
  await queryOne(
    `UPDATE clients SET
       liticapro_data = COALESCE(liticapro_data, '{}'::jsonb) || $1::jsonb,
       updated_at = now()
     WHERE id = $2`,
    [JSON.stringify(patch), id],
  )
}

export async function updateClientDeveloperCredentials(
  id: string,
  dados: { empresa: string; usuario: string; senha: string },
): Promise<void> {
  await queryOne(
    `UPDATE clients SET
       liticapro_data = COALESCE(liticapro_data, '{}'::jsonb) || jsonb_build_object('dados_desenvolvedor', $1::jsonb),
       updated_at = now()
     WHERE id = $2`,
    [JSON.stringify(dados), id],
  )
}

export async function insertClient(payload: Record<string, unknown>): Promise<{ id: string }> {
  const row = await queryOne<{ id: string }>(
    `INSERT INTO clients (name, email, phone, cpf_cnpj, company, address, number, district, city, state, zip_code, origem_captacao, status_lead, liticapro_data)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14::jsonb)
     RETURNING id`,
    [
      payload.name,
      payload.email,
      payload.phone,
      payload.cpf_cnpj,
      payload.company ?? null,
      payload.address,
      payload.number,
      payload.district,
      payload.city,
      payload.state,
      payload.zip_code,
      payload.origem_captacao ?? null,
      payload.status_lead ?? null,
      payload.liticapro_data ? JSON.stringify(payload.liticapro_data) : null,
    ],
  )
  if (!row) throw new Error("Falha ao criar cliente.")
  return row
}

export async function updateClientStatusLead(id: string, statusLead: string | null): Promise<void> {
  await queryOne(
    `UPDATE clients SET status_lead = $1, updated_at = now() WHERE id = $2`,
    [statusLead, id],
  )
}

export async function updateClientForContract(
  id: string,
  payload: {
    name: string
    email: string | null
    phone: string | null
    cpf_cnpj?: string | null
    address: string | null
    number: string | null
    district: string | null
    city: string | null
    state: string | null
    zip_code: string | null
    origem_captacao: string | null
    status_lead: string | null
  },
): Promise<void> {
  await queryOne(
    `UPDATE clients SET
       name = $1, email = $2, phone = $3,
       cpf_cnpj = COALESCE($4, cpf_cnpj),
       address = $5, number = $6, district = $7, city = $8, state = $9, zip_code = $10,
       origem_captacao = COALESCE($11, origem_captacao),
       status_lead = COALESCE($12, status_lead),
       updated_at = now()
     WHERE id = $13`,
    [
      payload.name,
      payload.email,
      payload.phone,
      payload.cpf_cnpj ?? null,
      payload.address,
      payload.number,
      payload.district,
      payload.city,
      payload.state,
      payload.zip_code,
      payload.origem_captacao,
      payload.status_lead,
      id,
    ],
  )
}

export async function updateClient(id: string, payload: Record<string, unknown>): Promise<void> {
  await queryOne(
    `UPDATE clients SET
       name = $1, email = $2, phone = $3, company = COALESCE($4, company),
       address = $5, number = $6, district = $7, city = $8, state = $9, zip_code = $10,
       origem_captacao = COALESCE($11, origem_captacao),
       status_lead = COALESCE($12, status_lead),
       liticapro_data = COALESCE($13::jsonb, liticapro_data),
       updated_at = now()
     WHERE id = $14`,
    [
      payload.name,
      payload.email,
      payload.phone,
      payload.company ?? null,
      payload.address,
      payload.number,
      payload.district,
      payload.city,
      payload.state,
      payload.zip_code,
      payload.origem_captacao ?? null,
      payload.status_lead ?? null,
      payload.liticapro_data ? JSON.stringify(payload.liticapro_data) : null,
      id,
    ],
  )
}
