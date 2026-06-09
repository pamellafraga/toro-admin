import { NextRequest } from "next/server"
import { handleApiError, jsonError, jsonOk } from "@/lib/api/response"
import { getLiticaProAccessForResend } from "@/lib/liticapro/resend-welcome-from-site"
import { verifyPublicSiteApiKey } from "@/lib/public-api/auth"

export const dynamic = "force-dynamic"

/** POST /api/public/contracts/resend-welcome-email — dados de acesso para reenvio pelo site. */
export async function POST(req: NextRequest) {
  try {
    if (!verifyPublicSiteApiKey(req)) {
      return jsonError(
        "Não autorizado. Configure SITE_API_KEY no painel e envie Authorization: Bearer <token>.",
        401,
      )
    }

    const body = (await req.json().catch(() => ({}))) as { email?: string }
    const email = String(body.email ?? "").trim()

    const result = await getLiticaProAccessForResend(email)
    if (!result.ok) {
      return jsonError(result.error, result.status)
    }

    return jsonOk({
      success: true,
      client_name: result.client_name,
      customer_type: result.customer_type,
      states_of_interest: result.states_of_interest,
      credentials: result.credentials,
      login_url: result.login_url,
      provisioned: result.provisioned,
    })
  } catch (err) {
    console.error("resend-welcome-email:", err)
    return handleApiError(err, "Erro ao buscar dados para reenvio de e-mail.")
  }
}
