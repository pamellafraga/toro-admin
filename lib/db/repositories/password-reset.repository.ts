import { randomUUID } from "crypto"
import { queryOne } from "@/lib/db/pool"

export interface PasswordResetCode {
  id: string
  username: string | null
  email: string
  code: string
  expires_at: string
}

export async function deleteResetCodesByUsername(username: string): Promise<void> {
  await queryOne(`DELETE FROM password_reset_codes WHERE LOWER(TRIM(username)) = LOWER(TRIM(?))`, [username])
}

export async function insertResetCode(input: {
  username: string
  email: string
  code: string
  expires_at: Date
}): Promise<void> {
  await queryOne(
    `INSERT INTO password_reset_codes (id, username, email, code, expires_at) VALUES (?, ?, ?, ?, ?)`,
    [randomUUID(), input.username, input.email, input.code, input.expires_at.toISOString().slice(0, 19).replace("T", " ")],
  )
}

export async function findValidResetCode(username: string, code: string): Promise<PasswordResetCode | null> {
  return queryOne<PasswordResetCode>(
    `SELECT id, username, email, code, expires_at
     FROM password_reset_codes
     WHERE LOWER(TRIM(username)) = LOWER(TRIM(?)) AND code = ?
     LIMIT 1`,
    [username, code],
  )
}

export async function deleteResetCode(id: string): Promise<void> {
  await queryOne(`DELETE FROM password_reset_codes WHERE id = ?`, [id])
}
