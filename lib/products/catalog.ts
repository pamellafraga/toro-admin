export type ToroGender = "feminino" | "masculino"

export interface ToroProductCatalogEntry {
  /** ID do site (ex.: f-001) — usado como slug no admin */
  slug: string
  externalId: string
  name: string
  category: string
  gender: ToroGender
  price: number
  image: string
  hoverImage?: string
  tag?: string
  bestSeller?: boolean
  isLaunch?: boolean
  rating?: number
  collectionLine?: string
  stockBySize?: Record<string, number>
  shipping?: {
    weightKg: number
    heightCm: number
    widthCm: number
    lengthCm: number
  }
  description?: string
  sizes?: string[]
}

/** Catálogo espelhado do site https://toro-green.vercel.app */
export const TORO_PRODUCT_CATALOG: ToroProductCatalogEntry[] = [
  {
    slug: "f-001",
    externalId: "f-001",
    name: "Short Booty Preto",
    category: "Shorts",
    gender: "feminino",
    price: 690,
    tag: "Novo",
    bestSeller: true,
    isLaunch: true,
    rating: 5,
    collectionLine: "Elite Black",
    image: "/products/editorial-f-short-booty-preto.webp",
    hoverImage: "/products/editorial-f-conjunto-preto.webp",
    description:
      "Short booty de cintura alta em tecido compressivo preto ultrafine. Faixa elástica larga com logo TORO bordado.",
    sizes: ["PP", "P", "M", "G"],
    stockBySize: { PP: 3, P: 5, M: 8, G: 4 },
    shipping: { weightKg: 0.22, heightCm: 5, widthCm: 20, lengthCm: 24 },
  },
  {
    slug: "f-002",
    externalId: "f-002",
    name: "Top Cropped Manga Longa",
    category: "Tops",
    gender: "feminino",
    price: 620,
    bestSeller: true,
    rating: 4,
    collectionLine: "Elite Black",
    image: "/products/editorial-f-cropped-preto.webp",
    hoverImage: "/products/editorial-f-power-black.webp",
    description: "Top cropped manga longa em Dry Energy preto com gola alta e corte raglan.",
    sizes: ["PP", "P", "M", "G"],
    stockBySize: { PP: 2, P: 6, M: 0, G: 3 },
    shipping: { weightKg: 0.18, heightCm: 5, widthCm: 18, lengthCm: 22 },
  },
  {
    slug: "f-003",
    externalId: "f-003",
    name: "Conjunto Preto Elite",
    category: "Conjuntos",
    gender: "feminino",
    price: 1480,
    tag: "Exclusivo",
    bestSeller: true,
    rating: 5,
    collectionLine: "Elite Black",
    image: "/products/editorial-f-conjunto-preto.webp",
    hoverImage: "/products/editorial-f-essence-black.webp",
    description: "Conjunto exclusivo preto: top fio dental + short booty com logos TORO.",
    sizes: ["PP", "P", "M", "G"],
    stockBySize: { PP: 1, P: 2, M: 1, G: 0 },
    shipping: { weightKg: 0.55, heightCm: 12, widthCm: 28, lengthCm: 32 },
  },
  {
    slug: "f-004",
    externalId: "f-004",
    name: "Top Fio Dental Preto",
    category: "Tops",
    gender: "feminino",
    price: 480,
    tag: "Novo",
    isLaunch: true,
    rating: 4,
    collectionLine: "Elite Black",
    image: "/products/editorial-f-top-fio-dental-preto.webp",
    hoverImage: "/products/editorial-f-conjunto-preto.webp",
    description: "Top fio dental em meia malha preta ultrafine com alças finas e costas abertas.",
    sizes: ["PP", "P", "M", "G"],
    stockBySize: { PP: 0, P: 0, M: 0, G: 0 },
    shipping: { weightKg: 0.12, heightCm: 3, widthCm: 16, lengthCm: 18 },
  },
  {
    slug: "m-001",
    externalId: "m-001",
    name: "Regata Machão Preto",
    category: "Regatas",
    gender: "masculino",
    price: 480,
    tag: "Novo",
    bestSeller: true,
    isLaunch: true,
    rating: 5,
    collectionLine: "Elite Black",
    image: "/products/editorial-m-machao-preto.webp",
    hoverImage: "/products/editorial-m-machao-forca.webp",
    description: "Regata machão em meia malha preta ultrafine com cava ampla e logo TORO.",
    sizes: ["P", "M", "G", "GG"],
    stockBySize: { P: 6, M: 10, G: 7, GG: 2 },
    shipping: { weightKg: 0.22, heightCm: 4, widthCm: 20, lengthCm: 26 },
  },
  {
    slug: "m-002",
    externalId: "m-002",
    name: "Short Elastic Preto",
    category: "Shorts",
    gender: "masculino",
    price: 560,
    bestSeller: true,
    rating: 4,
    collectionLine: "Elite Black",
    image: "/products/editorial-m-short-elastic-preto.webp",
    hoverImage: "/products/editorial-m-performance-preto.webp",
    description: "Short elastic preto com cintura elástica, forro claro e logo TORO na perna.",
    sizes: ["P", "M", "G", "GG"],
    stockBySize: { P: 4, M: 5, G: 3, GG: 1 },
    shipping: { weightKg: 0.2, heightCm: 4, widthCm: 18, lengthCm: 24 },
  },
  {
    slug: "m-003",
    externalId: "m-003",
    name: "Conjunto Machão + Short",
    category: "Conjuntos",
    gender: "masculino",
    price: 1340,
    tag: "Exclusivo",
    bestSeller: true,
    rating: 5,
    collectionLine: "Elite Black",
    image: "/products/editorial-m-conjunto-machao-short.webp",
    hoverImage: "/products/editorial-m-elite-preto.webp",
    description: "Conjunto completo preto: regata machão + short elastic com logos TORO.",
    sizes: ["P", "M", "G", "GG"],
    stockBySize: { P: 2, M: 4, G: 2, GG: 0 },
    shipping: { weightKg: 0.48, heightCm: 10, widthCm: 26, lengthCm: 30 },
  },
  {
    slug: "m-004",
    externalId: "m-004",
    name: "Regata Machão Performance",
    category: "Regatas",
    gender: "masculino",
    price: 520,
    tag: "Novo",
    isLaunch: true,
    rating: 5,
    collectionLine: "Elite Black",
    image: "/products/editorial-m-machao-forca.webp",
    hoverImage: "/products/editorial-m-machao-preto.webp",
    description: "Regata machão preta performance com tecido respirável e logo TORO em destaque.",
    sizes: ["P", "M", "G", "GG"],
    stockBySize: { P: 3, M: 6, G: 4, GG: 2 },
    shipping: { weightKg: 0.22, heightCm: 4, widthCm: 20, lengthCm: 26 },
  },
]

export function getToroProductsAlphabetically(): ToroProductCatalogEntry[] {
  return [...TORO_PRODUCT_CATALOG].sort((a, b) =>
    a.name.localeCompare(b.name, "pt-BR", { sensitivity: "base" }),
  )
}

export function getToroProductBySlug(slug: string): ToroProductCatalogEntry | undefined {
  const s = slug.trim().toLowerCase()
  return TORO_PRODUCT_CATALOG.find((p) => p.slug.toLowerCase() === s || p.externalId.toLowerCase() === s)
}

export function getTotalStock(entry: ToroProductCatalogEntry): number {
  if (!entry.stockBySize) return 0
  return Object.values(entry.stockBySize).reduce((sum, n) => sum + n, 0)
}

export function formatToroPrice(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 0,
  }).format(value)
}

/** Compatibilidade com imports antigos do catálogo SaaS */
export type ProductSlug = string
export type ProductCatalogEntry = ToroProductCatalogEntry & { icon: string; planosLabel: string; legacySlugs?: string[] }

export const PRODUCT_CATALOG: ProductCatalogEntry[] = TORO_PRODUCT_CATALOG.map((p) => ({
  ...p,
  slug: p.slug,
  icon: "shirt",
  planosLabel: `${p.category} · ${p.gender === "feminino" ? "Feminino" : "Masculino"}`,
}))

export function getProductsAlphabetically(): ProductCatalogEntry[] {
  return getToroProductsAlphabetically().map((p) => ({
    ...p,
    icon: "shirt",
    planosLabel: `${p.category} · ${p.gender === "feminino" ? "Feminino" : "Masculino"}`,
  }))
}

export function getProductBySlug(slug: string): ProductCatalogEntry | undefined {
  const p = getToroProductBySlug(slug)
  if (!p) return undefined
  return {
    ...p,
    icon: "shirt",
    planosLabel: `${p.category} · ${p.gender === "feminino" ? "Feminino" : "Masculino"}`,
  }
}

export function resolveProductSlug(slug: string): string | null {
  return getToroProductBySlug(slug)?.slug ?? null
}

export const PRODUCT_SLUGS = TORO_PRODUCT_CATALOG.map((p) => p.slug)
