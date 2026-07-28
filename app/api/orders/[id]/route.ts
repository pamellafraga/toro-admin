import { NextRequest } from "next/server"
import { handleApiError, jsonError, jsonOk } from "@/lib/api/response"
import { parseAuthCookie } from "@/lib/api/auth"
import { updateToroOrderStatus } from "@/lib/db/repositories/toro-orders.repository"

export const dynamic = "force-dynamic"

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    if (!parseAuthCookie(request)) {
      return jsonError("Não autorizado.", 401)
    }

    const { id } = await params
    const body = await request.json()
    const orderStatus = typeof body.order_status === "string" ? body.order_status : undefined
    const paymentStatus = typeof body.payment_status === "string" ? body.payment_status : undefined
    const trackingCode = typeof body.tracking_code === "string" ? body.tracking_code : undefined

    if (!orderStatus && !paymentStatus && !trackingCode) {
      return jsonError("Informe order_status, payment_status ou tracking_code.", 400)
    }

    const updated = await updateToroOrderStatus(
      decodeURIComponent(id),
      orderStatus ?? "processing",
      paymentStatus,
      trackingCode,
    )
    if (!updated) return jsonError("Pedido não encontrado.", 404)

    return jsonOk({ order: updated })
  } catch (e) {
    return handleApiError(e, "Erro ao atualizar pedido.")
  }
}
