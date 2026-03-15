"use client"

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts"
import { createClient } from "@/lib/supabase/client"
import useSWR from "swr"

const COLORS = ["#0ea5e9", "#06b6d4", "#8b5cf6"]

export function ProductsPieChart() {
  const supabase = createClient()

  const { data: chartData } = useSWR("products-pie", async () => {
    const { data: products } = await supabase.from("products").select("id, name")
    if (!products) return []

    const results = await Promise.all(
      products.map(async (p) => {
        const { count } = await supabase
          .from("contracts")
          .select("*", { count: "exact", head: true })
          .eq("product_id", p.id)
          .in("status", ["active", "ativa"])
        return { name: p.name.replace("Gestao de ", ""), value: count || 0 }
      })
    )
    return results.filter((r) => r.value > 0)
  })

  return (
    <div className="glass rounded-xl p-6">
      <h3 className="mb-4 text-lg font-semibold text-foreground">Contratações por Produto</h3>
      <div className="h-60">
        {chartData && chartData.length > 0 ? (
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
                  boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            Nenhuma contratação ativa por produto
          </div>
        )}
      </div>
      <div className="flex flex-col gap-2 mt-2">
        {(chartData || []).map((item, i) => (
          <div key={`${item.name}-${i}`} className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full shrink-0" style={{ background: COLORS[i] }} />
              <span className="text-muted-foreground truncate">{item.name}</span>
            </div>
            <span className="font-medium text-foreground shrink-0">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
