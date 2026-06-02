export type ProductSlug = "segura" | "liticapro"

export interface ProductCatalogEntry {
  slug: ProductSlug
  name: string
  description: string
  icon: string
  planosLabel: string
  /** Slug legado (redirecionamento) */
  legacySlugs?: string[]
}

export const PRODUCT_CATALOG: ProductCatalogEntry[] = [
  {
    slug: "liticapro",
    name: "LiticaPro",
    description: "Monitoramento de licitações públicas no Brasil",
    icon: "search",
    planosLabel: "Monitoramento de editais e licitações em todo o país",
  },
  {
    slug: "segura",
    name: "SEGURA",
    description: "Apólice de Seguro - Modalidade Garantias",
    icon: "shield-check",
    planosLabel: "3 planos: Básico (R$ 500), Confort (R$ 800), Premium (R$ 1.500)",
    legacySlugs: ["software-gestao-apolice-seguro"],
  },
]

export function getProductsAlphabetically(): ProductCatalogEntry[] {
  return [...PRODUCT_CATALOG].sort((a, b) =>
    a.name.localeCompare(b.name, "pt-BR", { sensitivity: "base" }),
  )
}

export function getProductBySlug(slug: string): ProductCatalogEntry | undefined {
  const s = slug.trim().toLowerCase()
  return PRODUCT_CATALOG.find(
    (p) => p.slug === s || p.legacySlugs?.some((legacy) => legacy.toLowerCase() === s),
  )
}

export function resolveProductSlug(slug: string): ProductSlug | null {
  return getProductBySlug(slug)?.slug ?? null
}

export const PRODUCT_SLUGS = PRODUCT_CATALOG.map((p) => p.slug)
