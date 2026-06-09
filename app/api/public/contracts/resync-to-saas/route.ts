import { handleApiError, jsonError, jsonOk } from "@/lib/api/response"
import { findClientByEmailNormalized } from "@/lib/db/repositories/clients.repository"
import { findLiticaProContractByClientId } from "@/lib/db/repositories/contracts.repository"
import { findContractWithProduct } from "@/lib/db/repositories/contracts.repository"
import { findOrCreateProductFromCatalog } from "@/lib/db/repositories/products.repository"
import { syncLiticaProTenantAfterAdminEdit } from "@/lib/liticapro/sync-licitapregao"
import { verifyPublicSiteApiKey } from "@/lib/public-api/auth"
import { getProductBySlug } from "@/lib/products/catalog"
import { NextRequest } from "next/server"

export const dynamic = "force-dynamic"

async function pushSaasProfileToAdmin(empresaId: string): Promise<{ ok: boolean; error?: string }> {
  const baseUrl = process.env.LICITAPREGAO_API_URL?.trim().replace(/\/$/, "")
  const apiKey = process.env.LICITAPREGAO_API_KEY?.trim()
  if (!baseUrl || !apiKey) {
    return { ok: false, error: "LICITAPREGAO_API_URL ou LICITAPREGAO_API_KEY não configurados." }
  }

  try {
    const res = await fetch(`${baseUrl}/api/push-to-dashboard`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ empresa_id: empresaId }),
    })
    const data = (await res.json().catch(() => ({}))) as { error?: string; skipped?: boolean }
    if (!res.ok && !data.skipped) {
      return { ok: false, error: data.error ?? `Falha ao puxar perfil da ferramenta (${res.status}).` }
    }
    return { ok: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro de rede ao puxar perfil da ferramenta."
    return { ok: false, error: message }
  }
}

function resolveSaasEmpresaId(contract: { liticapro_meta?: Record<string, unknown> | null }): string {
  return String(contract.liticapro_meta?.saas_empresa_id ?? "").trim()
}

async function resyncContract(contractId: string) {
  const contract = await findContractWithProduct(contractId)
  if (!contract || contract.product_slug !== "liticapro") {
    return { ok: false as const, status: 404, error: "Contrato LicitaPregão não encontrado." }
  }

  const empresaId = resolveSaasEmpresaId(contract)
  let pull = { ok: false, error: "Cliente ainda não provisionado na ferramenta." }
  if (empresaId) {
    pull = await pushSaasProfileToAdmin(empresaId)
  }

  const result = await syncLiticaProTenantAfterAdminEdit(contractId)
  if (!result.ok) {
    if (result.skipped) {
      return {
        ok: true as const,
        skipped: true,
        empresa_id: empresaId || undefined,
        admin_updated_from_saas: pull.ok,
        error: result.error,
        ...(pull.error ? { admin_pull_warning: pull.error } : {}),
      }
    }
    return { ok: false as const, status: 502, error: result.error }
  }

  return {
    ok: true as const,
    empresa_id: result.empresa_id,
    admin_updated_from_saas: pull.ok,
    ...(pull.error ? { admin_pull_warning: pull.error } : {}),
  }
}

/** POST — ressincroniza admin ↔ ferramenta (puxa perfil da ferramenta antes de enviar). */
export async function POST(req: NextRequest) {
  try {
    if (!verifyPublicSiteApiKey(req)) {
      return jsonError("Não autorizado.", 401)
    }

    const body = (await req.json()) as {
      contract_id?: string
      client_id?: string
      email?: string
    }

    const contractId = String(body.contract_id ?? "").trim()
    if (contractId) {
      const outcome = await resyncContract(contractId)
      if (!outcome.ok) {
        return jsonError(outcome.error, outcome.status)
      }
      if (outcome.skipped) {
        return jsonOk({
          success: false,
          skipped: true,
          error: outcome.error,
          admin_updated_from_saas: outcome.admin_updated_from_saas,
          ...(outcome.admin_pull_warning ? { admin_pull_warning: outcome.admin_pull_warning } : {}),
        })
      }
      return jsonOk({
        success: true,
        empresa_id: outcome.empresa_id,
        admin_updated_from_saas: outcome.admin_updated_from_saas,
        ...(outcome.admin_pull_warning ? { admin_pull_warning: outcome.admin_pull_warning } : {}),
      })
    }

    let clientId = String(body.client_id ?? "").trim()
    const email = String(body.email ?? "").trim().toLowerCase()
    if (!clientId && email) {
      const client = await findClientByEmailNormalized(email)
      clientId = client?.id ?? ""
    }

    if (!clientId) {
      return jsonError("Informe contract_id, client_id ou email.", 400)
    }

    const catalog = getProductBySlug("liticapro")
    if (!catalog) {
      return jsonError("Produto LicitaPregão não configurado.", 500)
    }
    const product = await findOrCreateProductFromCatalog(catalog)
    const contract = await findLiticaProContractByClientId(clientId, product.id)
    if (!contract?.id) {
      return jsonError("Contrato LicitaPregão não encontrado.", 404)
    }

    const outcome = await resyncContract(contract.id)
    if (!outcome.ok) {
      return jsonError(outcome.error, outcome.status)
    }
    if (outcome.skipped) {
      return jsonOk({
        success: false,
        skipped: true,
        error: outcome.error,
        admin_updated_from_saas: outcome.admin_updated_from_saas,
        ...(outcome.admin_pull_warning ? { admin_pull_warning: outcome.admin_pull_warning } : {}),
      })
    }
    return jsonOk({
      success: true,
      empresa_id: outcome.empresa_id,
      admin_updated_from_saas: outcome.admin_updated_from_saas,
      ...(outcome.admin_pull_warning ? { admin_pull_warning: outcome.admin_pull_warning } : {}),
    })
  } catch (err) {
    return handleApiError(err)
  }
}
