"use client"

import { Monitor } from "lucide-react"
import Link from "next/link"

const PRODUCTS = [
  {
    id: "1",
    slug: "software-gestao-apolice-seguro",
    name: "Software de Gestão",
    description: "Apólice de Seguro - Modalidade Garantias",
    Icon: Monitor,
    color: "from-sky-500/20 to-sky-600/5 border-sky-500/20",
    active: 0,
    inactive: 0,
    total: 0,
    monthlyValue: "R$ 0,00",
  },
]

export default function ProdutosPage() {
  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-foreground">Produtos</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Gerenciar produtos para locação e visualizar contratações
        </p>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {PRODUCTS.map((product) => {
          const { Icon } = product
          return (
            <Link key={product.id} href={`/dashboard/produtos/${product.slug}`}>
              <div
                className={`group glass rounded-xl border bg-gradient-to-br ${product.color} p-6 hover:glow-blue transition-all cursor-pointer`}
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 group-hover:bg-primary/20 transition-colors mb-4">
                  <Icon className="h-6 w-6 text-primary" />
                </div>

                <h3 className="text-lg font-bold text-foreground mb-1">{product.name}</h3>
                <p className="text-sm text-muted-foreground mb-4">{product.description}</p>

                <div className="flex items-center gap-6 pt-4 border-t border-border/50">
                  <div className="text-center">
                    <p className="text-xl font-bold text-sky-400">{product.active}</p>
                    <p className="text-xs text-muted-foreground">Ativos</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xl font-bold text-muted-foreground">{product.inactive}</p>
                    <p className="text-xs text-muted-foreground">Inativos</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xl font-bold text-foreground">{product.total}</p>
                    <p className="text-xs text-muted-foreground">Total</p>
                  </div>
                </div>
              </div>
            </Link>
          )
        })}
      </div>

      {/* Table */}
      <div className="glass rounded-xl border border-border/50 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/50 bg-muted/20">
              <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Produto
              </th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Contratos Ativos
              </th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Valor Mensal
              </th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Status
              </th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Ação
              </th>
            </tr>
          </thead>
          <tbody>
            {PRODUCTS.map((product, index) => (
              <tr
                key={product.id}
                className={`cursor-pointer hover:bg-muted/10 transition-colors ${
                  index < PRODUCTS.length - 1 ? "border-b border-border/30" : ""
                }`}
                onClick={() => {
                  window.location.href = `/dashboard/produtos/${product.slug}`
                }}
              >
                <td className="px-6 py-4 font-semibold text-foreground underline-offset-2 hover:underline">
                  {product.name}
                </td>
                <td className="px-6 py-4 text-foreground">{product.active}</td>
                <td className="px-6 py-4 text-foreground">{product.monthlyValue}</td>
                <td className="px-6 py-4">
                  <span className="inline-flex items-center rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-400 border border-emerald-500/30">
                    Ativo
                  </span>
                </td>
                <td className="px-6 py-4">
                  <Link href={`/dashboard/produtos/${product.slug}`}>
                    <button className="rounded-lg border border-border/50 bg-muted/20 px-4 py-1.5 text-xs font-medium text-foreground hover:bg-muted/40 transition-colors">
                      Ver assinantes
                    </button>
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
