import { NextRequest } from "next/server"
import { handleApiError, jsonError, jsonOk } from "@/lib/api/response"
import { resendLiticaProWelcomeEmailByEmail } from "@/lib/liticapro/resend-welcome-email"
import { verifyPublicSiteApiKey } from "@/lib/public-api/auth"

export const dynamic = "force-dynamic"

/** POST /api/public/contracts/resend-welcome-email — reenvia e-mail de acesso (site / integrações). */
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

    const result = await resendLiticaProWelcomeEmailByEmail(email)
    if (!result.ok) {
      return jsonError(result.error, result.status)
    }

    return jsonOk({
      success: true,
      email_sent: true,
      sent_at: result.sent_at,
      channel: result.channel,
      message: "E-mail de acesso reenviado com sucesso.",
    })
  } catch (err) {
    console.error("resend-welcome-email:", err)
    return handleApiError(err, "Erro ao reenviar e-mail de acesso.")
  }
}
