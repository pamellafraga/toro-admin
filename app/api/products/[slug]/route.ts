import { NextRequest } from "next/server"
import { isAdmin } from "@/lib/api/auth"
import { handleApiError, jsonError, jsonForbidden, jsonOk } from "@/lib/api/response"
import { findProductBySlug, updateProductStatus } from "@/lib/db/repositories/products.repository"
import { getProductBySlug } from "@/lib/products/catalog"

export const dynamic = "force-dynamic"

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    if (!isAdmin(req)) return jsonForbidden("Apenas administradores podem alterar o status do produto")

    const { slug } = await params
    const catalog = getProductBySlug(slug)
    if (!catalog) return jsonError("Produto não encontrado.", 404)

    const body = await req.json()
    const { product_status } = body as { product_status?: string }
    if (!product_status || !["no_ar", "pausado", "desativado"].includes(product_status)) {
      return jsonError("product_status deve ser no_ar, pausado ou desativado", 400)
    }

    const productRow = await findProductBySlug(catalog.slug)
    if (!productRow?.id) return jsonError("Produto não encontrado", 404)

    const updated = await updateProductStatus(productRow.id, product_status)
    if (!updated) return jsonError("Produto não encontrado após atualização.", 500)

    return jsonOk({ success: true, product: updated })
  } catch (err) {
    console.error("Erro ao atualizar produto:", err)
    return handleApiError(err, "Erro ao atualizar")
  }
}
