import { NextRequest } from "next/server"
import { jsonOk, handleApiError } from "@/lib/api/response"
import { parseAuthCookie } from "@/lib/api/auth"
import { listToroOrders } from "@/lib/db/repositories/toro-orders.repository"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  try {
    if (!parseAuthCookie(request)) {
      return jsonOk({ orders: [] })
    }
    const orders = await listToroOrders(200)
    return jsonOk({ orders })
  } catch (e) {
    return handleApiError(e, "Erro ao listar pedidos.")
  }
}
