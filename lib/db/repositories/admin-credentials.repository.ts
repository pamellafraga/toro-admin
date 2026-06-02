import { queryMany, queryOne } from "@/lib/db/pool"

export interface AdminCredential {
  id: string
  service: string
  login: string
  password: string
  url: string | null
  notes: string | null
  category: string
  created_at?: string
  updated_at?: string
}

export async function listCredentials(): Promise<AdminCredential[]> {
  return queryMany<AdminCredential>(
    `SELECT * FROM admin_credentials ORDER BY service`,
  )
}

export async function upsertCredential(
  payload: Omit<AdminCredential, "created_at" | "updated_at"> & { id?: string },
): Promise<void> {
  if (payload.id) {
    await queryOne(
      `UPDATE admin_credentials
       SET service = $1, login = $2, password = $3, url = $4, notes = $5, category = $6, updated_at = now()
       WHERE id = $7`,
      [payload.service, payload.login, payload.password, payload.url, payload.notes, payload.category, payload.id],
    )
    return
  }
  await queryOne(
    `INSERT INTO admin_credentials (service, login, password, url, notes, category)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [payload.service, payload.login, payload.password, payload.url, payload.notes, payload.category],
  )
}

export async function deleteCredential(id: string): Promise<void> {
  await queryOne(`DELETE FROM admin_credentials WHERE id = $1`, [id])
}
