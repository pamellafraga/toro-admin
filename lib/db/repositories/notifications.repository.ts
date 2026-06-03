import { query, queryMany, queryOne } from "@/lib/db/pool"

export type NotificationRow = {
  id: string
  title: string
  message: string
  type: string
  link: string | null
  is_read: boolean
  audience: string
  dedupe_key: string | null
  created_at: string
}

let schemaReady: Promise<void> | null = null

async function ensureNotificationsSchema(): Promise<void> {
  if (!schemaReady) {
    schemaReady = (async () => {
      await query(`ALTER TABLE notifications ADD COLUMN IF NOT EXISTS link TEXT`)
      await query(
        `ALTER TABLE notifications ADD COLUMN IF NOT EXISTS audience TEXT NOT NULL DEFAULT 'all'`,
      )
      await query(`ALTER TABLE notifications ADD COLUMN IF NOT EXISTS dedupe_key TEXT`)
      await query(`ALTER TABLE notifications ADD COLUMN IF NOT EXISTS is_read BOOLEAN`)
      await query(`
        UPDATE notifications
        SET is_read = COALESCE(is_read, "read", false)
        WHERE is_read IS NULL
      `)
      await query(`
        CREATE UNIQUE INDEX IF NOT EXISTS idx_notifications_dedupe_key
          ON notifications (dedupe_key)
          WHERE dedupe_key IS NOT NULL
      `)
    })().catch((err) => {
      schemaReady = null
      throw err
    })
  }
  await schemaReady
}

const SELECT_FIELDS = `
  id, title, message, type, link, created_at,
  COALESCE(audience, 'all') AS audience,
  dedupe_key,
  COALESCE(is_read, "read", false) AS is_read
`

export async function insertNotification(input: {
  title: string
  message: string
  type?: string
  link?: string | null
  audience?: string
  dedupe_key?: string | null
}): Promise<void> {
  await ensureNotificationsSchema()
  await queryOne(
    `INSERT INTO notifications (title, message, type, link, audience, dedupe_key, is_read)
     VALUES ($1, $2, $3, $4, $5, $6, false)`,
    [
      input.title,
      input.message,
      input.type ?? "info",
      input.link ?? null,
      input.audience ?? "all",
      input.dedupe_key ?? null,
    ],
  )
}

export async function insertNotificationIfNew(input: {
  title: string
  message: string
  type?: string
  link?: string | null
  audience?: string
  dedupe_key: string
}): Promise<boolean> {
  await ensureNotificationsSchema()
  const exists = await queryOne<{ id: string }>(
    `SELECT id FROM notifications WHERE dedupe_key = $1 LIMIT 1`,
    [input.dedupe_key],
  )
  if (exists?.id) return false

  const row = await queryOne<{ id: string }>(
    `INSERT INTO notifications (title, message, type, link, audience, dedupe_key, is_read)
     VALUES ($1, $2, $3, $4, $5, $6, false)
     RETURNING id`,
    [
      input.title,
      input.message,
      input.type ?? "info",
      input.link ?? null,
      input.audience ?? "all",
      input.dedupe_key,
    ],
  )
  return Boolean(row?.id)
}

export async function listNotificationsForRole(isAdmin: boolean): Promise<NotificationRow[]> {
  await ensureNotificationsSchema()
  if (isAdmin) {
    return queryMany<NotificationRow>(
      `SELECT ${SELECT_FIELDS}
       FROM notifications
       WHERE audience IN ('all', 'admin')
       ORDER BY created_at DESC
       LIMIT 100`,
    )
  }
  return queryMany<NotificationRow>(
    `SELECT ${SELECT_FIELDS}
     FROM notifications
     WHERE audience = 'all'
     ORDER BY created_at DESC
     LIMIT 100`,
  )
}

export async function countUnreadNotificationsForRole(isAdmin: boolean): Promise<number> {
  await ensureNotificationsSchema()
  const row = await queryOne<{ count: string }>(
    isAdmin
      ? `SELECT COUNT(*)::text AS count FROM notifications
         WHERE audience IN ('all', 'admin') AND COALESCE(is_read, "read", false) = false`
      : `SELECT COUNT(*)::text AS count FROM notifications
         WHERE audience = 'all' AND COALESCE(is_read, "read", false) = false`,
  )
  return Number(row?.count ?? 0)
}

export async function markNotificationRead(id: string): Promise<void> {
  await ensureNotificationsSchema()
  await queryOne(`UPDATE notifications SET is_read = true WHERE id = $1`, [id])
}

export async function markAllNotificationsRead(isAdmin: boolean): Promise<void> {
  await ensureNotificationsSchema()
  if (isAdmin) {
    await queryOne(
      `UPDATE notifications SET is_read = true
       WHERE audience IN ('all', 'admin') AND COALESCE(is_read, "read", false) = false`,
    )
    return
  }
  await queryOne(
    `UPDATE notifications SET is_read = true
     WHERE audience = 'all' AND COALESCE(is_read, "read", false) = false`,
  )
}

export async function deleteNotification(id: string): Promise<void> {
  await ensureNotificationsSchema()
  await queryOne(`DELETE FROM notifications WHERE id = $1`, [id])
}
