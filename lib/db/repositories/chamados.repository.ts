import { queryMany, queryOne } from "@/lib/db/pool"
import type { InternalSupportTicket, SupportTicketPriority, SupportTicketStatus } from "@/lib/types"

export async function listTickets(status?: SupportTicketStatus): Promise<InternalSupportTicket[]> {
  if (status) {
    return queryMany<InternalSupportTicket>(
      `SELECT * FROM internal_support_tickets WHERE status = $1 ORDER BY created_at DESC`,
      [status],
    )
  }
  return queryMany<InternalSupportTicket>(
    `SELECT * FROM internal_support_tickets ORDER BY created_at DESC`,
  )
}

export async function createTicket(row: {
  source_tool: string | null
  client_identifier: string | null
  client_email: string | null
  subject: string
  message: string
  priority: SupportTicketPriority
  external_user_id: string | null
  status: SupportTicketStatus
}): Promise<InternalSupportTicket> {
  const created = await queryOne<InternalSupportTicket>(
    `INSERT INTO internal_support_tickets
       (source_tool, client_identifier, client_email, subject, message, priority, external_user_id, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [
      row.source_tool,
      row.client_identifier,
      row.client_email,
      row.subject,
      row.message,
      row.priority,
      row.external_user_id,
      row.status,
    ],
  )
  if (!created) throw new Error("Falha ao criar chamado.")
  return created
}

export async function updateTicketStatus(
  id: string,
  status: SupportTicketStatus,
): Promise<InternalSupportTicket | null> {
  return queryOne<InternalSupportTicket>(
    `UPDATE internal_support_tickets SET status = $1, updated_at = now() WHERE id = $2 RETURNING *`,
    [status, id],
  )
}
