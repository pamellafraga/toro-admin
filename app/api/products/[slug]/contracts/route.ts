import { NextRequest } from "next/server"
import { parseAuthCookie, isAdmin } from "@/lib/api/auth"
import { handleApiError, jsonError, jsonOk } from "@/lib/api/response"
import { findOrCreateProductFromCatalog, listProductContracts } from "@/lib/db/repositories/products.repository"
import { stripDeveloperCredentialsFromClient } from "@/lib/liticapro/developer-credentials"
import { getProductBySlug } from "@/lib/products/catalog"

export const dynamic = "force-dynamic"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params
    const catalog = getProductBySlug(slug)
    if (!catalog) return jsonError("Produto não encontrado.", 404)

    const auth = parseAuthCookie(req)
    const isComercial = auth?.role === "comercial" && auth.displayName
    const origemComercial = isComercial ? `Comercial - ${auth.displayName}` : null

    const product = await findOrCreateProductFromCatalog(catalog)
    const rows = await listProductContracts(product.id, origemComercial)

    const contracts = isAdmin(req)
      ? rows
      : rows.map((row) => {
          const r = row as { clients?: Record<string, unknown> }
          if (!r.clients) return row
          return { ...row, clients: stripDeveloperCredentialsFromClient(r.clients) }
        })

    return jsonOk({
      product: {
        id: product.id,
        name: product.name,
        description: product.description,
        slug: product.slug ?? catalog.slug,
        product_status: product.product_status ?? "no_ar",
      },
      contracts,
    })
  } catch (err) {
    console.error("Erro ao buscar contratos:", err)
    return handleApiError(err, "Erro ao carregar")
  }
}
