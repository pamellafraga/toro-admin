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

export async function listStoreCustomers(): Promise<StoreCustomerRow[]> {
  const rows = await queryMany<StoreCustomerRow>(`
    WITH base AS (
      SELECT
        *,
        COALESCE(
          NULLIF(lower(trim(customer_email)), ''),
          NULLIF(regexp_replace(COALESCE(customer_cpf_cnpj, ''), '[^0-9]', '', 'g'), ''),
          'pedido-' || order_number
        ) AS customer_key
      FROM toro_orders
    )
    SELECT
      customer_key,
      MAX(customer_name) AS name,
      MAX(NULLIF(trim(customer_email), '')) AS email,
      MAX(NULLIF(trim(customer_phone), '')) AS phone,
      MAX(NULLIF(trim(customer_cpf_cnpj), '')) AS cpf_cnpj,
      COUNT(*)::int AS order_count,
      COUNT(*) FILTER (WHERE payment_status = 'approved')::int AS paid_count,
      COALESCE(SUM(CASE WHEN payment_status = 'approved' THEN total ELSE 0 END), 0)::float AS total_spent,
      MAX(created_at)::text AS last_order_at,
      (array_agg(order_number ORDER BY created_at DESC))[1] AS last_order_number,
      (array_agg(order_status ORDER BY created_at DESC))[1] AS last_order_status,
      (array_agg(payment_status ORDER BY created_at DESC))[1] AS last_payment_status,
      (array_agg(total ORDER BY created_at DESC))[1]::float AS last_order_total
    FROM base
    GROUP BY customer_key
    ORDER BY MAX(created_at) DESC
    LIMIT 5000
  `)
  return rows
}
