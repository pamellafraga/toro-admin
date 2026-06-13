import { NextRequest } from "next/server"
import { isAdmin, isAuthenticated, parseAuthCookie } from "@/lib/api/auth"
import { handleApiError, jsonForbidden, jsonOk, jsonUnauthorized } from "@/lib/api/response"
import { extendAllExpiredLiticaProTrialsCourtesy } from "@/lib/liticapro/trial-courtesy-extension"

export const dynamic = "force-dynamic"

/** POST /api/liticapro/extend-courtesy — +7 dias de cortesia para testes expirados */
export async function POST(req: NextRequest) {
  try {
    if (!isAuthenticated(req)) return jsonUnauthorized()
    if (!isAdmin(req)) return jsonForbidden("Somente administradores.")

    const body = await req.json().catch(() => ({}))
    const extraDays = Math.max(1, Math.floor(Number(body.extra_days ?? 7)))
    const sendEmail = body.send_email !== false
    const actor = parseAuthCookie(req)

    const result = await extendAllExpiredLiticaProTrialsCourtesy({
      extraDays,
      sendEmail,
      activityActor: actor ? { displayName: actor.displayName ?? actor.email } : null,
    })

    return jsonOk(result)
  } catch (err) {
    console.error("extend-courtesy:", err)
    return handleApiError(err, "Erro ao aplicar cortesia nos testes expirados.")
  }
}
