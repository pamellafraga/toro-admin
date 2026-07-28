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

export async function generateManualOrderNumber(): Promise<string> {
  const date = new Date()
  const ymd = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}${String(date.getDate()).padStart(2, "0")}`
  const prefix = `MAN-${ymd}`
  const rows = await queryMany<{ order_number: string }>(
    `SELECT order_number FROM toro_orders WHERE order_number LIKE ? ORDER BY order_number DESC LIMIT 1`,
    [`${prefix}-%`],
  )
  const last = rows[0]?.order_number
  const seq = last ? parseInt(last.split("-").pop() || "0", 10) + 1 : 1
  return `${prefix}-${String(seq).padStart(4, "0")}`
}

export interface ManualToroOrderInput {
  customerName: string
  customerEmail?: string | null
  customerPhone?: string | null
  customerCpfCnpj?: string | null
  items: ToroOrderItem[]
  subtotal: number
  shipping: number
  discount: number
  total: number
  paymentMethod?: string | null
  paymentStatus?: string
  orderStatus?: string
  notes?: string | null
  decrementStock?: boolean
}

export async function createManualToroOrder(input: ManualToroOrderInput): Promise<ToroOrderRow> {
  const customerName = input.customerName.trim()
  if (!customerName) throw new Error("Nome do cliente é obrigatório.")
  if (!input.items.length) throw new Error("Adicione ao menos um produto ao pedido.")

  for (const item of input.items) {
    if (!item.productId || !item.size || item.quantity <= 0) {
      throw new Error("Cada item precisa de produto, tamanho e quantidade válidos.")
    }
  }

  const orderNumber = await generateManualOrderNumber()
  const order = await createToroOrder({
    orderNumber,
    customerName,
    customerEmail: input.customerEmail?.trim() || null,
    customerPhone: input.customerPhone?.trim() || null,
    customerCpfCnpj: input.customerCpfCnpj?.trim() || null,
    items: input.items,
    subtotal: input.subtotal,
    shipping: input.shipping,
    discount: input.discount,
    total: input.total,
    paymentMethod: input.paymentMethod?.trim() || "manual",
    paymentStatus: input.paymentStatus ?? "approved",
    orderStatus: input.orderStatus ?? "paid",
    statusHistory: [
      {
        status: input.orderStatus ?? "paid",
        at: new Date().toISOString(),
        note: "Pedido registrado manualmente no painel",
      },
    ],
    metadata: {
      source: "manual",
      notes: input.notes?.trim() || null,
    },
  })

  if (input.decrementStock !== false) {
    for (const item of input.items) {
      try {
        await decrementProductStock(item.productId, item.size, item.quantity)
      } catch {
        // estoque best-effort
      }
    }
  }

  return order
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
