import { NextRequest } from "next/server"
import { isAdmin, parseAuthCookie } from "@/lib/api/auth"
import {
  createManualToroOrder,
  listToroOrders,
  type ToroOrderItem,
} from "@/lib/db/repositories/toro-orders.repository"
import { getToroProductBySlug } from "@/lib/products/catalog"

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

/** POST /api/orders — registrar compra manualmente */
export async function POST(request: NextRequest) {
  try {
    if (!isAdmin(request)) return jsonForbidden("Apenas administradores podem registrar pedidos.")

    const body = await request.json()
    const rawItems = Array.isArray(body.items) ? body.items : []
    const items: ToroOrderItem[] = rawItems.map((item: Record<string, unknown>) => {
      const productId = String(item.productId ?? "")
      const catalog = getToroProductBySlug(productId)
      return {
        productId,
        productName: String(item.productName ?? catalog?.name ?? productId),
        size: String(item.size ?? "UN"),
        quantity: Math.max(1, Number(item.quantity) || 1),
        unitPrice: Number(item.unitPrice) || 0,
      }
    })

    const subtotal = Number(body.subtotal) || items.reduce((s, i) => s + i.unitPrice * i.quantity, 0)
    const shipping = Number(body.shipping) || 0
    const discount = Number(body.discount) || 0
    const total = Number(body.total) || Math.max(0, subtotal + shipping - discount)

    const order = await createManualToroOrder({
      customerName: String(body.customerName ?? ""),
      customerEmail: body.customerEmail ? String(body.customerEmail) : null,
      customerPhone: body.customerPhone ? String(body.customerPhone) : null,
      customerCpfCnpj: body.customerCpfCnpj ? String(body.customerCpfCnpj) : null,
      items,
      subtotal,
      shipping,
      discount,
      total,
      paymentMethod: body.paymentMethod ? String(body.paymentMethod) : "manual",
      paymentStatus: body.paymentStatus ? String(body.paymentStatus) : "approved",
      orderStatus: body.orderStatus ? String(body.orderStatus) : "paid",
      notes: body.notes ? String(body.notes) : null,
      decrementStock: body.decrementStock !== false,
    })

    return jsonOk({ order })
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro ao registrar pedido."
    if (/obrigatório|Adicione|precisa/i.test(msg)) {
      return jsonError(msg, 400)
    }
    return handleApiError(e, "Erro ao registrar pedido.")
  }
}
