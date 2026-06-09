import { NextRequest } from "next/server"
import { isAdmin, parseAuthCookie } from "@/lib/api/auth"
import { handleApiError, jsonError, jsonOk } from "@/lib/api/response"
import { logActivity } from "@/lib/activity-log"
import {
  contractStatusToStatusLead,
  shouldSyncStatusLeadFromContract,
} from "@/lib/clients/status-lead-contract-sync"
import { duplicateClientMessage, findDuplicateClient } from "@/lib/clients/duplicate-check"
import { updateClientForContract, updateClientLiticaProData } from "@/lib/db/repositories/clients.repository"
import { deleteContract, findContractById, findContractWithProduct, updateContract } from "@/lib/db/repositories/contracts.repository"
import {
  extendTrialEndsAt,
  isTrialEndDateInFuture,
  parseTrialEndsAtInput,
  resolveTrialEndsAt,
} from "@/lib/liticapro/trial"

export const dynamic = "force-dynamic"

/** PATCH /api/contracts/[id] — atualiza contrato + cliente */
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

    const clientName = String(body.client_name ?? "").trim()
    if (!clientName) return jsonError("Nome do cliente é obrigatório.", 400)

    const cpfCnpjRaw = String(body.client_cpf_cnpj ?? "").replace(/\D/g, "") || null
    const paymentStatus = String(body.payment_status ?? "").trim() || undefined
    const pagamentoPerdido =
      paymentStatus === "cancelado" ||
      paymentStatus === "expirado" ||
      paymentStatus === "cancelled" ||
      paymentStatus === "expired"

    const contractStatus = admin ? String(body.status ?? "").trim() || undefined : undefined

    let statusLead = pagamentoPerdido
      ? "perdido"
      : String(body.status_lead ?? "").trim() || null

    if (contractStatus && shouldSyncStatusLeadFromContract(contractStatus)) {
      const lead = contractStatusToStatusLead(contractStatus)
      if (lead) statusLead = lead
    }

    const duplicate = await findDuplicateClient({
      cpfCnpj: cpfCnpjRaw,
      phone: String(body.client_phone ?? "").trim() || null,
      email: String(body.client_email ?? "").trim() || null,
      excludeClientId: existing.client_id,
    })
    if (duplicate) {
      return jsonError(duplicateClientMessage(duplicate), 409)
    }

    await updateClientForContract(existing.client_id, {
      name: clientName,
      email: String(body.client_email ?? "").trim() || null,
      phone: String(body.client_phone ?? "").trim() || null,
      cpf_cnpj: cpfCnpjRaw,
      address: body.address?.trim() || null,
      number: body.number?.trim() || null,
      district: body.district?.trim() || null,
      city: body.city?.trim() || null,
      state: body.state?.trim()?.toUpperCase() || null,
      zip_code: body.zip_code?.trim() || null,
      origem_captacao: String(body.origem_captacao ?? "").trim() || null,
      status_lead: statusLead,
    })

    const monthlyRaw = String(body.monthly_value ?? "").replace(/\./g, "").replace(",", ".")
    const monthlyValue = monthlyRaw ? parseFloat(monthlyRaw) : undefined
    const paymentDay = body.payment_day != null ? Math.min(31, Math.max(1, Number(body.payment_day) || 10)) : undefined

    const mergedLiticaProMeta =
      body.liticapro_meta && typeof body.liticapro_meta === "object"
        ? { ...(existing.liticapro_meta ?? {}), ...(body.liticapro_meta as Record<string, unknown>) }
        : undefined

    let trialEndsAt: string | undefined
    let statusForUpdate = contractStatus
    let paymentStatusForUpdate = paymentStatus

    if (existing.product_slug === "liticapro") {
      const extendRaw = body.trial_extend_days
      const extendDays =
        extendRaw != null && String(extendRaw).trim() !== ""
          ? Math.max(0, Math.floor(Number(extendRaw)))
          : 0

      if (extendDays > 0) {
        trialEndsAt = extendTrialEndsAt(resolveTrialEndsAt(existing), extendDays).toISOString()
      } else if (body.trial_ends_at != null && String(body.trial_ends_at).trim() !== "") {
        const parsed = parseTrialEndsAtInput(String(body.trial_ends_at))
        if (parsed) trialEndsAt = parsed
      }

      if (trialEndsAt) {
        const existingEnd = resolveTrialEndsAt(existing)?.toISOString().slice(0, 10)
        const newEndDate = trialEndsAt.slice(0, 10)
        const trialDateChanged = extendDays > 0 || newEndDate !== existingEnd
        const wasExpired =
          existing.status === "trial_encerrado" || existing.payment_status === "trial_expirado"
        if (trialDateChanged && (wasExpired || extendDays > 0 || isTrialEndDateInFuture(trialEndsAt))) {
          statusForUpdate = statusForUpdate ?? "trial"
          paymentStatusForUpdate = paymentStatusForUpdate ?? "trial"
        }
      }
    } else if (body.trial_ends_at) {
      trialEndsAt = String(body.trial_ends_at)
    }

    await updateContract(id, {
      status: statusForUpdate,
      payment_status: paymentStatusForUpdate,
      monthly_value: monthlyValue,
      start_date: String(body.start_date ?? "").trim() || undefined,
      end_date: body.end_date ? String(body.end_date).trim() : null,
      payment_day: paymentDay,
      notes: body.notes != null ? String(body.notes).trim() || null : undefined,
      plan: body.plan != null ? String(body.plan).trim() || null : undefined,
      trial_ends_at: trialEndsAt,
      liticapro_meta: mergedLiticaProMeta,
    })

    if (body.liticapro_data && typeof body.liticapro_data === "object") {
      await updateClientLiticaProData(existing.client_id, body.liticapro_data as Record<string, unknown>)
    }

    await logActivity(req, {
      action: `Atualizou o contrato de ${clientName}`,
      entity_type: "contract",
      entity_id: id,
    })

    return jsonOk({ success: true })
  } catch (err) {
    console.error("PATCH /api/contracts/[id]:", err)
    return handleApiError(err, "Erro ao atualizar contrato.")
  }
}

/** DELETE /api/contracts/[id] — remove assinatura (cliente permanece) */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = parseAuthCookie(req)
    if (!auth) return jsonError("Não autorizado.", 401)

    const { id } = await params
    const existing = await findContractById(id)
    if (!existing) return jsonError("Contrato não encontrado.", 404)

    const deleted = await deleteContract(id)
    if (!deleted) return jsonError("Não foi possível excluir o contrato.", 500)

    await logActivity(req, {
      action: `Excluiu contrato ${id}`,
      entity_type: "contract",
      entity_id: id,
    })

    return jsonOk({ success: true })
  } catch (err) {
    console.error("DELETE /api/contracts/[id]:", err)
    return handleApiError(err, "Erro ao excluir contrato.")
  }
}
