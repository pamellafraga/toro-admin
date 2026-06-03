import { NextRequest } from "next/server"
import { isAuthenticated } from "@/lib/api/auth"
import { handleApiError, jsonError, jsonOk, jsonUnauthorized } from "@/lib/api/response"
import { STATUS_LEAD_OPTIONS } from "@/lib/clients/status-lead"
import {
  shouldSyncContractFromStatusLead,
  statusLeadToContractStatus,
} from "@/lib/clients/status-lead-contract-sync"
import { updateClientStatusLead } from "@/lib/db/repositories/clients.repository"
import { updateLatestContractStatusByClientId } from "@/lib/db/repositories/contracts.repository"

export const dynamic = "force-dynamic"

const VALID_IDS = new Set<string>(STATUS_LEAD_OPTIONS.map((o) => o.id))

/** PATCH /api/clients/[id]/status — atualiza só status_lead */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    if (!isAuthenticated(req)) return jsonUnauthorized()

    const { id } = await params
    const body = await req.json()
    const raw = body.status_lead
    const statusLead =
      raw === null || raw === undefined || String(raw).trim() === ""
        ? null
        : String(raw).trim()

    if (statusLead !== null && !VALID_IDS.has(statusLead)) {
      return jsonError("Status de contato inválido.", 400)
    }

    await updateClientStatusLead(id, statusLead)

    if (shouldSyncContractFromStatusLead(statusLead)) {
      const contractStatus = statusLeadToContractStatus(statusLead)
      if (contractStatus) {
        await updateLatestContractStatusByClientId(id, contractStatus)
      }
    }

    return jsonOk({ ok: true })
  } catch (err) {
    console.error("Erro em PATCH /api/clients/[id]/status:", err)
    return handleApiError(err, "Erro ao atualizar status.")
  }
}
