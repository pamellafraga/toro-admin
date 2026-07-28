"use client"

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts"
import useSWR from "swr"
import { fetchDashboardOverview } from "@/lib/dashboard/fetch-overview"

/** Paleta Toro: Obsidian, Nude, Ivory, Off white, muted */
const COLORS = ["#101010", "#E3DBCC", "#F3F0E9", "#8a8278", "#5c5c5c", "#C4BAA8"]

export function ProductsPieChart() {
  const { data } = useSWR("dashboard-overview", fetchDashboardOverview)
  const chartData = data?.salesByProduct ?? []

  return (
    <div className="glass rounded-xl p-6">
      <h3 className="mb-4 text-lg font-semibold text-foreground">Vendas por Produto</h3>
      <div className="h-60">
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
              >
                {chartData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: "var(--card)",
                  border: "1px solid var(--border)",
                  borderRadius: "8px",
                  color: "var(--card-foreground)",
                  fontSize: "12px",
                  boxShadow: "0 4px 12px rgba(16, 16, 16, 0.08)",
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground text-center px-4">
            Nenhuma venda registrada ainda
          </div>
        )}
      </div>
      <div className="flex flex-col gap-2 mt-2">
        {chartData.map((item, i) => (
          <div key={`${item.name}-${i}`} className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 min-w-0">
              <span className="h-3 w-3 rounded-full shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
              <span className="text-muted-foreground truncate">{item.name}</span>
            </div>
            <span className="font-medium text-foreground shrink-0 ml-2">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
