import { NextRequest } from "next/server"
import { isAdmin, parseAuthCookie } from "@/lib/api/auth"
import { handleApiError, jsonError, jsonForbidden, jsonOk } from "@/lib/api/response"
import { getProductsAlphabetically } from "@/lib/products/catalog"
import { findOrCreateProductFromCatalog } from "@/lib/db/repositories/products.repository"
import {
  createToroProduct,
  listToroProducts,
} from "@/lib/db/repositories/toro-products.repository"
import { mapRowToPublicProduct } from "@/lib/toro/product-utils"

export const dynamic = "force-dynamic"

/** GET /api/products — catálogo Toro */
export async function GET(request: NextRequest) {
  try {
    for (const entry of getProductsAlphabetically()) {
      try {
        await findOrCreateProductFromCatalog(entry)
      } catch {
        // seed best-effort
      }
    }

    const products = await listToroProducts()
    return jsonOk({
      products: products.map((p) => mapRowToPublicProduct(p)),
    })
  } catch (e) {
    return handleApiError(e, "Erro ao listar produtos.")
  }
}

/** POST /api/products — novo produto (sincroniza com o site) */
export async function POST(request: NextRequest) {
  try {
    if (!isAdmin(request)) return jsonForbidden("Apenas administradores podem adicionar produtos.")

    const body = await request.json()
    const name = String(body.name ?? "").trim()
    const price = Number(body.price)
    const gender = body.gender === "masculino" ? "masculino" : "feminino"
    const category = String(body.category ?? "Produto").trim()
    const stockTotal = Math.max(0, Number(body.stockTotal ?? 0))
    const status = body.status === "esgotado" ? "esgotado" : "disponivel"

    if (!name) return jsonError("Nome é obrigatório.", 400)
    if (!Number.isFinite(price) || price < 0) return jsonError("Preço inválido.", 400)

    const product = await createToroProduct({
      name,
      price,
      gender,
      category,
      stockTotal,
      status,
      image: body.image ? String(body.image) : undefined,
      hoverImage: body.hoverImage ? String(body.hoverImage) : undefined,
      description: body.description ? String(body.description) : undefined,
      sizes: Array.isArray(body.sizes) ? body.sizes.map(String) : undefined,
      tag: body.tag ? String(body.tag) : undefined,
    })

    return jsonOk({ product: mapRowToPublicProduct(product) }, 201)
  } catch (e) {
    return handleApiError(e, "Erro ao criar produto.")
  }
}
