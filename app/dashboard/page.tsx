"use client"

import { useAuth } from "@/lib/auth-context"
import { createClient } from "@/lib/supabase/client"
import { StatCard } from "@/components/dashboard/stat-card"
import { RevenueChart } from "@/components/dashboard/revenue-chart"
import { ProductsPieChart } from "@/components/dashboard/products-pie-chart"
import { RecentActivity } from "@/components/dashboard/recent-activity"
import { Users, Package, FileText, TrendingUp } from "lucide-react"
import useSWR from "swr"

export default function DashboardHome() {
  const { hasPermission, profile } = useAuth()
  const supabase = createClient()
  const userName = profile?.name || "Usuário"

  const { data: stats } = useSWR("dashboard-stats", async () => {
    const [clientsRes, contractsRes, productsRes] = await Promise.all([
      supabase.from("clients").select("*", { count: "exact", head: true }),
      supabase.from("contracts").select("*", { count: "exact", head: true }),
      supabase.from("products").select("*", { count: "exact", head: true }).eq("is_active", true),
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
      totalClients: clientsRes.count ?? 0,
      totalContracts: contractsRes.count ?? 0,
      activeContracts: activeContracts ?? 0,
      totalProducts: productsRes.count ?? 0,
      monthlyRevenue: totalRevenue,
    }
  })

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Olá, {userName}</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Aqui está o resumo do seu painel.</p>
      </div>
      {/* Stats Row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Clientes Ativos"
          value={stats?.totalClients ?? 0}
          icon={Users}
        />
        <StatCard
          title="Contratações Ativas"
          value={stats?.activeContracts ?? 0}
          subtitle={`${stats?.totalContracts ?? 0} totais`}
          icon={FileText}
        />
        <StatCard
          title="Produtos"
          value={stats?.totalProducts ?? 0}
          icon={Package}
        />
        <StatCard
          title="Receita Mensal"
          value={`R$ ${(stats?.monthlyRevenue ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
          icon={TrendingUp}
          valueClassName="text-primary"
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

      {/* Atividades Recentes */}
      <div>
        <RecentActivity />
      </div>
    </div>
  )
}
