import { NextRequest } from "next/server"
import { handleApiError, jsonError, jsonOk } from "@/lib/api/response"
import { syncLiticaProFromSaaS } from "@/lib/liticapro/sync-from-saas"
import { verifyPublicSiteApiKey } from "@/lib/public-api/auth"

export const dynamic = "force-dynamic"

/** PATCH /api/public/contracts/sync-from-saas — sincroniza Configurações da ferramenta para o painel. */
export async function PATCH(req: NextRequest) {
  try {
    if (!verifyPublicSiteApiKey(req)) {
      return jsonError(
        "Não autorizado. Configure SITE_API_KEY no painel e envie Authorization: Bearer <token>.",
        401,
      )
    }

    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>

    if (body.customer_type !== "empresa" && body.customer_type !== "profissional_liberal") {
      return jsonError("customer_type inválido.", 400)
    }

    const result = await syncLiticaProFromSaaS({
      empresa_id: String(body.empresa_id ?? ""),
      usuario_id: body.usuario_id ? String(body.usuario_id) : undefined,
      customer_type: body.customer_type,
      email: String(body.email ?? ""),
      phone: body.phone ? String(body.phone) : undefined,
      client_name: body.client_name ? String(body.client_name) : undefined,
      usuario: String(body.usuario ?? ""),
      credentials_empresa: body.credentials_empresa ? String(body.credentials_empresa) : undefined,
      nova_senha: body.nova_senha ? String(body.nova_senha) : undefined,
      trial_ends_at: body.trial_ends_at ? String(body.trial_ends_at) : undefined,
      states_of_interest: Array.isArray(body.states_of_interest)
        ? body.states_of_interest.map(String)
        : undefined,
      business_segment: body.business_segment ? String(body.business_segment) : undefined,
      address:
        body.address && typeof body.address === "object"
          ? (body.address as {
              cep?: string
              endereco_sede?: string
              cidade?: string
              uf?: string
            })
          : undefined,
      cnpj: body.cnpj ? String(body.cnpj) : undefined,
      cnaes: Array.isArray(body.cnaes) ? body.cnaes.map(String) : undefined,
      empresas_vinculadas: Array.isArray(body.empresas_vinculadas)
        ? (body.empresas_vinculadas as Array<{
            cnpj?: string
            razao_social?: string
            ramo_id?: string
            ramo_atuacao?: string
            ufs?: string[]
            states?: string[]
            cnaes?: Array<{ codigo?: string; descricao?: string; principal?: boolean }>
          }>)
        : undefined,
      admin_client_id: body.admin_client_id ? String(body.admin_client_id) : undefined,
      admin_contract_id: body.admin_contract_id ? String(body.admin_contract_id) : undefined,
    })

    if (!result.ok) {
      return jsonError(result.error, result.status)
    }

    return jsonOk({
      success: true,
      client_id: result.client_id,
      contract_id: result.contract_id,
    })
  } catch (err) {
    console.error("sync-from-saas:", err)
    return handleApiError(err, "Erro ao sincronizar dados da ferramenta.")
  }
}
