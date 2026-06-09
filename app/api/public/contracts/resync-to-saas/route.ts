import { handleApiError, jsonError, jsonOk } from "@/lib/api/response"
import { findClientByEmailNormalized } from "@/lib/db/repositories/clients.repository"
import { findLiticaProContractByClientId } from "@/lib/db/repositories/contracts.repository"
import { findOrCreateProductFromCatalog } from "@/lib/db/repositories/products.repository"
import { syncLiticaProTenantAfterAdminEdit } from "@/lib/liticapro/sync-licitapregao"
import { verifyPublicSiteApiKey } from "@/lib/public-api/auth"
import { getProductBySlug } from "@/lib/products/catalog"
import { NextRequest } from "next/server"

export const dynamic = "force-dynamic"

/** POST — reenvia dados do painel admin para a ferramenta (perfil incompleto após cadastro). */
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
      const result = await syncLiticaProTenantAfterAdminEdit(contractId)
      if (!result.ok) {
        if (result.skipped) {
          return jsonOk({ success: false, skipped: true, error: result.error })
        }
        return jsonError(result.error, 502)
      }
      return jsonOk({ success: true, empresa_id: result.empresa_id })
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

    const result = await syncLiticaProTenantAfterAdminEdit(contract.id)
    if (!result.ok) {
      if (result.skipped) {
        return jsonOk({ success: false, skipped: true, error: result.error })
      }
      return jsonError(result.error, 502)
    }

    return jsonOk({ success: true, empresa_id: result.empresa_id })
  } catch (err) {
    return handleApiError(err)
  }
}
