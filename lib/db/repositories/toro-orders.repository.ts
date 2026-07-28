import { queryMany, queryOne } from "@/lib/db/pool"

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
  return queryOne<ToroOrderRow>(
    `SELECT * FROM toro_orders WHERE order_number = $1 LIMIT 1`,
    [orderNumber.trim()],
  )
}

export async function createToroOrder(input: CreateToroOrderInput): Promise<ToroOrderRow> {
  const row = await queryOne<ToroOrderRow>(
    `INSERT INTO toro_orders (
      order_number, site_user_id, customer_name, customer_email, customer_phone, customer_cpf_cnpj,
      items, subtotal, shipping, discount, total, coupon_code, address,
      payment_method, payment_status, order_status, tracking_code, status_history, metadata
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)
    RETURNING *`,
    [
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
  if (!row) throw new Error("Falha ao registrar pedido.")
  return row
}

export async function listToroOrders(limit = 100): Promise<ToroOrderRow[]> {
  return queryMany<ToroOrderRow>(
    `SELECT * FROM toro_orders ORDER BY created_at DESC LIMIT $1`,
    [limit],
  )
}

export async function updateToroOrderStatus(
  orderNumber: string,
  orderStatus: string,
  paymentStatus?: string,
  trackingCode?: string,
): Promise<ToroOrderRow | null> {
  return queryOne<ToroOrderRow>(
    `UPDATE toro_orders SET
      order_status = $2,
      payment_status = COALESCE($3, payment_status),
      tracking_code = COALESCE($4, tracking_code)
     WHERE order_number = $1
     RETURNING *`,
    [orderNumber, orderStatus, paymentStatus ?? null, trackingCode ?? null],
  )
}

export async function decrementProductStock(productId: string, size: string, quantity: number): Promise<void> {
  const row = await queryOne<{ metadata: { stockBySize?: Record<string, number> } }>(
    `SELECT metadata FROM products WHERE external_id = $1 OR slug = $1 LIMIT 1`,
    [productId],
  )
  const stockBySize = row?.metadata?.stockBySize
  if (!stockBySize || stockBySize[size] == null) return

  const updated = { ...stockBySize, [size]: Math.max(0, stockBySize[size] - quantity) }
  await queryOne(
    `UPDATE products SET metadata = jsonb_set(COALESCE(metadata, '{}'::jsonb), '{stockBySize}', $2::jsonb, true)
     WHERE external_id = $1 OR slug = $1`,
    [productId, JSON.stringify(updated)],
  )
  const { syncToroProductAvailability } = await import("@/lib/db/repositories/toro-products.repository")
  await syncToroProductAvailability(productId)
}
