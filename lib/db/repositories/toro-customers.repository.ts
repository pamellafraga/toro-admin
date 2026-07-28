import { queryMany } from "@/lib/db/pool"

export type StoreCustomerSegment = "comprou" | "pendente" | "recorrente" | "cancelado" | "novo"

export interface StoreCustomerRow {
  customer_key: string
  name: string | null
  email: string | null
  phone: string | null
  cpf_cnpj: string | null
  order_count: number
  paid_count: number
  total_spent: number
  last_order_at: string
  last_order_number: string | null
  last_order_status: string | null
  last_payment_status: string | null
  last_order_total: number
}

export function computeStoreCustomerSegment(row: StoreCustomerRow): StoreCustomerSegment {
  if (row.paid_count >= 2) return "recorrente"
  if (row.paid_count >= 1) return "comprou"
  if (row.last_order_status === "cancelled" || row.last_payment_status === "rejected") return "cancelado"
  if (row.last_payment_status === "pending" || row.last_order_status === "pending_payment") return "pendente"
  return "novo"
}

function customerKey(order: {
  customer_email: string | null
  customer_cpf_cnpj: string | null
  order_number: string
}): string {
  const email = order.customer_email?.trim().toLowerCase()
  if (email) return email
  const cpf = order.customer_cpf_cnpj?.replace(/\D/g, "")
  if (cpf) return cpf
  return `pedido-${order.order_number}`
}

export async function listStoreCustomers(): Promise<StoreCustomerRow[]> {
  const orders = await queryMany<{
    order_number: string
    customer_name: string | null
    customer_email: string | null
    customer_phone: string | null
    customer_cpf_cnpj: string | null
    payment_status: string
    order_status: string
    total: number
    created_at: string
  }>(`
    SELECT order_number, customer_name, customer_email, customer_phone, customer_cpf_cnpj,
           payment_status, order_status, total, created_at
    FROM toro_orders
    ORDER BY created_at DESC
    LIMIT 5000
  `)

  const map = new Map<string, StoreCustomerRow & { _orders: typeof orders }>()

  for (const o of orders) {
    const key = customerKey(o)
    let row = map.get(key)
    if (!row) {
      row = {
        customer_key: key,
        name: o.customer_name,
        email: o.customer_email?.trim() || null,
        phone: o.customer_phone?.trim() || null,
        cpf_cnpj: o.customer_cpf_cnpj?.trim() || null,
        order_count: 0,
        paid_count: 0,
        total_spent: 0,
        last_order_at: o.created_at,
        last_order_number: o.order_number,
        last_order_status: o.order_status,
        last_payment_status: o.payment_status,
        last_order_total: Number(o.total),
        _orders: [],
      }
      map.set(key, row)
    }

    row.order_count += 1
    if (o.payment_status === "approved") {
      row.paid_count += 1
      row.total_spent += Number(o.total)
    }
    if (o.customer_name && !row.name) row.name = o.customer_name
    if (o.customer_email?.trim() && !row.email) row.email = o.customer_email.trim()
    if (o.customer_phone?.trim() && !row.phone) row.phone = o.customer_phone.trim()
    if (o.customer_cpf_cnpj?.trim() && !row.cpf_cnpj) row.cpf_cnpj = o.customer_cpf_cnpj.trim()
    row._orders.push(o)
  }

  return Array.from(map.values())
    .map(({ _orders, ...row }) => row)
    .sort((a, b) => (a.last_order_at < b.last_order_at ? 1 : -1))
}
