import { NextRequest } from "next/server"
import { isAuthenticated } from "@/lib/api/auth"
import { handleApiError, jsonError, jsonOk, jsonUnauthorized } from "@/lib/api/response"
import { logActivity } from "@/lib/activity-log"
import { cancelNfeDocument, deleteNfeDocument, findNfeDocument } from "@/lib/db/repositories/nfe.repository"

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isAuthenticated(request)) return jsonUnauthorized()

  const { id } = await params
  if (!id) return jsonError("ID da NF-e é obrigatório.", 400)

  let body: { action?: string }
  try {
    body = await request.json()
  } catch {
    return jsonError("Corpo inválido.", 400)
  }

  if (body.action !== "cancelar") {
    return jsonError('Ação inválida. Use { "action": "cancelar" }.', 400)
  }

  try {
    const doc = await findNfeDocument(id)
    if (!doc) return jsonError("NF-e não encontrada.", 404)

    const status = (doc.status ?? "").toString().toLowerCase()
    if (status !== "emitida") {
      return jsonError(
        "Apenas NF-e emitida pode ser cancelada. Para remover uma pendente, use Excluir.",
        400,
      )
    }

    await cancelNfeDocument(id)

    await logActivity(request, {
      action: `Cancelou NF-e ${doc.number ?? doc.id}`,
      entity_type: "nfe",
      entity_id: id,
      details: { number: doc.number, series: doc.series, client_name: doc.client_name },
    })

    return jsonOk({ success: true, message: "NF-e cancelada." })
  } catch (err) {
    console.error("Erro ao cancelar NF-e:", err)
    return handleApiError(err, "Erro ao cancelar NF-e")
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isAuthenticated(request)) return jsonUnauthorized()

  const { id } = await params
  if (!id) return jsonError("ID da NF-e é obrigatório.", 400)

  try {
    const doc = await findNfeDocument(id)
    if (!doc) return jsonError("NF-e não encontrada.", 404)

    await deleteNfeDocument(id)

    await logActivity(request, {
      action: `Excluiu NF-e ${doc.number ?? doc.id}`,
      entity_type: "nfe",
      entity_id: id,
      details: { number: doc.number, series: doc.series, status: doc.status, client_name: doc.client_name },
    })

    return jsonOk({ success: true, message: "NF-e excluída." })
  } catch (err) {
    console.error("Erro ao excluir NF-e:", err)
    return handleApiError(err, "Erro ao excluir NF-e")
  }
}
