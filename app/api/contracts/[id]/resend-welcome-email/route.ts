import { NextRequest } from "next/server"
import { parseAuthCookie } from "@/lib/api/auth"
import { handleApiError, jsonError, jsonOk } from "@/lib/api/response"
import { resendLiticaProWelcomeEmailByContractId } from "@/lib/liticapro/resend-welcome-email"

export const dynamic = "force-dynamic"

/** POST /api/contracts/[id]/resend-welcome-email — reenvia e-mail de acesso ao cliente. */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = parseAuthCookie(req)
    if (!auth) return jsonError("Não autorizado.", 401)

    const { id } = await params
    const result = await resendLiticaProWelcomeEmailByContractId(id)
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
    console.error("resend-welcome-email contract:", err)
    return handleApiError(err, "Erro ao reenviar e-mail de acesso.")
  }
}
