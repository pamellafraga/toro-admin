import { queryMany, queryOne } from "@/lib/db/pool"

export async function listNfeDocuments(limit = 100) {
  return queryMany(
    `SELECT id, client_id, number, series, status, client_name, total_value, created_at, provider_payload, pdf_storage_path
     FROM nfe_documents ORDER BY created_at DESC LIMIT $1`,
    [limit],
  )
}

export async function insertNfeDocument(payload: Record<string, unknown>) {
  return queryOne(
    `INSERT INTO nfe_documents
       (client_id, client_name, total_value, nature_operation, cfop, status, number, series, provider_id, provider_payload, provider_response)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, $11::jsonb)
     RETURNING *`,
    [
      payload.client_id,
      payload.client_name,
      payload.total_value,
      payload.nature_operation,
      payload.cfop,
      payload.status,
      payload.number,
      payload.series,
      payload.provider_id,
      JSON.stringify(payload.provider_payload ?? {}),
      payload.provider_response ? JSON.stringify(payload.provider_response) : null,
    ],
  )
}

export async function updateNfeDocument(id: string, updates: Record<string, unknown>) {
  const sets: string[] = []
  const params: unknown[] = []
  let i = 1
  for (const [key, value] of Object.entries(updates)) {
    if (value !== undefined) {
      if (key === "provider_payload" || key === "provider_response") {
        sets.push(`${key} = $${i++}::jsonb`)
        params.push(JSON.stringify(value))
      } else {
        sets.push(`${key} = $${i++}`)
        params.push(value)
      }
    }
  }
  if (sets.length === 0) return null
  params.push(id)
  return queryOne(`UPDATE nfe_documents SET ${sets.join(", ")} WHERE id = $${i} RETURNING *`, params)
}

export async function findNfeDocument(id: string) {
  return queryOne(`SELECT * FROM nfe_documents WHERE id = $1`, [id])
}

export async function deleteNfeDocument(id: string): Promise<void> {
  await queryOne(`DELETE FROM nfe_documents WHERE id = $1`, [id])
}

export async function cancelNfeDocument(id: string) {
  return queryOne(
    `UPDATE nfe_documents SET status = 'cancelada' WHERE id = $1 RETURNING *`,
    [id],
  )
}
