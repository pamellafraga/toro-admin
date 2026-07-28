import { NextRequest } from "next/server"
import { handleApiError, jsonError } from "@/lib/api/response"
import { verifyPublicSiteApiKey } from "@/lib/public-api/auth"
import { corsPreflightResponse, jsonWithCors } from "@/lib/public-api/cors"
import { registerOrderFromSite } from "@/lib/toro/register-order-from-site"

export const dynamic = "force-dynamic"

export async function OPTIONS(request: NextRequest) {
  return corsPreflightResponse(request)
}

/** POST /api/public/orders/register-from-site — pedido do checkout Toro */
export async function POST(request: NextRequest) {
  try {
    if (!verifyPublicSiteApiKey(request)) {
      return jsonWithCors(
        request,
        { error: "Não autorizado. Configure SITE_API_KEY e envie Authorization: Bearer <token>." },
        401,
      )
    }

    const body = await request.json()
    const result = await registerOrderFromSite(body)

    if ("error" in result) {
      return jsonWithCors(request, { error: result.error }, result.status)
    }

    return jsonWithCors(request, {
      success: true,
      order_number: result.order.order_number,
      duplicate: result.duplicate,
      message: result.duplicate ? "Pedido já registrado." : "Pedido recebido no painel TORO.",
    })
  } catch (err) {
    const res = handleApiError(err, "Erro ao registrar pedido do site.")
    const data = await res.json()
    return jsonWithCors(request, data, res.status)
  }
}
