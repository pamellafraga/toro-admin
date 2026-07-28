import { getTotalStock, getToroProductsAlphabetically } from "@/lib/products/catalog"
import { mapRowToPublicProduct } from "@/lib/toro/product-utils"

/** Catálogo estático — fallback quando o PostgreSQL falha ou ainda não foi migrado */
export function getStaticToroPublicProducts() {
  return getToroProductsAlphabetically().map((entry) =>
    mapRowToPublicProduct({
      slug: entry.slug,
      external_id: entry.externalId,
      name: entry.name,
      description: entry.description,
      price: entry.price,
      product_status: getTotalStock(entry) > 0 ? "disponivel" : "esgotado",
      metadata: {
        gender: entry.gender,
        category: entry.category,
        image: entry.image,
        hoverImage: entry.hoverImage,
        stockBySize: entry.stockBySize,
        sizes: entry.sizes,
        collectionLine: entry.collectionLine,
        tag: entry.tag,
        bestSeller: entry.bestSeller,
        isLaunch: entry.isLaunch,
        rating: entry.rating,
        description: entry.description,
        shipping: entry.shipping,
      },
    }),
  )
}
