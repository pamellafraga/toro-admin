import { randomUUID } from "crypto"
import { queryMany, queryOne } from "@/lib/db/pool"
import {
  computeStoreStatus,
  distributeStock,
  getTotalStock,
  parseMetadata,
  type ToroGender,
  type ToroProductMetadata,
} from "@/lib/toro/product-utils"

export interface ToroProductRow {
  id: string
  name: string
  description: string
  slug: string | null
  external_id: string | null
  price: number | null
  product_status: string | null
  metadata: ToroProductMetadata
  is_active?: boolean
}

const TORO_PRODUCTS_WHERE = `external_id IS NOT NULL AND JSON_UNQUOTE(JSON_EXTRACT(metadata, '$.gender')) IS NOT NULL`

export async function listToroProducts(): Promise<ToroProductRow[]> {
  const rows = await queryMany<ToroProductRow & { metadata: unknown }>(
    `SELECT id, name, description, slug, external_id, price, product_status, metadata, is_active
     FROM products
     WHERE ${TORO_PRODUCTS_WHERE}
     ORDER BY name ASC`,
  )
  return rows.map((r) => ({ ...r, metadata: parseMetadata(r.metadata) }))
}

export async function findToroProductBySlug(slug: string): Promise<ToroProductRow | null> {
  const row = await queryOne<ToroProductRow & { metadata: unknown }>(
    `SELECT id, name, description, slug, external_id, price, product_status, metadata, is_active
     FROM products
     WHERE (slug = ? OR external_id = ?) AND ${TORO_PRODUCTS_WHERE}
     LIMIT 1`,
    [slug, slug],
  )
  if (!row) return null
  return { ...row, metadata: parseMetadata(row.metadata) }
}

async function nextSlugForGender(gender: ToroGender): Promise<string> {
  const prefix = gender === "feminino" ? "f" : "m"
  const rows = await queryMany<{ slug: string | null }>(
    `SELECT slug FROM products WHERE slug LIKE ?`,
    [`${prefix}-%`],
  )
  const nums = rows
    .map((r) => {
      const part = r.slug?.split("-")[1]
      return part ? parseInt(part, 10) : 0
    })
    .filter((n) => !Number.isNaN(n))
  const next = (nums.length ? Math.max(...nums) : 0) + 1
  return `${prefix}-${String(next).padStart(3, "0")}`
}

export async function createToroProduct(input: {
  name: string
  price: number
  gender: ToroGender
  category: string
  stockTotal: number
  status?: "disponivel" | "esgotado"
  image?: string
  hoverImage?: string
  description?: string
  sizes?: string[]
  tag?: string
}) {
  const slug = await nextSlugForGender(input.gender)
  const sizes = input.sizes?.length ? input.sizes : input.gender === "feminino" ? ["PP", "P", "M", "G"] : ["P", "M", "G", "GG"]
  const stockBySize = distributeStock(input.stockTotal, sizes)
  const stockTotal = getTotalStock({ stockBySize })
  const product_status = computeStoreStatus(stockTotal, input.status)

  const metadata: ToroProductMetadata = {
    gender: input.gender,
    category: input.category,
    image: input.image ?? `/products/editorial-${input.gender === "feminino" ? "f" : "m"}-placeholder.webp`,
    hoverImage: input.hoverImage,
    stockBySize,
    stockTotal,
    sizes,
    tag: input.tag,
    description: input.description,
    collectionLine: "Elite Black",
  }

  const id = randomUUID()
  await queryOne(
    `INSERT INTO products (id, name, description, icon, slug, external_id, price, product_status, is_active, metadata)
     VALUES (?, ?, ?, 'shirt', ?, ?, ?, ?, 1, ?)`,
    [id, input.name, input.description ?? "", slug, slug, input.price, product_status, JSON.stringify(metadata)],
  )

  const row = await findToroProductBySlug(slug)
  if (!row) throw new Error("Falha ao criar produto.")
  return row
}

export async function updateToroProduct(
  slug: string,
  input: {
    name?: string
    price?: number
    status?: "disponivel" | "esgotado"
    stockTotal?: number
    gender?: ToroGender
    category?: string
    image?: string
    description?: string
  },
) {
  const existing = await findToroProductBySlug(slug)
  if (!existing) return null

  const metadata: ToroProductMetadata = { ...existing.metadata }
  if (input.gender) metadata.gender = input.gender
  if (input.category) metadata.category = input.category
  if (input.image) metadata.image = input.image
  if (input.description !== undefined) metadata.description = input.description

  if (input.stockTotal !== undefined) {
    const sizes = metadata.sizes ?? (metadata.gender === "feminino" ? ["PP", "P", "M", "G"] : ["P", "M", "G", "GG"])
    metadata.sizes = sizes
    metadata.stockBySize = distributeStock(Math.max(0, input.stockTotal), sizes)
    metadata.stockTotal = getTotalStock(metadata)
  }

  const stockTotal = getTotalStock(metadata)
  const product_status = computeStoreStatus(stockTotal, input.status ?? existing.product_status)

  await queryOne(
    `UPDATE products SET
      name = COALESCE(?, name),
      price = COALESCE(?, price),
      product_status = ?,
      metadata = ?,
      description = COALESCE(?, description)
     WHERE id = ?`,
    [
      input.name ?? null,
      input.price ?? null,
      product_status,
      JSON.stringify(metadata),
      input.description ?? null,
      existing.id,
    ],
  )

  return findToroProductBySlug(slug)
}

export async function syncToroProductAvailability(slugOrExternalId: string): Promise<void> {
  const row = await findToroProductBySlug(slugOrExternalId)
  if (!row) return
  const stockTotal = getTotalStock(row.metadata)
  const product_status = computeStoreStatus(stockTotal, row.product_status)
  const metadata = { ...row.metadata, stockTotal }
  await queryOne(`UPDATE products SET product_status = ?, metadata = ? WHERE id = ?`, [
    product_status,
    JSON.stringify(metadata),
    row.id,
  ])
}
