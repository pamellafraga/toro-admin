import { NextRequest } from "next/server"
import { handleApiError, jsonError, jsonForbidden, jsonOk } from "@/lib/api/response"
import { canAccessChamadosPanel } from "@/lib/chamados-api"
import { updateTicketStatus } from "@/lib/db/repositories/chamados.repository"
import type { SupportTicketStatus } from "@/lib/types"

const STATUSES: SupportTicketStatus[] = ["aberto", "em_andamento", "resolvido", "fechado"]

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!canAccessChamadosPanel(request)) return jsonForbidden("Sem permissão.")

  const { id } = await params
  if (!id) return jsonError("ID inválido.", 400)

  try {
    const body = await request.json()
    const status = body.status != null ? String(body.status).trim() : ""
    if (!STATUSES.includes(status as SupportTicketStatus)) return jsonError("Status inválido.", 400)

    const data = await updateTicketStatus(id, status as SupportTicketStatus)
    if (!data) return jsonError("Chamado não encontrado.", 404)
    return jsonOk(data)
  } catch (e) {
    return handleApiError(e, "Erro ao atualizar.")
  }
}
