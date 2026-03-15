"use client"

import { useState, useMemo } from "react"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/lib/auth-context"
import { Percent, ShieldAlert, Calendar, User, Hash, DollarSign, Gift } from "lucide-react"
import useSWR from "swr"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"

const COMERCIAL_PREFIX = "Comercial - "

type Row = {
  origem: string
  nomeComercial: string
  vendas: number
  valorVendido: number
}

function getMonthBounds(ano: number, mes: number) {
  const start = new Date(ano, mes - 1, 1)
  const end = new Date(ano, mes, 0, 23, 59, 59, 999)
  return { start: start.toISOString(), end: end.toISOString() }
}

export default function ComissoesPage() {
  const { isAdmin } = useAuth()
  const supabase = createClient()
  const now = new Date()
  const [ano, setAno] = useState(now.getFullYear())
  const [mes, setMes] = useState(now.getMonth() + 1)
  const [percentualBonus, setPercentualBonus] = useState(10)

  const { start, end } = useMemo(() => getMonthBounds(ano, mes), [ano, mes])

  const { data: contracts, isLoading } = useSWR(
    isAdmin ? ["comissoes-contracts", start, end] : null,
    async () => {
      const { data } = await supabase
        .from("contracts")
        .select("id, origem_comercial, monthly_value, created_at")
        .gte("created_at", start)
        .lte("created_at", end)
      return (data || []) as { id: string; origem_comercial: string | null; monthly_value: number; created_at: string }[]
    }
  )

  const rows: Row[] = useMemo(() => {
    if (!contracts) return []
    const byOrigin: Record<string, { count: number; valor: number }> = {}
    for (const c of contracts) {
      const orig = (c.origem_comercial || "").trim()
      if (!orig) continue
      if (!byOrigin[orig]) byOrigin[orig] = { count: 0, valor: 0 }
      byOrigin[orig].count += 1
      byOrigin[orig].valor += Number(c.monthly_value ?? 0)
    }
    return Object.entries(byOrigin)
      .map(([origem, { count, valor }]) => ({
        origem,
        nomeComercial: origem.startsWith(COMERCIAL_PREFIX) ? origem.slice(COMERCIAL_PREFIX.length) : origem,
        vendas: count,
        valorVendido: valor,
      }))
      .sort((a, b) => b.valorVendido - a.valorVendido)
  }, [contracts])

  const totalVendas = rows.reduce((s, r) => s + r.vendas, 0)
  const totalValor = rows.reduce((s, r) => s + r.valorVendido, 0)
  const totalPremio = rows.reduce((s, r) => s + (r.valorVendido * percentualBonus) / 100, 0)

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <ShieldAlert className="h-16 w-16 text-muted-foreground/20 mb-4" />
        <h2 className="text-xl font-bold text-foreground mb-2">Acesso restrito</h2>
        <p className="text-muted-foreground">Apenas administradores podem ver o módulo de Comissões.</p>
      </div>
    )
  }

  const meses = Array.from({ length: 12 }, (_, i) => ({ value: i + 1, label: format(new Date(2024, i, 1), "MMMM", { locale: ptBR }) }))
  const anos = Array.from({ length: 5 }, (_, i) => now.getFullYear() - i)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Percent className="h-7 w-7 text-primary" />
          Comissões
        </h1>
        <p className="text-muted-foreground mt-1">
          Cálculo de vendas por comercial no mês e bônus (% sobre o valor vendido).
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden glass">
        <div className="p-4 border-b border-border bg-primary/5 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-foreground">Mês/ano</span>
            <select
              value={mes}
              onChange={(e) => setMes(Number(e.target.value))}
              className="h-9 rounded-lg border border-input bg-background px-3 text-sm"
            >
              {meses.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
            <select
              value={ano}
              onChange={(e) => setAno(Number(e.target.value))}
              className="h-9 rounded-lg border border-input bg-background px-3 text-sm"
            >
              {anos.map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <Percent className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-foreground">% bônus (global)</span>
            <input
              type="number"
              min={0}
              max={100}
              step={0.5}
              value={percentualBonus}
              onChange={(e) => setPercentualBonus(Number(e.target.value) || 0)}
              className="h-9 w-20 rounded-lg border border-input bg-background px-3 text-sm"
            />
            <span className="text-sm text-muted-foreground">%</span>
          </div>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground">Carregando...</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-primary/5">
                    <th className="text-left font-semibold text-foreground py-3 px-4 flex items-center gap-1.5">
                      <User className="h-4 w-4" /> Comercial
                    </th>
                    <th className="text-right font-semibold text-foreground py-3 px-4">
                      <span className="flex items-center justify-end gap-1.5"><Hash className="h-4 w-4" /> Nº vendas</span>
                    </th>
                    <th className="text-right font-semibold text-foreground py-3 px-4">
                      <span className="flex items-center justify-end gap-1.5"><DollarSign className="h-4 w-4" /> Valor vendido</span>
                    </th>
                    <th className="text-right font-semibold text-foreground py-3 px-4">% bônus</th>
                    <th className="text-right font-semibold text-foreground py-3 px-4">
                      <span className="flex items-center justify-end gap-1.5"><Gift className="h-4 w-4" /> Prêmio total</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-muted-foreground">
                        Nenhuma venda com origem comercial neste mês.
                      </td>
                    </tr>
                  ) : (
                    rows.map((r, i) => (
                      <tr
                        key={r.origem}
                        className={cn(
                          "border-b border-border/60",
                          i % 2 === 0 ? "bg-muted/20" : "bg-background/50",
                          "hover:bg-primary/5"
                        )}
                      >
                        <td className="py-3 px-4 font-medium text-foreground">{r.nomeComercial}</td>
                        <td className="py-3 px-4 text-right text-foreground">{r.vendas}</td>
                        <td className="py-3 px-4 text-right text-foreground">
                          {r.valorVendido.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                        </td>
                        <td className="py-3 px-4 text-right text-muted-foreground">{percentualBonus}%</td>
                        <td className="py-3 px-4 text-right font-medium text-primary">
                          {((r.valorVendido * percentualBonus) / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                {rows.length > 0 && (
                  <tfoot>
                    <tr className="border-t-2 border-primary/30 bg-primary/5 font-semibold">
                      <td className="py-3 px-4 text-foreground">Total</td>
                      <td className="py-3 px-4 text-right text-foreground">{totalVendas}</td>
                      <td className="py-3 px-4 text-right text-foreground">
                        {totalValor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                      </td>
                      <td className="py-3 px-4 text-right text-muted-foreground">{percentualBonus}%</td>
                      <td className="py-3 px-4 text-right text-primary">
                        {totalPremio.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
