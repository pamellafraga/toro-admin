import { z } from "zod"
import {
  createToroOrder,
  decrementProductStock,
  findOrderByNumber,
  type ToroOrderItem,
} from "@/lib/db/repositories/toro-orders.repository"
import { getToroProductBySlug } from "@/lib/products/catalog"

const orderItemSchema = z.object({
  productId: z.string().min(1),
  size: z.string().min(1),
  quantity: z.number().int().positive(),
  unitPrice: z.number().nonnegative(),
  productName: z.string().optional(),
})

const registerOrderSchema = z.object({
  id: z.string().min(1),
  userId: z.string().optional(),
  customerName: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  cpfCnpj: z.string().optional(),
  items: z.array(orderItemSchema).min(1),
  subtotal: z.number().nonnegative(),
  shipping: z.number().nonnegative(),
  discount: z.number().nonnegative().default(0),
  total: z.number().nonnegative(),
  couponCode: z.string().optional(),
  address: z.record(z.unknown()).optional(),
  paymentMethod: z.string().optional(),
  paymentStatus: z.string().optional(),
  status: z.string().optional(),
  trackingCode: z.string().optional(),
  statusHistory: z.array(z.record(z.unknown())).optional(),
  gatewayReference: z.string().optional(),
  pixExpiresAt: z.string().optional(),
})

export type RegisterOrderPayload = z.infer<typeof registerOrderSchema>

export async function registerOrderFromSite(body: unknown) {
  const parsed = registerOrderSchema.safeParse(body)
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? "Payload inválido.", status: 400 as const }
  }

  const data = parsed.data
  const existing = await findOrderByNumber(data.id)
  if (existing) {
    return { success: true as const, order: existing, duplicate: true }
  }

  const items: ToroOrderItem[] = data.items.map((item) => {
    const catalog = getToroProductBySlug(item.productId)
    return {
      productId: item.productId,
      productName: item.productName ?? catalog?.name,
      size: item.size,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
    }
  })

  const order = await createToroOrder({
    orderNumber: data.id,
    siteUserId: data.userId,
    customerName: data.customerName,
    customerEmail: data.email,
    customerPhone: data.phone,
    customerCpfCnpj: data.cpfCnpj,
    items,
    subtotal: data.subtotal,
    shipping: data.shipping,
    discount: data.discount,
    total: data.total,
    couponCode: data.couponCode,
    address: data.address,
    paymentMethod: data.paymentMethod,
    paymentStatus: data.paymentStatus ?? "pending",
    orderStatus: data.status ?? "pending_payment",
    trackingCode: data.trackingCode,
    statusHistory: data.statusHistory,
    metadata: {
      source: "toro-site",
      siteUrl: "https://toro-green.vercel.app",
      gatewayReference: data.gatewayReference,
      pixExpiresAt: data.pixExpiresAt,
    },
  })

  for (const item of items) {
    try {
      await decrementProductStock(item.productId, item.size, item.quantity)
    } catch {
      // estoque best-effort — pedido já registrado
    }
  }

  return { success: true as const, order, duplicate: false }
}
