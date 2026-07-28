import { queryMany, queryOne } from "@/lib/db/pool"
import { TORO_PRODUCT_CATALOG } from "@/lib/products/catalog"

const MONTH_LABELS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"] as const

export type DashboardOverview = {
  stats: {
    totalClients: number
    totalOrders: number
    totalProducts: number
    monthlyRevenue: number
  }
  revenueByMonth: { month: string; receita: number }[]
  salesByProduct: { name: string; value: number }[]
  recentActivities: {
    id: string
    user_name: string | null
    action: string
    entity_type: string | null
    created_at: string
  }[]
}

const EMPTY: DashboardOverview = {
  stats: {
    totalClients: 0,
    totalOrders: 0,
    totalProducts: TORO_PRODUCT_CATALOG.length,
    monthlyRevenue: 0,
  },
  revenueByMonth: MONTH_LABELS.map((month) => ({ month, receita: 0 })),
  salesByProduct: [],
  recentActivities: [],
}

/** Dashboard Toro — apenas pedidos e clientes da loja online (ignora legado Xpress). */
export async function getDashboardOverview(): Promise<DashboardOverview> {
  try {
    const [ordersRow, clientsRow, revenueRow] = await Promise.all([
      queryOne<{ count: string }>(`SELECT COUNT(*)::text AS count FROM toro_orders`),
      queryOne<{ count: string }>(
        `SELECT COUNT(DISTINCT customer_email)::text AS count
         FROM toro_orders
         WHERE customer_email IS NOT NULL AND trim(customer_email) <> ''`,
      ),
      queryOne<{ total: string }>(
        `SELECT COALESCE(SUM(total), 0)::text AS total
         FROM toro_orders
         WHERE payment_status IN ('approved', 'pending')`,
      ),
    ])

    const revenueRows = await queryMany<{ month: number; receita: string }>(
      `SELECT EXTRACT(MONTH FROM created_at)::int AS month,
              COALESCE(SUM(total), 0)::text AS receita
       FROM toro_orders
       WHERE payment_status IN ('approved', 'pending')
         AND created_at >= date_trunc('year', CURRENT_DATE)
       GROUP BY 1
       ORDER BY 1`,
    )

    const revenueMap = new Map(revenueRows.map((r) => [r.month, Number(r.receita)]))
    const revenueByMonth = MONTH_LABELS.map((label, i) => ({
      month: label,
      receita: revenueMap.get(i + 1) ?? 0,
    }))

    const productRows = await queryMany<{ name: string; value: string }>(
      `SELECT COALESCE(NULLIF(trim(item->>'productName'), ''), item->>'productId') AS name,
              SUM((item->>'quantity')::int)::text AS value
       FROM toro_orders o,
            LATERAL jsonb_array_elements(o.items) AS item
       GROUP BY 1
       HAVING SUM((item->>'quantity')::int) > 0
       ORDER BY SUM((item->>'quantity')::int) DESC`,
    )

    let recentActivities: DashboardOverview["recentActivities"] = []
    try {
      recentActivities = await queryMany(
        `SELECT id, user_name, action, entity_type, created_at::text
         FROM activity_log
         WHERE entity_type IN ('toro_order', 'toro_product', 'toro_client')
            OR action ILIKE '%toro%'
         ORDER BY created_at DESC
         LIMIT 8`,
      )
    } catch {
      recentActivities = []
    }

    return {
      stats: {
        totalClients: Number(clientsRow?.count ?? 0),
        totalOrders: Number(ordersRow?.count ?? 0),
        totalProducts: TORO_PRODUCT_CATALOG.length,
        monthlyRevenue: Number(revenueRow?.total ?? 0),
      },
      revenueByMonth,
      salesByProduct: productRows.map((r) => ({
        name: r.name,
        value: Number(r.value),
      })),
      recentActivities,
    }
  } catch {
    return EMPTY
  }
}
