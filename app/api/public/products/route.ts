import { NextRequest } from "next/server"
import { handleApiError, jsonOk } from "@/lib/api/response"
import { getProductsAlphabetically } from "@/lib/products/catalog"
import { findOrCreateProductFromCatalog } from "@/lib/db/repositories/products.repository"
import { listToroProducts } from "@/lib/db/repositories/toro-products.repository"
import { corsPreflightResponse, jsonWithCors } from "@/lib/public-api/cors"
import { mapRowToPublicProduct } from "@/lib/toro/product-utils"

export const dynamic = "force-dynamic"

export async function OPTIONS(request: NextRequest) {
  return corsPreflightResponse(request)
}

/** GET /api/public/products — catálogo para o site Toro */
export async function GET(request: NextRequest) {
  try {
    for (const entry of getProductsAlphabetically()) {
      try {
        await findOrCreateProductFromCatalog(entry)
      } catch {
        // seed
      }
    }

    const products = await listToroProducts()
    const mapped = products.map((p) => mapRowToPublicProduct(p))

    return jsonWithCors(request, {
      products: mapped,
      updatedAt: new Date().toISOString(),
    })
  } catch (e) {
    const res = handleApiError(e, "Erro ao carregar catálogo.")
    const data = await res.json()
    return jsonWithCors(request, data, res.status)
  }
}
