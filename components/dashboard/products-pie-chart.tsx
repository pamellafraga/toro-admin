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
    return results
  })

  return (
    <div className="glass rounded-xl p-6">
      <h3 className="mb-4 text-lg font-semibold text-foreground">Contratacoes por Produto</h3>
      <div className="h-60">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData || []}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={80}
              paddingAngle={5}
              dataKey="value"
            >
              {(chartData || []).map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                background: "#0a1128",
                border: "1px solid #1e3a5f",
                borderRadius: "8px",
                color: "#e2e8f0",
                fontSize: "12px",
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="flex flex-col gap-2 mt-2">
        {(chartData || []).map((item, i) => (
          <div key={item.name} className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full" style={{ background: COLORS[i] }} />
              <span className="text-muted-foreground">{item.name}</span>
            </div>
            <span className="font-medium text-foreground">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
