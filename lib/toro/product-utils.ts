export type ToroStoreStatus = "disponivel" | "esgotado"
export type ToroGender = "feminino" | "masculino"

export interface ToroProductMetadata {
  gender?: ToroGender
  category?: string
  image?: string
  hoverImage?: string
  stockBySize?: Record<string, number>
  stockTotal?: number
  sizes?: string[]
  collectionLine?: string
  tag?: string
  bestSeller?: boolean
  isLaunch?: boolean
  rating?: number
  description?: string
  shipping?: Record<string, number>
}

export const TORO_SITE_URL =
  process.env.TORO_SITE_URL?.trim() || process.env.NEXT_PUBLIC_TORO_SITE_URL?.trim() || "https://toro-green.vercel.app"

export function resolveProductImageUrl(imagePath?: string | null): string {
  if (!imagePath?.trim()) return ""
  const path = imagePath.trim()
  if (path.startsWith("http://") || path.startsWith("https://")) return path
  return `${TORO_SITE_URL}${path.startsWith("/") ? path : `/${path}`}`
}

export function getTotalStock(metadata?: ToroProductMetadata | null): number {
  if (!metadata) return 0
  if (metadata.stockBySize && Object.keys(metadata.stockBySize).length > 0) {
    return Object.values(metadata.stockBySize).reduce((sum, n) => sum + (Number(n) || 0), 0)
  }
  return Number(metadata.stockTotal ?? 0)
}

export function distributeStock(total: number, sizes: string[]): Record<string, number> {
  if (sizes.length === 0) return { UN: Math.max(0, total) }
  const base = Math.floor(total / sizes.length)
  let remainder = total - base * sizes.length
  const stock: Record<string, number> = {}
  for (const size of sizes) {
    stock[size] = base + (remainder > 0 ? 1 : 0)
    if (remainder > 0) remainder--
  }
  return stock
}

export function computeStoreStatus(
  stockTotal: number,
  manual?: string | null,
): ToroStoreStatus {
  if (stockTotal <= 0) return "esgotado"
  if (manual === "esgotado") return "esgotado"
  return "disponivel"
}

export function parseMetadata(raw: unknown): ToroProductMetadata {
  if (!raw || typeof raw !== "object") return {}
  return raw as ToroProductMetadata
}

export function mapRowToPublicProduct(row: {
  slug?: string | null
  external_id?: string | null
  name: string
  description?: string | null
  price?: number | null
  product_status?: string | null
  metadata?: unknown
}) {
  const metadata = parseMetadata(row.metadata)
  const id = row.external_id || row.slug || ""
  const stockTotal = getTotalStock(metadata)
  const status = computeStoreStatus(stockTotal, row.product_status)

  return {
    id,
    name: row.name,
    category: metadata.category ?? "Produto",
    gender: metadata.gender ?? "feminino",
    price: Number(row.price ?? 0),
    image: resolveProductImageUrl(metadata.image),
    hoverImage: metadata.hoverImage ? resolveProductImageUrl(metadata.hoverImage) : undefined,
    tag: metadata.tag,
    bestSeller: metadata.bestSeller,
    isLaunch: metadata.isLaunch,
    rating: metadata.rating,
    collectionLine: metadata.collectionLine,
    stockBySize: metadata.stockBySize ?? {},
    stockTotal,
    status,
    sizes: metadata.sizes ?? Object.keys(metadata.stockBySize ?? { UN: 0 }),
    description: metadata.description ?? row.description ?? "",
    shipping: metadata.shipping,
  }
}
