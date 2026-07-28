import { queryMany, queryOne } from "@/lib/db/pool"
import { TORO_PRODUCT_CATALOG } from "@/lib/products/catalog"
import type { ToroOrderItem } from "@/lib/db/repositories/toro-orders.repository"

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

function parseOrderItems(raw: unknown): ToroOrderItem[] {
  if (Array.isArray(raw)) return raw as ToroOrderItem[]
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }
  return []
}

/** Dashboard Toro — pedidos e clientes da loja online */
export async function getDashboardOverview(): Promise<DashboardOverview> {
  try {
    const [ordersRow, clientsRow, revenueRow] = await Promise.all([
      queryOne<{ count: string }>(`SELECT CAST(COUNT(*) AS CHAR) AS count FROM toro_orders`),
      queryOne<{ count: string }>(
        `SELECT CAST(COUNT(DISTINCT customer_email) AS CHAR) AS count
         FROM toro_orders
         WHERE customer_email IS NOT NULL AND TRIM(customer_email) <> ''`,
      ),
      queryOne<{ total: string }>(
        `SELECT CAST(COALESCE(SUM(total), 0) AS CHAR) AS total
         FROM toro_orders
         WHERE payment_status IN ('approved', 'pending')`,
      ),
    ])

    const revenueRows = await queryMany<{ month: number; receita: string }>(
      `SELECT MONTH(created_at) AS month,
              CAST(COALESCE(SUM(total), 0) AS CHAR) AS receita
       FROM toro_orders
       WHERE payment_status IN ('approved', 'pending')
         AND created_at >= DATE_FORMAT(CURRENT_DATE, '%Y-01-01')
       GROUP BY MONTH(created_at)
       ORDER BY MONTH(created_at)`,
    )

    const revenueMap = new Map(revenueRows.map((r) => [Number(r.month), Number(r.receita)]))
    const revenueByMonth = MONTH_LABELS.map((label, i) => ({
      month: label,
      receita: revenueMap.get(i + 1) ?? 0,
    }))

    const orderRows = await queryMany<{ items: unknown }>(
      `SELECT items FROM toro_orders WHERE JSON_LENGTH(items) > 0`,
    )
    const productTotals = new Map<string, number>()
    for (const row of orderRows) {
      for (const item of parseOrderItems(row.items)) {
        const name = (item.productName?.trim() || item.productId || "Produto").trim()
        const qty = Number(item.quantity) || 0
        if (qty <= 0) continue
        productTotals.set(name, (productTotals.get(name) ?? 0) + qty)
      }
    }
    const salesByProduct = Array.from(productTotals.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)

    let recentActivities: DashboardOverview["recentActivities"] = []
    try {
      recentActivities = await queryMany(
        `SELECT id, user_name, action, entity_type, CAST(created_at AS CHAR) AS created_at
         FROM activity_log
         WHERE entity_type IN ('toro_order', 'toro_product', 'toro_client')
            OR action LIKE '%toro%'
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
      salesByProduct,
      recentActivities,
    }
  } catch {
    return EMPTY
  }
}
