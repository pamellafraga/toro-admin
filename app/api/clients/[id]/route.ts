import { NextRequest } from "next/server"
import { isAuthenticated } from "@/lib/api/auth"
import { handleApiError, jsonError, jsonOk, jsonUnauthorized } from "@/lib/api/response"
import { normalizeCpfCnpjForSave } from "@/lib/clients/cpf-cnpj-display"
import { duplicateClientMessage, findDuplicateClient } from "@/lib/clients/duplicate-check"
import {
  shouldSyncContractFromStatusLead,
  statusLeadToContractStatus,
} from "@/lib/clients/status-lead-contract-sync"
import { deleteClient, updateClientFromDashboard } from "@/lib/db/repositories/clients.repository"
import { updateLatestContractStatusByClientId } from "@/lib/db/repositories/contracts.repository"

export const dynamic = "force-dynamic"

/** PATCH /api/clients/[id] */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    if (!isAuthenticated(req)) return jsonUnauthorized()

    const { id } = await params
    const body = await req.json()
    const name = String(body.name ?? "").trim()
    if (!name) return jsonError("Nome obrigatório.", 400)

    const customerType = body.customer_type as string | undefined
    if (customerType && customerType !== "empresa" && customerType !== "profissional_liberal") {
      return jsonError("Tipo de contato inválido.", 400)
    }

    const cpfCnpj =
      "cpf_cnpj" in body && body.cpf_cnpj != null
        ? normalizeCpfCnpjForSave(String(body.cpf_cnpj))
        : undefined

    const duplicate = await findDuplicateClient({
      cpfCnpj: cpfCnpj !== undefined ? cpfCnpj : undefined,
      phone: body.phone ?? null,
      email: body.email ?? null,
      excludeClientId: id,
    })
    if (duplicate) {
      return jsonError(duplicateClientMessage(duplicate), 409)
    }

    const statusLead =
      body.status_lead !== undefined
        ? (String(body.status_lead ?? "").trim() || null)
        : undefined

    await updateClientFromDashboard(id, {
      name,
      email: body.email ?? null,
      phone: body.phone ?? null,
      ...(cpfCnpj !== undefined ? { cpf_cnpj: cpfCnpj } : {}),
      company: body.company ?? body.company_name ?? null,
      address: body.address ?? null,
      number: body.number ?? null,
      district: body.district ?? null,
      city: body.city ?? null,
      state: body.state ?? null,
      zip_code: body.zip_code ?? null,
      origem_captacao: body.origem_captacao ?? null,
      status_lead: statusLead ?? null,
      customer_type: customerType as "empresa" | "profissional_liberal" | undefined,
    })

    if (statusLead !== undefined && shouldSyncContractFromStatusLead(statusLead)) {
      const contractStatus = statusLeadToContractStatus(statusLead)
      if (contractStatus) {
        await updateLatestContractStatusByClientId(id, contractStatus)
      }
    }

    return jsonOk({ ok: true })
  } catch (err) {
    console.error("Erro em PATCH /api/clients/[id]:", err)
    return handleApiError(err, "Erro ao atualizar cliente.")
  }
}

/** DELETE /api/clients/[id] */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    if (!isAuthenticated(req)) return jsonUnauthorized()

    const { id } = await params
    await deleteClient(id)
    return jsonOk({ ok: true })
  } catch (err) {
    console.error("Erro em DELETE /api/clients/[id]:", err)
    return handleApiError(err, "Erro ao excluir cliente.")
  }
}
