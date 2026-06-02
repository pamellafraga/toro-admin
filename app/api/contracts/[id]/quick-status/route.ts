import { NextRequest } from "next/server"
import { isAdmin, parseAuthCookie } from "@/lib/api/auth"
import { handleApiError, jsonError, jsonOk } from "@/lib/api/response"
import { logActivity } from "@/lib/activity-log"
import { updateClientStatusLead } from "@/lib/db/repositories/clients.repository"
import { findContractWithProduct, updateContract } from "@/lib/db/repositories/contracts.repository"
import { computeTrialEndsAt } from "@/lib/liticapro/trial"

export const dynamic = "force-dynamic"

const VALID_PRODUCT_STATUSES = new Set(["aguardando_produto", "ativa", "trial", "inativa"])

/** PATCH /api/contracts/[id]/quick-status — altera status de contato e/ou produto na listagem */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = parseAuthCookie(req)
    if (!auth) return jsonError("Não autorizado.", 401)

    const { id } = await params
    const existing = await findContractWithProduct(id)
    if (!existing) return jsonError("Contrato não encontrado.", 404)

    const body = await req.json()
    const admin = isAdmin(req)

    if (body.status_lead !== undefined) {
      const statusLead = String(body.status_lead ?? "").trim() || null
      await updateClientStatusLead(existing.client_id, statusLead)
    }

    if (body.product_status !== undefined) {
      if (!admin) return jsonError("Somente administradores podem alterar o status do produto.", 403)

      const productStatus = String(body.product_status ?? "").trim()
      if (!VALID_PRODUCT_STATUSES.has(productStatus)) {
        return jsonError("Status de produto inválido.", 400)
      }

      const contractUpdate: Parameters<typeof updateContract>[1] = { status: productStatus }

      if (productStatus === "trial" && existing.product_slug === "liticapro") {
        contractUpdate.payment_status = "trial"
        if (!existing.trial_ends_at) {
          contractUpdate.trial_ends_at = computeTrialEndsAt(existing.created_at ?? new Date()).toISOString()
        }
      } else if (productStatus === "ativa") {
        if (existing.payment_status === "trial" || existing.payment_status === "trial_expirado") {
          contractUpdate.payment_status = "pendente"
        }
      }

      await updateContract(id, contractUpdate)
    }

    if (body.status_lead === undefined && body.product_status === undefined) {
      return jsonError("Nenhum status informado.", 400)
    }

    await logActivity(req, {
      action: "Atualizou status na listagem de contratos",
      entity_type: "contract",
      entity_id: id,
    })

    return jsonOk({ success: true })
  } catch (err) {
    console.error("PATCH /api/contracts/[id]/quick-status:", err)
    return handleApiError(err, "Erro ao atualizar status.")
  }
}
