import { NextRequest } from "next/server"
import { handleApiError, jsonError, jsonOk } from "@/lib/api/response"
import { registerLiticaProTrial } from "@/lib/liticapro/register-trial"
import { mapSiteSignupToLiticaProTrial } from "@/lib/liticapro/site-signup-mapper"
import { verifyPublicSiteApiKey } from "@/lib/public-api/auth"

export const dynamic = "force-dynamic"

/** POST /api/public/contracts/register-from-site — cadastro público vindo do site (trial 7 dias). */
export async function POST(req: NextRequest) {
  try {
    if (!verifyPublicSiteApiKey(req)) {
      return jsonError(
        "Não autorizado. Configure SITE_API_KEY no painel e envie Authorization: Bearer <token>.",
        401,
      )
    }

    const body = await req.json()
    const mapped = mapSiteSignupToLiticaProTrial(body)
    if ("error" in mapped) {
      return jsonError(mapped.error, 400)
    }

    const result = await registerLiticaProTrial(mapped)
    if (!result.success) {
      return jsonError(result.error, result.status)
    }

    return jsonOk({
      success: true,
      contract_id: result.contract_id,
      client_id: result.client_id,
      trial_ends_at: result.trial_ends_at,
      login_url: result.login_url,
      message: result.message,
      provisioned: result.provision?.ok === true,
      email_sent: result.welcome_email_sent,
      client_name: result.client_name,
      customer_type: mapped.customer_type,
      states_of_interest: mapped.states_of_interest,
      credentials: result.credentials,
    })
  } catch (err) {
    console.error("register-from-site:", err)
    return handleApiError(err, "Erro ao registrar cadastro do site.")
  }
}
