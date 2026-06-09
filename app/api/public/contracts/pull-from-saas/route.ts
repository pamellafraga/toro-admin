import { handleApiError, jsonError, jsonOk } from "@/lib/api/response"
import { findClientByEmailNormalized } from "@/lib/db/repositories/clients.repository"
import { findLiticaProContractByClientId, findContractWithProduct } from "@/lib/db/repositories/contracts.repository"
import { findOrCreateProductFromCatalog } from "@/lib/db/repositories/products.repository"
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

/** POST — puxa perfil da ferramenta para o painel admin (sem sobrescrever a ferramenta). */
export async function POST(req: NextRequest) {
  try {
    if (!verifyPublicSiteApiKey(req)) {
      return jsonError("Não autorizado.", 401)
    }

    const body = (await req.json()) as {
      contract_id?: string
      client_id?: string
      email?: string
      empresa_id?: string
    }

    let empresaId = String(body.empresa_id ?? "").trim()

    if (!empresaId) {
      let contractId = String(body.contract_id ?? "").trim()
      let clientId = String(body.client_id ?? "").trim()
      const email = String(body.email ?? "").trim().toLowerCase()

      if (!clientId && email) {
        const client = await findClientByEmailNormalized(email)
        clientId = client?.id ?? ""
      }

      if (!contractId && clientId) {
        const catalog = getProductBySlug("liticapro")
        if (!catalog) {
          return jsonError("Produto LicitaPregão não configurado.", 500)
        }
        const product = await findOrCreateProductFromCatalog(catalog)
        const contract = await findLiticaProContractByClientId(clientId, product.id)
        contractId = contract?.id ?? ""
      }

      if (contractId) {
        const contract = await findContractWithProduct(contractId)
        empresaId = String(contract?.liticapro_meta?.saas_empresa_id ?? "").trim()
      }
    }

    if (!empresaId) {
      return jsonError("Informe empresa_id, contract_id, client_id ou email.", 400)
    }

    const pull = await pushSaasProfileToAdmin(empresaId)
    if (!pull.ok) {
      return jsonError(pull.error ?? "Falha ao puxar perfil da ferramenta.", 502)
    }

    return jsonOk({ success: true, empresa_id: empresaId })
  } catch (err) {
    return handleApiError(err)
  }
}
