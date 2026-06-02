import { NextRequest } from "next/server"
import { handleApiError, jsonError, jsonForbidden, jsonOk } from "@/lib/api/response"
import { canAccessChamadosPanel, canIngestChamadosFromTool } from "@/lib/chamados-api"
import { createTicket, listTickets } from "@/lib/db/repositories/chamados.repository"
import type { SupportTicketPriority, SupportTicketStatus } from "@/lib/types"

const STATUSES: SupportTicketStatus[] = ["aberto", "em_andamento", "resolvido", "fechado"]
const PRIORITIES: SupportTicketPriority[] = ["baixa", "normal", "alta", "urgente"]

export async function GET(request: NextRequest) {
  if (!canAccessChamadosPanel(request))
    return jsonForbidden("Sem permissão para acessar chamados.")

  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")
    const data = await listTickets(
      status && STATUSES.includes(status as SupportTicketStatus)
        ? (status as SupportTicketStatus)
        : undefined,
    )
    return jsonOk(data)
  } catch (e) {
    return handleApiError(e, "Erro ao listar chamados.")
  }
}

export async function POST(request: NextRequest) {
  if (!canIngestChamadosFromTool(request)) {
    return jsonError(
      "Não autorizado. Defina CHAMADOS_INGEST_TOKEN no servidor e envie Authorization: Bearer <token>.",
      401,
    )
  }

  try {
    const body = await request.json()
    const subject = String(body.subject ?? "").trim()
    const message = String(body.message ?? "").trim()
    if (!subject || !message) return jsonError("Campos subject e message são obrigatórios.", 400)

    let priority: SupportTicketPriority = "normal"
    const pr = String(body.priority ?? "normal").toLowerCase()
    if (PRIORITIES.includes(pr as SupportTicketPriority)) priority = pr as SupportTicketPriority

    const data = await createTicket({
      source_tool: body.source_tool != null ? String(body.source_tool).trim() || null : null,
      client_identifier: body.client_identifier != null ? String(body.client_identifier).trim() || null : null,
      client_email: body.client_email != null ? String(body.client_email).trim().toLowerCase() || null : null,
      subject,
      message,
      priority,
      external_user_id: body.external_user_id != null ? String(body.external_user_id).trim() || null : null,
      status: "aberto",
    })

    return jsonOk(data, 201)
  } catch (e) {
    return handleApiError(e, "Erro ao criar chamado.")
  }
}
