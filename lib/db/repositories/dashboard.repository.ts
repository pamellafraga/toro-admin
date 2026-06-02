import { queryMany, queryOne } from "@/lib/db/pool"

const MONTH_LABELS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"] as const

export type DashboardOverview = {
  stats: {
    totalClients: number
    trialsInProgress: number
    activeTools: number
    activeContracts: number
    totalContracts: number
    monthlyRevenue: number
  }
  revenueByMonth: { month: string; receita: number }[]
  contractsByProduct: { name: string; value: number }[]
  recentActivities: {
    id: string
    user_name: string | null
    action: string
    entity_type: string | null
    created_at: string
  }[]
}

export async function getDashboardOverview(): Promise<DashboardOverview> {
  const [clientsRow, trialsRow, toolsRow, activeRow, totalRow, revenueRow] = await Promise.all([
    queryOne<{ count: string }>(`SELECT COUNT(*)::text AS count FROM clients`),
    queryOne<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM contracts WHERE lower(trim(status)) = 'trial'`,
    ),
    queryOne<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM products
       WHERE COALESCE(product_status, 'no_ar') = 'no_ar' AND COALESCE(is_active, true) = true`,
    ),
    queryOne<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM contracts
       WHERE lower(trim(status)) IN ('active', 'ativa')`,
    ),
    queryOne<{ count: string }>(`SELECT COUNT(*)::text AS count FROM contracts`),
    queryOne<{ total: string }>(
      `SELECT COALESCE(SUM(monthly_value), 0)::text AS total FROM contracts
       WHERE lower(trim(payment_status)) IN ('em_dia', 'paid')
         AND lower(trim(status)) IN ('active', 'ativa')`,
    ),
  ])

  const revenueRows = await queryMany<{ month: number; receita: string }>(
    `SELECT EXTRACT(MONTH FROM created_at)::int AS month,
            COALESCE(SUM(monthly_value), 0)::text AS receita
     FROM contracts
     WHERE lower(trim(payment_status)) IN ('em_dia', 'paid')
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
    `SELECT p.name, COUNT(c.id)::text AS value
     FROM products p
     INNER JOIN contracts c ON c.product_id = p.id
       AND lower(trim(c.status)) IN ('active', 'ativa', 'trial', 'aguardando_produto')
     GROUP BY p.id, p.name
     HAVING COUNT(c.id) > 0
     ORDER BY COUNT(c.id) DESC`,
  )

  const activities = await queryMany<{
    id: string
    user_name: string | null
    action: string
    entity_type: string | null
    created_at: string
  }>(
    `SELECT id, user_name, action, entity_type, created_at::text
     FROM activity_log
     ORDER BY created_at DESC
     LIMIT 8`,
  )

  return {
    stats: {
      totalClients: Number(clientsRow?.count ?? 0),
      trialsInProgress: Number(trialsRow?.count ?? 0),
      activeTools: Number(toolsRow?.count ?? 0),
      activeContracts: Number(activeRow?.count ?? 0),
      totalContracts: Number(totalRow?.count ?? 0),
      monthlyRevenue: Number(revenueRow?.total ?? 0),
    },
    revenueByMonth,
    contractsByProduct: productRows.map((r) => ({
      name: r.name.replace(/^Gestao de /i, "").trim(),
      value: Number(r.value),
    })),
    recentActivities: activities,
  }
}
