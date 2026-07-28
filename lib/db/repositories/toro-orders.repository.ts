import { randomUUID } from "crypto"
import { queryMany, queryOne } from "@/lib/db/pool"
import { parseMetadata } from "@/lib/toro/product-utils"

export interface ToroOrderRow {
  id: string
  order_number: string
  site_user_id: string | null
  customer_name: string | null
  customer_email: string | null
  customer_phone: string | null
  customer_cpf_cnpj: string | null
  items: unknown
  subtotal: number
  shipping: number
  discount: number
  total: number
  coupon_code: string | null
  address: unknown
  payment_method: string | null
  payment_status: string
  order_status: string
  tracking_code: string | null
  status_history: unknown
  metadata: unknown
  created_at: string
  updated_at: string
}

export interface ToroOrderItem {
  productId: string
  productName?: string
  size: string
  quantity: number
  unitPrice: number
}

export interface CreateToroOrderInput {
  orderNumber: string
  siteUserId?: string
  customerName?: string
  customerEmail?: string
  customerPhone?: string
  customerCpfCnpj?: string
  items: ToroOrderItem[]
  subtotal: number
  shipping: number
  discount: number
  total: number
  couponCode?: string
  address?: Record<string, unknown>
  paymentMethod?: string
  paymentStatus?: string
  orderStatus?: string
  trackingCode?: string
  statusHistory?: unknown[]
  metadata?: Record<string, unknown>
}

export async function findOrderByNumber(orderNumber: string): Promise<ToroOrderRow | null> {
  return queryOne<ToroOrderRow>(`SELECT * FROM toro_orders WHERE order_number = ? LIMIT 1`, [
    orderNumber.trim(),
  ])
}

export async function createToroOrder(input: CreateToroOrderInput): Promise<ToroOrderRow> {
  const id = randomUUID()
  await queryOne(
    `INSERT INTO toro_orders (
      id, order_number, site_user_id, customer_name, customer_email, customer_phone, customer_cpf_cnpj,
      items, subtotal, shipping, discount, total, coupon_code, address,
      payment_method, payment_status, order_status, tracking_code, status_history, metadata
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      id,
      input.orderNumber,
      input.siteUserId ?? null,
      input.customerName ?? null,
      input.customerEmail ?? null,
      input.customerPhone ?? null,
      input.customerCpfCnpj ?? null,
      JSON.stringify(input.items),
      input.subtotal,
      input.shipping,
      input.discount,
      input.total,
      input.couponCode ?? null,
      input.address ? JSON.stringify(input.address) : null,
      input.paymentMethod ?? null,
      input.paymentStatus ?? "pending",
      input.orderStatus ?? "pending_payment",
      input.trackingCode ?? null,
      JSON.stringify(input.statusHistory ?? []),
      JSON.stringify(input.metadata ?? {}),
    ],
  )

  const row = await queryOne<ToroOrderRow>(`SELECT * FROM toro_orders WHERE id = ? LIMIT 1`, [id])
  if (!row) throw new Error("Falha ao registrar pedido.")
  return row
}

export async function listToroOrders(limit = 100): Promise<ToroOrderRow[]> {
  return queryMany<ToroOrderRow>(`SELECT * FROM toro_orders ORDER BY created_at DESC LIMIT ?`, [limit])
}

export async function updateToroOrderStatus(
  orderNumber: string,
  orderStatus: string,
  paymentStatus?: string,
  trackingCode?: string,
): Promise<ToroOrderRow | null> {
  await queryOne(
    `UPDATE toro_orders SET
      order_status = ?,
      payment_status = COALESCE(?, payment_status),
      tracking_code = COALESCE(?, tracking_code)
     WHERE order_number = ?`,
    [orderStatus, paymentStatus ?? null, trackingCode ?? null, orderNumber],
  )
  return findOrderByNumber(orderNumber)
}

export async function decrementProductStock(productId: string, size: string, quantity: number): Promise<void> {
  const row = await queryOne<{ metadata: unknown }>(
    `SELECT metadata FROM products WHERE external_id = ? OR slug = ? LIMIT 1`,
    [productId, productId],
  )
  const meta = parseMetadata(row?.metadata)
  const stockBySize = meta.stockBySize
  if (!stockBySize || stockBySize[size] == null) return

  const updated = { ...stockBySize, [size]: Math.max(0, stockBySize[size] - quantity) }
  const metadata = { ...meta, stockBySize: updated }
  await queryOne(`UPDATE products SET metadata = ? WHERE external_id = ? OR slug = ?`, [
    JSON.stringify(metadata),
    productId,
    productId,
  ])

  const { syncToroProductAvailability } = await import("@/lib/db/repositories/toro-products.repository")
  await syncToroProductAvailability(productId)
}
