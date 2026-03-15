"use client"

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"

const mockData = [
  { month: "Jan", receita: 8500 },
  { month: "Fev", receita: 12000 },
  { month: "Mar", receita: 15500 },
  { month: "Abr", receita: 14000 },
  { month: "Mai", receita: 18500 },
  { month: "Jun", receita: 22000 },
  { month: "Jul", receita: 21000 },
  { month: "Ago", receita: 25500 },
  { month: "Set", receita: 28000 },
  { month: "Out", receita: 30000 },
  { month: "Nov", receita: 32500 },
  { month: "Dez", receita: 35000 },
]

export function RevenueChart() {
  return (
    <div className="glass rounded-xl p-6">
      <h3 className="mb-4 text-lg font-semibold text-foreground">Receita Mensal</h3>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={mockData} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
            <defs>
              <linearGradient id="colorReceita" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis dataKey="month" stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
            <YAxis stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `R$ ${(v/1000).toFixed(0)}k`} />
            <Tooltip
              contentStyle={{
                background: "var(--card)",
                border: "1px solid var(--border)",
                borderRadius: "8px",
                color: "var(--card-foreground)",
                fontSize: "12px",
                boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
              }}
              formatter={(value: number) => [`R$ ${value.toLocaleString("pt-BR")}`, "Receita"]}
            />
            <Area type="monotone" dataKey="receita" stroke="#0ea5e9" strokeWidth={2} fill="url(#colorReceita)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
