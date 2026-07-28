import { NextRequest } from "next/server"
import { jsonOk, handleApiError } from "@/lib/api/response"
import { parseAuthCookie } from "@/lib/api/auth"
import { listProducts } from "@/lib/db/repositories/products.repository"
import { getProductsAlphabetically } from "@/lib/products/catalog"
import { findOrCreateProductFromCatalog } from "@/lib/db/repositories/products.repository"

export const dynamic = "force-dynamic"

/** GET /api/products — lista produtos Toro (catálogo + banco) */
export async function GET(request: NextRequest) {
  try {
    if (!parseAuthCookie(request)) {
      return jsonOk({ products: getProductsAlphabetically().map((p) => ({ slug: p.slug, name: p.name, price: p.price })) })
    }

    for (const entry of getProductsAlphabetically()) {
      try {
        await findOrCreateProductFromCatalog(entry)
      } catch {
        // best-effort seed
      }
    }

    const products = await listProducts()
    return jsonOk({ products })
  } catch (e) {
    return handleApiError(e, "Erro ao listar produtos.")
  }
}
