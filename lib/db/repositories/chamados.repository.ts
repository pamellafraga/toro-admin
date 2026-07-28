import { randomUUID } from "crypto"
import { queryMany, queryOne } from "@/lib/db/pool"
import type { InternalSupportTicket, SupportTicketPriority, SupportTicketStatus } from "@/lib/types"

export async function listTickets(status?: SupportTicketStatus): Promise<InternalSupportTicket[]> {
  if (status) {
    return queryMany<InternalSupportTicket>(
      `SELECT * FROM internal_support_tickets WHERE status = ? ORDER BY created_at DESC`,
      [status],
    )
  }
  return queryMany<InternalSupportTicket>(`SELECT * FROM internal_support_tickets ORDER BY created_at DESC`)
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
  const id = randomUUID()
  await queryOne(
    `INSERT INTO internal_support_tickets
       (id, source_tool, client_identifier, client_email, subject, message, priority, external_user_id, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
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
  const created = await queryOne<InternalSupportTicket>(
    `SELECT * FROM internal_support_tickets WHERE id = ?`,
    [id],
  )
  if (!created) throw new Error("Falha ao criar chamado.")
  return created
}

export async function updateTicketStatus(
  id: string,
  status: SupportTicketStatus,
): Promise<InternalSupportTicket | null> {
  await queryOne(`UPDATE internal_support_tickets SET status = ? WHERE id = ?`, [status, id])
  return queryOne<InternalSupportTicket>(`SELECT * FROM internal_support_tickets WHERE id = ?`, [id])
}
