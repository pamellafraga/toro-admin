import { queryMany, queryOne } from "@/lib/db/pool"

export async function listLatestContractStatusByClient(): Promise<{ client_id: string; status: string }[]> {
  const rows = await listPrimaryContractByClient()
  return rows.map((r) => ({ client_id: r.client_id, status: r.status }))
}

export type ClientPrimaryContract = {
  client_id: string
  status: string
  payment_status: string | null
  product_name: string
  product_slug: string
}

/** Contrato principal por cliente — prioriza status ativo e usa updated_at (sincronizado com Produtos). */
export async function listPrimaryContractByClient(): Promise<ClientPrimaryContract[]> {
  return queryMany<ClientPrimaryContract>(
    `SELECT client_id, status, payment_status, product_name, product_slug
     FROM (
       SELECT
         c.client_id,
         c.status,
         c.payment_status,
         p.name AS product_name,
         lower(p.slug) AS product_slug,
         ROW_NUMBER() OVER (
           PARTITION BY c.client_id
           ORDER BY
             CASE lower(trim(c.status))
               WHEN 'trial' THEN 1
               WHEN 'aguardando_produto' THEN 2
               WHEN 'ativa' THEN 3
               WHEN 'active' THEN 3
               ELSE 9
             END,
             c.updated_at DESC NULLS LAST,
             c.created_at DESC
         ) AS rn
       FROM contracts c
       INNER JOIN products p ON p.id = c.product_id
     ) ranked
     WHERE rn = 1`,
  )
}

/** Contrato LiticaPro mais recente do cliente (para atualizar em novo cadastro manual). */
/** Contrato mais recente do cliente (para sincronizar status com Contatos). */
export async function findLatestContractByClientId(clientId: string) {
  return queryOne<{ id: string; status: string }>(
    `SELECT id, status FROM contracts
     WHERE client_id = $1
     ORDER BY updated_at DESC NULLS LAST, created_at DESC
     LIMIT 1`,
    [clientId],
  )
}

export async function updateLatestContractStatusByClientId(
  clientId: string,
  status: string,
): Promise<boolean> {
  const row = await queryOne<{ id: string }>(
    `UPDATE contracts SET status = $2, updated_at = now()
     WHERE id = (
       SELECT id FROM contracts
       WHERE client_id = $1
       ORDER BY updated_at DESC NULLS LAST, created_at DESC
       LIMIT 1
     )
     RETURNING id`,
    [clientId, status],
  )
  return Boolean(row)
}

export async function findLiticaProContractByClientId(clientId: string, productId: string) {
  return queryOne<{
    id: string
    status: string
    payment_status: string
    trial_ends_at: string | null
    liticapro_meta: Record<string, unknown> | null
  }>(
    `SELECT c.id, c.status, c.payment_status, c.trial_ends_at, c.liticapro_meta
     FROM contracts c
     WHERE c.client_id = $1 AND c.product_id = $2
     ORDER BY c.updated_at DESC NULLS LAST, c.created_at DESC
     LIMIT 1`,
    [clientId, productId],
  )
}

/** CNPJ já usado em teste grátis (como empresa PJ ou vinculado a PF). */
export async function findLiticaProTrialByLinkedCnpj(
  cnpjDigits: string,
  excludeClientId?: string | null,
) {
  const digits = String(cnpjDigits ?? "").replace(/\D/g, "")
  if (digits.length !== 14) return null

  return queryOne<{ client_id: string; client_name: string; contract_id: string }>(
    `SELECT cl.id AS client_id, cl.name AS client_name, c.id AS contract_id
     FROM contracts c
     INNER JOIN clients cl ON cl.id = c.client_id
     INNER JOIN products p ON p.id = c.product_id
     WHERE lower(p.slug) = 'liticapro'
       AND ($2::uuid IS NULL OR cl.id <> $2::uuid)
       AND (
         regexp_replace(COALESCE(cl.cpf_cnpj, ''), '\\D', '', 'g') = $1
         OR EXISTS (
           SELECT 1
           FROM jsonb_array_elements(COALESCE(cl.liticapro_data->'linked_cnpjs', '[]'::jsonb)) elem
           WHERE regexp_replace(COALESCE(elem->>'cnpj', ''), '\\D', '', 'g') = $1
         )
       )
     ORDER BY c.created_at DESC
     LIMIT 1`,
    [digits, excludeClientId ?? null],
  )
}

export async function findContractById(id: string) {
  return queryOne<{ id: string; client_id: string; product_id: string; status: string }>(
    `SELECT id, client_id, product_id, status FROM contracts WHERE id = $1`,
    [id],
  )
}

export async function findContractWithProduct(id: string) {
  return queryOne<{
    id: string
    client_id: string
    product_id: string
    status: string
    payment_status: string
    trial_ends_at: string | null
    created_at: string
    product_slug: string
    liticapro_meta: Record<string, unknown> | null
  }>(
    `SELECT c.id, c.client_id, c.product_id, c.status, c.payment_status, c.trial_ends_at,
            c.created_at, c.liticapro_meta, lower(p.slug) AS product_slug
     FROM contracts c
     JOIN products p ON p.id = c.product_id
     WHERE c.id = $1`,
    [id],
  )
}

export async function updateContract(
  id: string,
  input: {
    status?: string
    payment_status?: string
    monthly_value?: number
    start_date?: string
    end_date?: string | null
    payment_day?: number
    notes?: string | null
    plan?: string | null
    trial_ends_at?: string | null
    liticapro_meta?: Record<string, unknown> | null
  },
): Promise<void> {
  await queryOne(
    `UPDATE contracts SET
       status = COALESCE($1, status),
       payment_status = COALESCE($2, payment_status),
       monthly_value = COALESCE($3, monthly_value),
       start_date = COALESCE($4::date, start_date),
       end_date = COALESCE($5::date, end_date),
       payment_day = COALESCE($6, payment_day),
       notes = COALESCE($7, notes),
       plan = COALESCE($8, plan),
       trial_ends_at = COALESCE($9::timestamptz, trial_ends_at),
       liticapro_meta = COALESCE($10::jsonb, liticapro_meta),
       updated_at = now()
     WHERE id = $11`,
    [
      input.status ?? null,
      input.payment_status ?? null,
      input.monthly_value ?? null,
      input.start_date ?? null,
      input.end_date ?? null,
      input.payment_day ?? null,
      input.notes ?? null,
      input.plan ?? null,
      input.trial_ends_at ?? null,
      input.liticapro_meta ? JSON.stringify(input.liticapro_meta) : null,
      id,
    ],
  )
}

export async function deleteContract(id: string): Promise<boolean> {
  const row = await queryOne<{ id: string }>(
    `DELETE FROM contracts WHERE id = $1 RETURNING id`,
    [id],
  )
  return Boolean(row)
}

export async function insertContract(input: {
  client_id: string
  product_id: string
  status: string
  payment_status: string
  start_date: string
  monthly_value: number
  notes: string | null
  origem_comercial: string | null
  trial_ends_at?: string | null
  plan?: string | null
  liticapro_meta?: Record<string, unknown> | null
}) {
  const row = await queryOne<{ id: string; client_id: string; product_id: string }>(
    `INSERT INTO contracts (
       client_id, product_id, status, payment_status, start_date, monthly_value,
       notes, origem_comercial, trial_ends_at, plan, liticapro_meta
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb)
     RETURNING id, client_id, product_id`,
    [
      input.client_id,
      input.product_id,
      input.status,
      input.payment_status,
      input.start_date,
      input.monthly_value,
      input.notes,
      input.origem_comercial,
      input.trial_ends_at ?? null,
      input.plan ?? null,
      input.liticapro_meta ? JSON.stringify(input.liticapro_meta) : null,
    ],
  )
  if (!row) throw new Error("Falha ao criar contrato.")
  return row
}

export async function backfillLiticaProTrialEndsAt(): Promise<number> {
  const rows = await queryMany<{ id: string; created_at: string }>(
    `SELECT c.id, c.created_at
     FROM contracts c
     JOIN products p ON p.id = c.product_id
     WHERE lower(p.slug) = 'liticapro'
       AND c.payment_status = 'trial'
       AND c.trial_ends_at IS NULL
       AND c.created_at IS NOT NULL`,
  )
  for (const row of rows) {
    await queryOne(
      `UPDATE contracts SET trial_ends_at = created_at + interval '7 days', updated_at = now() WHERE id = $1`,
      [row.id],
    )
  }
  return rows.length
}

export async function findExpiredLiticaProTrials() {
  return queryMany<{
    id: string
    client_id: string
    trial_ends_at: string
    client_name: string
    client_email: string | null
    created_at: string
  }>(
    `SELECT c.id, c.client_id,
            COALESCE(c.trial_ends_at, c.created_at + interval '7 days') AS trial_ends_at,
            cl.name AS client_name, cl.email AS client_email, c.created_at
     FROM contracts c
     JOIN clients cl ON cl.id = c.client_id
     JOIN products p ON p.id = c.product_id
     WHERE lower(p.slug) = 'liticapro'
       AND c.status = 'trial'
       AND (COALESCE(c.trial_ends_at, c.created_at + interval '7 days'))::date < CURRENT_DATE`,
  )
}

export async function markTrialExpired(contractId: string): Promise<void> {
  await queryOne(
    `UPDATE contracts
     SET payment_status = 'trial_expirado', status = 'trial_encerrado', updated_at = now()
     WHERE id = $1`,
    [contractId],
  )
}

export async function findLiticaProTrialsNeedingReactivation() {
  return queryMany<{ id: string }>(
    `SELECT c.id
     FROM contracts c
     JOIN products p ON p.id = c.product_id
     WHERE lower(p.slug) = 'liticapro'
       AND (c.status = 'trial_encerrado' OR c.payment_status = 'trial_expirado')
       AND (COALESCE(c.trial_ends_at, c.created_at + interval '7 days'))::date >= CURRENT_DATE`,
  )
}

export async function markTrialReactivated(contractId: string): Promise<void> {
  await queryOne(
    `UPDATE contracts
     SET payment_status = 'trial', status = 'trial', updated_at = now()
     WHERE id = $1`,
    [contractId],
  )
}

export async function activateContract(id: string): Promise<void> {
  await queryOne(`UPDATE contracts SET status = 'ativa' WHERE id = $1`, [id])
}

export async function findContractsByIds(ids: string[]) {
  if (ids.length === 0) return []
  return queryMany(
    `SELECT id, client_id, payment_status, monthly_value, product_id FROM contracts WHERE id = ANY($1::uuid[])`,
    [ids],
  )
}

export async function findProductNamesByIds(ids: string[]): Promise<Record<string, string>> {
  if (ids.length === 0) return {}
  const rows = await queryMany<{ id: string; name: string }>(
    `SELECT id, name FROM products WHERE id = ANY($1::uuid[])`,
    [ids],
  )
  return Object.fromEntries(rows.map((p) => [p.id, p.name]))
}
