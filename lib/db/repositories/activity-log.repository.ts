import { queryOne } from "@/lib/db/pool"

export interface LogActivityInput {
  user_name: string
  action: string
  entity_type?: string
  entity_id?: string | null
  details?: Record<string, unknown> | null
}

export async function insertActivityLog(input: LogActivityInput): Promise<void> {
  await queryOne(
    `INSERT INTO activity_log (user_id, user_name, action, entity_type, entity_id, details)
     VALUES (NULL, $1, $2, $3, $4, $5::jsonb)`,
    [
      input.user_name,
      input.action,
      input.entity_type ?? "",
      input.entity_id ?? null,
      input.details ? JSON.stringify(input.details) : null,
    ],
  )
}
