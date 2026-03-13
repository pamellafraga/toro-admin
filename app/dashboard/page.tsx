"use client"

import { useAuth } from "@/lib/auth-context"
import { createClient } from "@/lib/supabase/client"
import { StatCard } from "@/components/dashboard/stat-card"
import { UserCards } from "@/components/dashboard/user-cards"
import { RevenueChart } from "@/components/dashboard/revenue-chart"
import { ProductsPieChart } from "@/components/dashboard/products-pie-chart"
import { RecentActivity } from "@/components/dashboard/recent-activity"
import { Users, Package, FileText, TrendingUp } from "lucide-react"
import useSWR from "swr"

export default function DashboardHome() {
  const { isAdmin, hasPermission } = useAuth()
  const supabase = createClient()

  const { data: stats } = useSWR("dashboard-stats", async () => {
    const [clientsRes, contractsRes, productsRes] = await Promise.all([
      supabase.from("clients").select("*", { count: "exact", head: true }),
      supabase.from("contracts").select("*", { count: "exact", head: true }),
      supabase.from("products").select("*", { count: "exact", head: true }),
    ])
    const { count: activeContracts } = await supabase
      .from("contracts")
      .select("*", { count: "exact", head: true })
      .in("status", ["active", "ativa"])
    const { data: contractsForRevenue } = await supabase
      .from("contracts")
      .select("monthly_value, payment_status")
    const totalRevenue = (contractsForRevenue ?? []).reduce((sum, c) => {
      const p = (c.payment_status ?? "").toString().toLowerCase()
      if (p !== "em_dia" && p !== "paid") return sum
      return sum + Number(c.monthly_value ?? 0)
    }, 0)

    return {
      totalClients: clientsRes.count || 0,
      totalContracts: contractsRes.count || 0,
      activeContracts: activeContracts || 0,
      totalProducts: productsRes.count || 0,
      monthlyRevenue: totalRevenue,
    }
  })

  return (
    <div className="flex flex-col gap-6">
      {/* Stats Row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Clientes Ativos"
          value={stats?.totalClients || 0}
          icon={Users}
          trend={{ value: 12, positive: true }}
        />
        <StatCard
          title="Contratacoes Ativas"
          value={stats?.activeContracts || 0}
          subtitle={`${stats?.totalContracts || 0} totais`}
          icon={FileText}
          trend={{ value: 8, positive: true }}
        />
        <StatCard
          title="Produtos"
          value={stats?.totalProducts || 0}
          icon={Package}
        />
        <StatCard
          title="Receita Mensal"
          value={`R$ ${(stats?.monthlyRevenue || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
          icon={TrendingUp}
          trend={{ value: 15, positive: true }}
        />
      </div>

      {/* Charts Row */}
      {hasPermission("produtos") && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <RevenueChart />
          </div>
          <ProductsPieChart />
        </div>
      )}

      {/* Users + Activity */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {isAdmin && (
          <div className="lg:col-span-2">
            <UserCards />
          </div>
        )}
        <div className={isAdmin ? "" : "lg:col-span-3"}>
          <RecentActivity />
        </div>
      </div>
    </div>
  )
}
