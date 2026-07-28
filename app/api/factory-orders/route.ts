import { NextRequest } from "next/server"
import { isAdmin, parseAuthCookie } from "@/lib/api/auth"
import { handleApiError, jsonError, jsonForbidden, jsonOk } from "@/lib/api/response"
import {
  createFactoryOrder,
  listFactoryOrders,
  type FactoryOrderStatus,
} from "@/lib/db/repositories/toro-factory-orders.repository"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  try {
    if (!parseAuthCookie(request)) return jsonOk({ orders: [] })
    const orders = await listFactoryOrders()
    return jsonOk({ orders })
  } catch (e) {
    return handleApiError(e, "Erro ao listar encomendas de estoque.")
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!isAdmin(request)) return jsonForbidden("Apenas administradores podem registrar encomendas.")

    const body = await request.json()
    const stockBySize =
      body.stockBySize && typeof body.stockBySize === "object"
        ? (body.stockBySize as Record<string, number>)
        : {}

    const order = await createFactoryOrder({
      productSlug: String(body.productSlug ?? ""),
      productName: String(body.productName ?? ""),
      supplierName: String(body.supplierName ?? ""),
      stockBySize,
      unitCost: body.unitCost != null ? Number(body.unitCost) : null,
      orderedAt: String(body.orderedAt ?? new Date().toISOString().slice(0, 10)),
      expectedAt: body.expectedAt ? String(body.expectedAt) : null,
      status: (body.status as FactoryOrderStatus) ?? "encomendado",
      notes: body.notes ? String(body.notes) : null,
    })

    return jsonOk({ order })
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro ao registrar encomenda."
    if (/Informe|Selecione|quantidade/i.test(msg)) return jsonError(msg, 400)
    return handleApiError(e, "Erro ao registrar encomenda.")
  }
}
