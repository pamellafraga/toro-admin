"use client"

import { Monitor, Loader2 } from "lucide-react"
import Link from "next/link"
import useSWR, { useSWRConfig } from "swr"
import { toast } from "sonner"

const SLUG = "software-gestao-apolice-seguro"

type ProductStatus = "no_ar" | "pausado" | "desativado"

const PRODUCT_STATUS_OPTIONS: { value: ProductStatus; label: string }[] = [
  { value: "no_ar", label: "No ar" },
  { value: "pausado", label: "Pausado" },
  { value: "desativado", label: "Desativado" },
]

function countByStatus(contracts: { status: string }[]) {
  const ativos = contracts.filter((c) => c.status === "ativa" || c.status === "active").length
  const aguardando = contracts.filter((c) => c.status === "aguardando_produto").length
  const inativos = contracts.filter((c) => c.status !== "ativa" && c.status !== "active" && c.status !== "aguardando_produto").length
  return { ativos, aguardando, inativos }
}

export default function ProdutosPage() {
  const { mutate } = useSWRConfig()
  const { data, isLoading } = useSWR(`api-contracts-${SLUG}`, async () => {
    const res = await fetch(`/api/products/${SLUG}/contracts`)
    const json = await res.json()
    return json as {
      product: { id: string; name: string; description: string; product_status?: string } | null
      contracts: { status: string; monthly_value: number }[]
    }
  })

  const contracts = data?.contracts ?? []
  const product = data?.product
  const { ativos, aguardando, inativos } = countByStatus(contracts)
  const total = contracts.length
  const monthlyValue = contracts
    .filter((c) => c.status === "ativa" || c.status === "active" || c.status === "aguardando_produto")
    .reduce((sum, c) => sum + Number(c.monthly_value), 0)
  const monthlyValueStr = `R$ ${monthlyValue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`

  const productStatus = (product?.product_status as ProductStatus) ?? "no_ar"
  const productRow = {
    id: product?.id ?? "1",
    slug: SLUG,
    name: product?.name ?? "Software de Gestão",
    description: product?.description ?? "Apólice de Seguro - Modalidade Garantias",
    ativos,
    aguardando,
    inativos,
    total,
    monthlyValue: monthlyValueStr,
    productStatus,
  }

  const updateProductStatus = async (newStatus: ProductStatus) => {
    try {
      const res = await fetch(`/api/products/${SLUG}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product_status: newStatus }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.error || "Erro ao atualizar")
      }
      toast.success("Status do produto atualizado.")
      mutate(`api-contracts-${SLUG}`)
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erro ao atualizar status")
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Produtos</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Gerenciar produtos para locação e visualizar contratações
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <Link key={productRow.id} href={`/dashboard/produtos/${productRow.slug}`}>
          <div className="group glass rounded-xl border bg-gradient-to-br from-sky-500/20 to-sky-600/5 border-sky-500/20 p-6 hover:glow-blue transition-all cursor-pointer">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 group-hover:bg-primary/20 transition-colors mb-4">
              <Monitor className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-lg font-bold text-foreground mb-1">{productRow.name}</h3>
            <p className="text-sm text-muted-foreground mb-4">{productRow.description}</p>
            <div className="flex items-center gap-6 pt-4 border-t border-border/50">
              {isLoading ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-xs">Carregando...</span>
                </div>
              ) : (
                <>
                  <div className="text-center">
                    <p className="text-xl font-bold text-emerald-400">{productRow.ativos}</p>
                    <p className="text-xs text-muted-foreground">Ativos</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xl font-bold text-amber-400">{productRow.aguardando}</p>
                    <p className="text-xs text-muted-foreground">Aguardando</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xl font-bold text-muted-foreground">{productRow.inativos}</p>
                    <p className="text-xs text-muted-foreground">Inativos</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xl font-bold text-foreground">{productRow.total}</p>
                    <p className="text-xs text-muted-foreground">Total</p>
                  </div>
                </>
              )}
            </div>
          </div>
        </Link>
      </div>

      <div className="glass rounded-xl border border-border/50 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/50 bg-muted/20">
              <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Produto</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Contratos Ativos</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Valor Mensal</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Ação</th>
            </tr>
          </thead>
          <tbody>
            <tr
              className="cursor-pointer hover:bg-muted/10 transition-colors border-b border-border/30"
              onClick={() => { window.location.href = `/dashboard/produtos/${productRow.slug}` }}
            >
              <td className="px-6 py-4 font-semibold text-foreground underline-offset-2 hover:underline">{productRow.name}</td>
              <td className="px-6 py-4 text-foreground">{isLoading ? "—" : productRow.ativos}</td>
              <td className="px-6 py-4 text-foreground">{isLoading ? "—" : productRow.monthlyValue}</td>
              <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                <select
                  value={productRow.productStatus}
                  onChange={(e) => updateProductStatus(e.target.value as ProductStatus)}
                  className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground focus:border-primary focus:outline-none cursor-pointer"
                >
                  {PRODUCT_STATUS_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </td>
              <td className="px-6 py-4">
                <Link href={`/dashboard/produtos/${productRow.slug}`} onClick={(e) => e.stopPropagation()}>
                  <button className="rounded-lg border border-border/50 bg-muted/20 px-4 py-1.5 text-xs font-medium text-foreground hover:bg-muted/40 transition-colors">Ver assinantes</button>
                </Link>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
