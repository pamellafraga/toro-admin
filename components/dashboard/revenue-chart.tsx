"use client"

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import useSWR from "swr"
import { fetchDashboardOverview } from "@/lib/dashboard/fetch-overview"

export function RevenueChart() {
  const { data } = useSWR("dashboard-overview", fetchDashboardOverview)
  const chartData = data?.revenueByMonth ?? []

  return (
    <div className="glass rounded-xl p-6">
      <h3 className="mb-4 text-lg font-semibold text-foreground">Receita Mensal</h3>
      <div className="h-72">
        {chartData.some((d) => d.receita > 0) ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
              <defs>
                <linearGradient id="colorReceita" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="month" stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis
                stroke="var(--muted-foreground)"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => (v >= 1000 ? `R$ ${(v / 1000).toFixed(0)}k` : `R$ ${v}`)}
              />
              <Tooltip
                contentStyle={{
                  background: "var(--card)",
                  border: "1px solid var(--border)",
                  borderRadius: "8px",
                  color: "var(--card-foreground)",
                  fontSize: "12px",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                }}
                formatter={(value: number) => [
                  `R$ ${Number(value).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
                  "Receita",
                ]}
              />
              <Area type="monotone" dataKey="receita" stroke="var(--primary)" strokeWidth={2} fill="url(#colorReceita)" />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            Sem receita registrada neste ano
          </div>
        )}
      </div>
    </div>
  )
}
