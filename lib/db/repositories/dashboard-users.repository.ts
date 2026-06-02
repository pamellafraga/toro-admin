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

import { queryMany, queryOne } from "@/lib/db/pool"

export async function findUserByUsername(username: string): Promise<DashboardUser | null> {
  return queryOne<DashboardUser>(
    `SELECT id, username, role, display_name, email, password_hash, created_at, updated_at
     FROM dashboard_users WHERE lower(trim(username)) = lower(trim($1)) LIMIT 1`,
    [username],
  )
}

export async function findUserPasswordHash(id: string): Promise<string | null> {
  const row = await queryOne<{ password_hash: string }>(
    `SELECT password_hash FROM dashboard_users WHERE id = $1`,
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
  const row = await queryOne<DashboardUser>(
    `INSERT INTO dashboard_users (username, password_hash, role, display_name, email)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, username, role, display_name, email, created_at`,
    [input.username, input.password_hash, input.role, input.display_name, input.email],
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
  let i = 1

  for (const [key, value] of Object.entries(updates)) {
    if (value !== undefined) {
      sets.push(`${key} = $${i++}`)
      params.push(value)
    }
  }
  if (sets.length === 0) return null

  sets.push(`updated_at = now()`)
  params.push(id)

  return queryOne<DashboardUser>(
    `UPDATE dashboard_users SET ${sets.join(", ")} WHERE id = $${i}
     RETURNING id, username, role, display_name, email, updated_at`,
    params,
  )
}

export async function deleteUser(id: string): Promise<DashboardUser | null> {
  return queryOne<DashboardUser>(
    `DELETE FROM dashboard_users WHERE id = $1 RETURNING display_name, username`,
    [id],
  )
}

export async function deleteUserByUsername(username: string): Promise<boolean> {
  const row = await queryOne<{ id: string }>(
    `DELETE FROM dashboard_users WHERE lower(trim(username)) = lower(trim($1)) RETURNING id`,
    [username],
  )
  return !!row
}

export async function updateUserPassword(id: string, password_hash: string): Promise<void> {
  await queryOne(
    `UPDATE dashboard_users SET password_hash = $1, updated_at = now() WHERE id = $2`,
    [password_hash, id],
  )
}
