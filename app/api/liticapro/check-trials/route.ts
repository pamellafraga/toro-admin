import { NextRequest } from "next/server"
import { isAuthenticated } from "@/lib/api/auth"
import { jsonOk, jsonUnauthorized } from "@/lib/api/response"
import { processExpiredLiticaProTrials } from "@/lib/liticapro/trial-notifications"

export const dynamic = "force-dynamic"

/** GET /api/liticapro/check-trials — gera notificações de testes expirados */
export async function GET(req: NextRequest) {
  if (!isAuthenticated(req)) return jsonUnauthorized()

  const count = await processExpiredLiticaProTrials()
  return jsonOk({ processed: count })
}
