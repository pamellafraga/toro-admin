export interface DashboardUser {
  id: string
  username: string
  role: "admin" | "comercial"
  display_name: string
  email: string | null
  password_hash?: string
  created_at?: string
  updated_at?: string
}

import { randomUUID } from "crypto"
import { queryMany, queryOne } from "@/lib/db/pool"

export async function findUserByUsername(username: string): Promise<DashboardUser | null> {
  return queryOne<DashboardUser>(
    `SELECT id, username, role, display_name, email, password_hash, created_at, updated_at
     FROM dashboard_users WHERE LOWER(TRIM(username)) = LOWER(TRIM(?)) LIMIT 1`,
    [username],
  )
}

export async function findUserPasswordHash(id: string): Promise<string | null> {
  const row = await queryOne<{ password_hash: string }>(
    `SELECT password_hash FROM dashboard_users WHERE id = ?`,
    [id],
  )
  return row?.password_hash ?? null
}

export async function listUsers(): Promise<DashboardUser[]> {
  return queryMany<DashboardUser>(
    `SELECT id, username, role, display_name, email, created_at, updated_at
     FROM dashboard_users ORDER BY display_name`,
  )
}

export async function createUser(input: {
  username: string
  password_hash: string
  role: string
  display_name: string
  email: string | null
}): Promise<DashboardUser> {
  const id = randomUUID()
  await queryOne(
    `INSERT INTO dashboard_users (id, username, password_hash, role, display_name, email)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [id, input.username, input.password_hash, input.role, input.display_name, input.email],
  )
  const row = await queryOne<DashboardUser>(
    `SELECT id, username, role, display_name, email, created_at FROM dashboard_users WHERE id = ?`,
    [id],
  )
  if (!row) throw new Error("Falha ao criar usuário.")
  return row
}

export async function updateUser(
  id: string,
  updates: Partial<{
    display_name: string
    username: string
    role: string
    email: string | null
    password_hash: string
  }>,
): Promise<DashboardUser | null> {
  const sets: string[] = []
  const params: unknown[] = []

  for (const [key, value] of Object.entries(updates)) {
    if (value !== undefined) {
      sets.push(`${key} = ?`)
      params.push(value)
    }
  }
  if (sets.length === 0) return null

  params.push(id)
  await queryOne(`UPDATE dashboard_users SET ${sets.join(", ")} WHERE id = ?`, params)

  return queryOne<DashboardUser>(
    `SELECT id, username, role, display_name, email, updated_at FROM dashboard_users WHERE id = ?`,
    [id],
  )
}

export async function deleteUser(id: string): Promise<DashboardUser | null> {
  const row = await queryOne<DashboardUser>(
    `SELECT display_name, username FROM dashboard_users WHERE id = ?`,
    [id],
  )
  if (!row) return null
  await queryOne(`DELETE FROM dashboard_users WHERE id = ?`, [id])
  return row
}

export async function deleteUserByUsername(username: string): Promise<boolean> {
  const row = await queryOne<{ id: string }>(
    `SELECT id FROM dashboard_users WHERE LOWER(TRIM(username)) = LOWER(TRIM(?))`,
    [username],
  )
  if (!row) return false
  await queryOne(`DELETE FROM dashboard_users WHERE id = ?`, [row.id])
  return true
}

export async function updateUserPassword(id: string, password_hash: string): Promise<void> {
  await queryOne(`UPDATE dashboard_users SET password_hash = ? WHERE id = ?`, [password_hash, id])
}
