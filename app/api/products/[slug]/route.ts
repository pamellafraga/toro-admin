import { NextRequest } from "next/server"
import { isAdmin } from "@/lib/api/auth"
import { handleApiError, jsonError, jsonForbidden, jsonOk } from "@/lib/api/response"
import { updateToroProduct } from "@/lib/db/repositories/toro-products.repository"
import { mapRowToPublicProduct } from "@/lib/toro/product-utils"

export const dynamic = "force-dynamic"

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    if (!isAdmin(req)) return jsonForbidden("Apenas administradores podem editar produtos.")

    const { slug } = await params
    const body = await req.json()

    const statusRaw = body.status ?? body.product_status
    const status =
      statusRaw === "esgotado" || statusRaw === "disponivel" ? statusRaw : undefined

    const updated = await updateToroProduct(slug, {
      name: body.name !== undefined ? String(body.name).trim() : undefined,
      price: body.price !== undefined ? Number(body.price) : undefined,
      status,
      stockTotal: body.stockTotal !== undefined ? Math.max(0, Number(body.stockTotal)) : undefined,
      gender: body.gender === "masculino" || body.gender === "feminino" ? body.gender : undefined,
      category: body.category !== undefined ? String(body.category).trim() : undefined,
      image: body.image !== undefined ? String(body.image).trim() : undefined,
      description: body.description !== undefined ? String(body.description) : undefined,
    })

    if (!updated) return jsonError("Produto não encontrado.", 404)

    return jsonOk({ success: true, product: mapRowToPublicProduct(updated) })
  } catch (err) {
    console.error("Erro ao atualizar produto:", err)
    return handleApiError(err, "Erro ao atualizar produto.")
  }
}
