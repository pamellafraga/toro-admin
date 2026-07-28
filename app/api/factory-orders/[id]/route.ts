import { NextRequest } from "next/server"
import { isAdmin } from "@/lib/api/auth"
import { handleApiError, jsonError, jsonForbidden, jsonOk } from "@/lib/api/response"
import {
  deleteFactoryOrder,
  updateFactoryOrder,
  type FactoryOrderStatus,
} from "@/lib/db/repositories/toro-factory-orders.repository"

export const dynamic = "force-dynamic"

type RouteParams = { params: Promise<{ id: string }> }

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    if (!isAdmin(request)) return jsonForbidden("Sem permissão.")

    const { id } = await params
    const body = await request.json()

    const order = await updateFactoryOrder(id, {
      supplierName: body.supplierName ? String(body.supplierName) : undefined,
      stockBySize:
        body.stockBySize && typeof body.stockBySize === "object"
          ? (body.stockBySize as Record<string, number>)
          : undefined,
      unitCost: body.unitCost !== undefined ? (body.unitCost != null ? Number(body.unitCost) : null) : undefined,
      orderedAt: body.orderedAt ? String(body.orderedAt) : undefined,
      expectedAt: body.expectedAt !== undefined ? (body.expectedAt ? String(body.expectedAt) : null) : undefined,
      receivedAt: body.receivedAt !== undefined ? (body.receivedAt ? String(body.receivedAt) : null) : undefined,
      status: body.status ? (String(body.status) as FactoryOrderStatus) : undefined,
      notes: body.notes !== undefined ? (body.notes ? String(body.notes) : null) : undefined,
      applyStock: body.applyStock === true,
    })

    return jsonOk({ order })
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro ao atualizar encomenda."
    if (/não encontrada/i.test(msg)) return jsonError(msg, 404)
    return handleApiError(e, "Erro ao atualizar encomenda.")
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    if (!isAdmin(request)) return jsonForbidden("Sem permissão.")
    const { id } = await params
    await deleteFactoryOrder(id)
    return jsonOk({ success: true })
  } catch (e) {
    return handleApiError(e, "Erro ao excluir encomenda.")
  }
}
