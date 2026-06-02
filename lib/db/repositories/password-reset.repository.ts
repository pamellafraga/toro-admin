import { queryMany, queryOne } from "@/lib/db/pool"

export interface PasswordResetCode {
  id: string
  username: string | null
  email: string
  code: string
  expires_at: string
}

export async function deleteResetCodesByUsername(username: string): Promise<void> {
  await queryOne(`DELETE FROM password_reset_codes WHERE lower(trim(username)) = lower(trim($1))`, [username])
}

export async function insertResetCode(input: {
  username: string
  email: string
  code: string
  expires_at: Date
}): Promise<void> {
  await queryOne(
    `INSERT INTO password_reset_codes (username, email, code, expires_at) VALUES ($1, $2, $3, $4)`,
    [input.username, input.email, input.code, input.expires_at.toISOString()],
  )
}

export async function findValidResetCode(username: string, code: string): Promise<PasswordResetCode | null> {
  return queryOne<PasswordResetCode>(
    `SELECT id, username, email, code, expires_at
     FROM password_reset_codes
     WHERE lower(trim(username)) = lower(trim($1)) AND code = $2
     LIMIT 1`,
    [username, code],
  )
}

export async function deleteResetCode(id: string): Promise<void> {
  await queryOne(`DELETE FROM password_reset_codes WHERE id = $1`, [id])
}
