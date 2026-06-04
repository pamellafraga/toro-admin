"use client"

import { useAuth } from "@/lib/auth-context"
import { StatCard } from "@/components/dashboard/stat-card"
import { RevenueChart } from "@/components/dashboard/revenue-chart"
import { ProductsPieChart } from "@/components/dashboard/products-pie-chart"
import { RecentActivity } from "@/components/dashboard/recent-activity"
import { Users, Package, FileText, TrendingUp, Clock } from "lucide-react"
import useSWR from "swr"
import { fetchDashboardOverview } from "@/lib/dashboard/fetch-overview"

export default function DashboardHome() {
  const { hasPermission, profile } = useAuth()
  const userName = profile?.name || "Usuário"

  const { data } = useSWR("dashboard-overview", fetchDashboardOverview)
  const stats = data?.stats

  return (
    <div className="flex flex-col gap-4 lg:gap-6">
      <div>
        <h2 className="text-xl font-bold text-foreground lg:text-2xl">Olá, {userName}</h2>
        <p className="mt-0.5 text-xs text-muted-foreground lg:text-sm">Aqui está o resumo do seu painel.</p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
        <StatCard
          title="Contatos"
          value={stats?.totalClients ?? 0}
          subtitle="Ver todos os contatos"
          icon={Users}
          href={hasPermission("clientes") ? "/dashboard/clientes" : undefined}
        />
        <StatCard
          title="Testes em andamento"
          value={stats?.trialsInProgress ?? 0}
          subtitle="LicitaPregão e demais produtos"
          icon={Clock}
          href={hasPermission("produtos") ? "/dashboard/produtos/liticapro" : undefined}
        />
        <StatCard
          title="Ferramentas ativas"
          value={stats?.activeTools ?? 0}
          subtitle="Produtos no ar"
          icon={Package}
          href={hasPermission("produtos") ? "/dashboard/produtos" : undefined}
        />
        <StatCard
          title="Receita Mensal"
          value={`R$ ${(stats?.monthlyRevenue ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
          subtitle={`${stats?.activeContracts ?? 0} contratações ativas · ${stats?.totalContracts ?? 0} totais`}
          icon={TrendingUp}
          valueClassName="text-primary"
          href={
            hasPermission("financeiro")
              ? "/dashboard/financeiro"
              : hasPermission("produtos")
                ? "/dashboard/produtos"
                : undefined
          }
        />
      </div>

      {hasPermission("produtos") && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <RevenueChart />
          </div>
          <ProductsPieChart />
        </div>
      )}

      {!hasPermission("produtos") && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <StatCard
            title="Contratações ativas"
            value={stats?.activeContracts ?? 0}
            subtitle={`${stats?.totalContracts ?? 0} contratos no total`}
            icon={FileText}
            href={hasPermission("produtos") ? "/dashboard/produtos" : undefined}
          />
        </div>
      )}

      <div>
        <RecentActivity />
      </div>
    </div>
  )
}
