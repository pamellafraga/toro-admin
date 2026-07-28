import { queryMany, queryOne } from "@/lib/db/pool"
import { getProductBySlug, type ProductCatalogEntry } from "@/lib/products/catalog"

export interface ProductRow {
  id: string
  name: string
  description: string
  icon?: string
  slug?: string | null
  product_status?: string
  monthly_price?: number
}

export async function findProductBySlug(slug: string): Promise<ProductRow | null> {
  const catalog = getProductBySlug(slug)
  const canonical = catalog?.slug ?? slug

  let row = await queryOne<ProductRow>(
    `SELECT id, name, description, icon, slug, product_status, monthly_price
     FROM products WHERE lower(trim(slug)) = lower(trim($1)) LIMIT 1`,
    [canonical],
  )

  if (!row && catalog) {
    row = await queryOne<ProductRow>(
      `SELECT id, name, description, icon, slug, product_status, monthly_price
       FROM products WHERE lower(trim(name)) = lower(trim($1)) LIMIT 1`,
      [catalog.name],
    )
  }

  if (!row && catalog?.legacySlugs?.length) {
    for (const legacy of catalog.legacySlugs) {
      row = await queryOne<ProductRow>(
        `SELECT id, name, description, icon, slug, product_status, monthly_price
         FROM products WHERE lower(trim(slug)) = lower(trim($1)) LIMIT 1`,
        [legacy],
      )
      if (row) break
    }
  }

  if (row && catalog && row.name !== catalog.name) {
    const synced = await queryOne<ProductRow>(
      `UPDATE products SET name = $1 WHERE id = $2
       RETURNING id, name, description, icon, slug, product_status, monthly_price`,
      [catalog.name, row.id],
    )
    if (synced) row = synced
  }

  return row
}

export async function findOrCreateProductFromCatalog(catalog: ProductCatalogEntry): Promise<ProductRow> {
  const existing = await findProductBySlug(catalog.slug)

  const metadata = {
    category: (catalog as { category?: string }).category,
    gender: (catalog as { gender?: string }).gender,
    image: (catalog as { image?: string }).image,
    hoverImage: (catalog as { hoverImage?: string }).hoverImage,
    stockBySize: (catalog as { stockBySize?: Record<string, number> }).stockBySize,
    sizes: (catalog as { sizes?: string[] }).sizes,
    collectionLine: (catalog as { collectionLine?: string }).collectionLine,
    tag: (catalog as { tag?: string }).tag,
    bestSeller: (catalog as { bestSeller?: boolean }).bestSeller,
    isLaunch: (catalog as { isLaunch?: boolean }).isLaunch,
    description: (catalog as { description?: string }).description,
    shipping: (catalog as { shipping?: unknown }).shipping,
  }

  if (existing) {
    await queryOne(
      `UPDATE products SET
        external_id = COALESCE(external_id, $2),
        price = COALESCE(price, $3),
        metadata = COALESCE(metadata, '{}'::jsonb) || $4::jsonb
       WHERE id = $1`,
      [existing.id, catalog.slug, (catalog as { price?: number }).price ?? null, JSON.stringify(metadata)],
    )
    return existing
  }

  const row = await queryOne<ProductRow>(
    `INSERT INTO products (name, description, icon, slug, external_id, price, product_status, is_active, metadata)
     VALUES ($1, $2, $3, $4, $5, $6, 'disponivel', true, $7::jsonb)
     RETURNING id, name, description, icon, slug, product_status, monthly_price`,
    [
      catalog.name,
      catalog.description,
      catalog.icon,
      catalog.slug,
      catalog.slug,
      (catalog as { price?: number }).price ?? null,
      JSON.stringify(metadata),
    ],
  )
  if (!row) throw new Error(`Falha ao criar produto ${catalog.name}.`)
  return row
}

export async function listProducts(): Promise<ProductRow[]> {
  return queryMany<ProductRow & { price?: number; metadata?: Record<string, unknown> }>(
    `SELECT id, name, description, icon, slug, product_status, monthly_price, price, metadata
     FROM products
     WHERE slug IS NOT NULL
     ORDER BY name`,
  )
}

export async function updateProductStatus(productId: string, product_status: string) {
  return queryOne(
    `UPDATE products SET product_status = $1 WHERE id = $2
     RETURNING id, name, description, product_status, slug`,
    [product_status, productId],
  )
}

export async function listProductContracts(productId: string, origemComercial?: string | null) {
  if (origemComercial) {
    return queryMany(
      `SELECT c.*,
              row_to_json(cl.*) AS clients,
              row_to_json(p.*) AS products
       FROM contracts c
       JOIN clients cl ON cl.id = c.client_id
       JOIN products p ON p.id = c.product_id
       WHERE c.product_id = $1 AND c.origem_comercial = $2
       ORDER BY c.created_at DESC`,
      [productId, origemComercial],
    )
  }
  return queryMany(
    `SELECT c.*,
            row_to_json(cl.*) AS clients,
            row_to_json(p.*) AS products
     FROM contracts c
     JOIN clients cl ON cl.id = c.client_id
     JOIN products p ON p.id = c.product_id
     WHERE c.product_id = $1
     ORDER BY c.created_at DESC`,
    [productId],
  )
}
