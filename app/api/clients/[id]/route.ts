import { NextRequest } from "next/server"
import { isAuthenticated, parseAuthCookie } from "@/lib/api/auth"
import { handleApiError, jsonError, jsonOk, jsonUnauthorized } from "@/lib/api/response"
import { normalizeCpfCnpjForSave } from "@/lib/clients/cpf-cnpj-display"
import { duplicateClientMessage, findDuplicateClient } from "@/lib/clients/duplicate-check"
import { applyStatusLeadToContracts } from "@/lib/clients/apply-status-lead-to-contract"
import {
  canComercialMutateClient,
  comercialMutateDeniedMessage,
  resolveComercialOrigemOnUpdate,
} from "@/lib/clients/comercial-client-guard"
import { shouldSyncContractFromStatusLead } from "@/lib/clients/status-lead-contract-sync"
import { deleteClient, findClientById, updateClientFromDashboard } from "@/lib/db/repositories/clients.repository"

export const dynamic = "force-dynamic"

/** PATCH /api/clients/[id] */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    if (!isAuthenticated(req)) return jsonUnauthorized()

    const auth = parseAuthCookie(req)
    const { id } = await params
    const existingClient = await findClientById(id)
    if (!existingClient) return jsonError("Contato não encontrado.", 404)

    if (auth?.role === "comercial" && auth.displayName) {
      if (!canComercialMutateClient(auth.displayName, existingClient.origem_captacao)) {
        return jsonError(comercialMutateDeniedMessage(), 403)
      }
    }

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

    let origemCaptacao: string | null | undefined =
      body.origem_captacao !== undefined
        ? (String(body.origem_captacao ?? "").trim() || null)
        : undefined

    if (auth?.role === "comercial" && auth.displayName) {
      const resolved = resolveComercialOrigemOnUpdate(
        auth.displayName,
        existingClient.origem_captacao,
        origemCaptacao,
      )
      if (!resolved.ok) return jsonError(resolved.error, 403)
      origemCaptacao = resolved.value
    }

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
      origem_captacao:
        origemCaptacao !== undefined
          ? origemCaptacao
          : (String(body.origem_captacao ?? "").trim() || null),
      status_lead: statusLead ?? null,
      customer_type: customerType as "empresa" | "profissional_liberal" | undefined,
    })

    if (statusLead !== undefined && shouldSyncContractFromStatusLead(statusLead)) {
      await applyStatusLeadToContracts(id, statusLead)
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

    const auth = parseAuthCookie(req)
    const { id } = await params
    const existingClient = await findClientById(id)
    if (!existingClient) return jsonError("Contato não encontrado.", 404)

    if (auth?.role === "comercial" && auth.displayName) {
      if (!canComercialMutateClient(auth.displayName, existingClient.origem_captacao)) {
        return jsonError(comercialMutateDeniedMessage(), 403)
      }
    }

    await deleteClient(id)
    return jsonOk({ ok: true })
  } catch (err) {
    console.error("Erro em DELETE /api/clients/[id]:", err)
    return handleApiError(err, "Erro ao excluir cliente.")
  }
}
