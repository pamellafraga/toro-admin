import { NextRequest } from "next/server"
import { isDatabaseConfigured } from "@/lib/db/config"
import { getProductsAlphabetically } from "@/lib/products/catalog"
import { findOrCreateProductFromCatalog } from "@/lib/db/repositories/products.repository"
import { listToroProducts } from "@/lib/db/repositories/toro-products.repository"
import { corsPreflightResponse, jsonWithCors } from "@/lib/public-api/cors"
import { mapRowToPublicProduct } from "@/lib/toro/product-utils"
import { getStaticToroPublicProducts } from "@/lib/toro/static-catalog"

export const dynamic = "force-dynamic"

export async function OPTIONS(request: NextRequest) {
  return corsPreflightResponse(request)
}

/** GET /api/public/products — catálogo para o site Toro */
export async function GET(request: NextRequest) {
  try {
    if (!isDatabaseConfigured()) {
      return jsonWithCors(request, {
        products: getStaticToroPublicProducts(),
        updatedAt: new Date().toISOString(),
        source: "static",
      })
    }

    for (const entry of getProductsAlphabetically()) {
      try {
        await findOrCreateProductFromCatalog(entry)
      } catch {
        // seed
      }
    }

    const products = await listToroProducts()
    const mapped =
      products.length > 0
        ? products.map((p) => mapRowToPublicProduct(p))
        : getStaticToroPublicProducts()

    return jsonWithCors(request, {
      products: mapped,
      updatedAt: new Date().toISOString(),
      source: products.length > 0 ? "database" : "static",
    })
  } catch (e) {
    console.error("[api/public/products] fallback estático:", e)
    return jsonWithCors(request, {
      products: getStaticToroPublicProducts(),
      updatedAt: new Date().toISOString(),
      source: "static",
    })
  }
}
