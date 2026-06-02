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

  return row
}

export async function findOrCreateProductFromCatalog(catalog: ProductCatalogEntry): Promise<ProductRow> {
  const existing = await findProductBySlug(catalog.slug)
  if (existing) return existing

  const row = await queryOne<ProductRow>(
    `INSERT INTO products (name, description, icon, slug, product_status, is_active)
     VALUES ($1, $2, $3, $4, 'no_ar', true)
     RETURNING id, name, description, icon, slug, product_status, monthly_price`,
    [catalog.name, catalog.description, catalog.icon, catalog.slug],
  )
  if (!row) throw new Error(`Falha ao criar produto ${catalog.name}.`)
  return row
}

export async function listProducts(): Promise<ProductRow[]> {
  return queryMany<ProductRow>(
    `SELECT id, name, description, icon, slug, product_status, monthly_price
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
