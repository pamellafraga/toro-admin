"use client"

import { useState } from "react"
import { Monitor, Search, Loader2 } from "lucide-react"
import Link from "next/link"
import useSWR from "swr"
import { toast } from "sonner"
import { useAuth } from "@/lib/auth-context"
import { getProductsAlphabetically, type ProductCatalogEntry } from "@/lib/products/catalog"

type ProductStatus = "no_ar" | "pausado" | "desativado"

const PRODUCT_STATUS_OPTIONS: { value: ProductStatus; label: string }[] = [
  { value: "no_ar", label: "No ar" },
  { value: "pausado", label: "Pausado" },
  { value: "desativado", label: "Desativado" },
]

const PRODUCT_STATUS_STYLE: Record<ProductStatus, string> = {
  no_ar: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  pausado: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  desativado: "bg-zinc-500/15 text-zinc-400 border-zinc-500/30",
}

const PRODUCT_STATUS_LABELS: Record<ProductStatus, string> = {
  no_ar: "No ar",
  pausado: "Pausado",
  desativado: "Desativado",
}

const CARD_GRADIENTS = [
  "from-sky-500/20 to-sky-600/5 border-sky-500/20",
  "from-violet-500/20 to-violet-600/5 border-violet-500/20",
]

type ProductStatusBucket = "aguardando_produto" | "contratado" | "trial" | "inativo"

function getProductStatusBucket(status: string | null | undefined): ProductStatusBucket {
  const t = (status ?? "").toLowerCase().trim()
  if (t === "trial") return "trial"
  if (t === "aguardando_produto") return "aguardando_produto"
  if (t === "ativa" || t === "active") return "contratado"
  return "inativo"
}

function countByProductBucket(contracts: { status: string }[]) {
  const counts = { aguardando: 0, contratado: 0, trial: 0, inativo: 0 }
  for (const c of contracts) {
    const bucket = getProductStatusBucket(c.status)
    if (bucket === "aguardando_produto") counts.aguardando++
    else if (bucket === "contratado") counts.contratado++
    else if (bucket === "trial") counts.trial++
    else counts.inativo++
  }
  return counts
}

function ProductIcon({ entry, className }: { entry: ProductCatalogEntry; className?: string }) {
  if (entry.slug === "liticapro") return <Search className={className} />
  return <Monitor className={className} />
}

export default function ProdutosPage() {
  const { isAdmin, isComercial } = useAuth()
  /** Evita o select voltar ao valor antigo enquanto o PATCH não conclui */
  const [statusOverrides, setStatusOverrides] = useState<Partial<Record<string, ProductStatus>>>({})
  const [savingSlug, setSavingSlug] = useState<string | null>(null)

  const { data, isLoading, mutate: mutateSwr } = useSWR("api-all-products", async () => {
    const results = await Promise.all(
      getProductsAlphabetically().map(async (entry) => {
        const res = await fetch(`/api/products/${entry.slug}/contracts`, {
          cache: "no-store",
          credentials: "include",
        })
        const json = await res.json()
        return {
          entry,
          product: json.product as { id: string; name: string; description: string; product_status?: string } | null,
          contracts: (json.contracts ?? []) as { status: string; monthly_value: number }[],
        }
      }),
    )
    return results
  })

  const updateProductStatus = async (slug: string, newStatus: ProductStatus) => {
    const previous = statusOverrides[slug] ?? (data?.find((d) => d.entry.slug === slug)?.product?.product_status as ProductStatus) ?? "no_ar"
    setStatusOverrides((prev) => ({ ...prev, [slug]: newStatus }))
    setSavingSlug(slug)

    try {
      const res = await fetch(`/api/products/${slug}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product_status: newStatus }),
      })
      const json = (await res.json().catch(() => ({}))) as {
        error?: string
        product?: { product_status?: string }
      }
      if (!res.ok) throw new Error(json.error || "Erro ao atualizar")

      const savedStatus = (json.product?.product_status as ProductStatus) ?? newStatus

      await mutateSwr(
        (current) =>
          current?.map((item) =>
            item.entry.slug === slug
              ? {
                  ...item,
                  product: item.product
                    ? { ...item.product, product_status: savedStatus }
                    : {
                        id: slug,
                        name: item.entry.name,
                        description: item.entry.description,
                        product_status: savedStatus,
                      },
                }
              : item,
          ) ?? current,
        { revalidate: true },
      )

      setStatusOverrides((prev) => {
        const next = { ...prev }
        delete next[slug]
        return next
      })
      toast.success("Status do produto atualizado.")
    } catch (e: unknown) {
      setStatusOverrides((prev) => ({ ...prev, [slug]: previous }))
      toast.error(e instanceof Error ? e.message : "Erro ao atualizar status")
    } finally {
      setSavingSlug(null)
    }
  }

  const rows = (data ?? [])
    .map(({ entry, product, contracts }, index) => {
    const { aguardando, contratado, trial, inativo } = countByProductBucket(contracts)
    const total = contracts.length
    const monthlyValue = contracts
      .filter((c) => {
        const b = getProductStatusBucket(c.status)
        return b === "contratado" || b === "aguardando_produto"
      })
      .reduce((sum, c) => sum + Number(c.monthly_value), 0)

    return {
      entry,
      gradient: CARD_GRADIENTS[index % CARD_GRADIENTS.length],
      id: product?.id ?? entry.slug,
      name: product?.name ?? entry.name,
      description: product?.description ?? entry.description,
      planosLabel: entry.planosLabel,
      aguardando,
      contratado,
      trial,
      inativo,
      total,
      monthlyValue: `R$ ${monthlyValue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
      productStatus:
        statusOverrides[entry.slug] ??
        ((product?.product_status as ProductStatus) ?? "no_ar"),
      isSaving: savingSlug === entry.slug,
    }
  })
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR", { sensitivity: "base" }))

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Produtos</h2>
        <p className="text-sm text-muted-foreground mt-1">
          LicitaPregão (licitações públicas) e SEGURA (gestão de apólices).
        </p>
        {isComercial && (
          <p className="text-xs text-amber-400/90 mt-1">Contadores e totais são da sua história inteira (todas as vendas registradas por você).</p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {rows.map((productRow) => (
          <Link key={productRow.entry.slug} href={`/dashboard/produtos/${productRow.entry.slug}`}>
            <div className={`group glass rounded-xl border bg-gradient-to-br ${productRow.gradient} p-6 hover:glow-blue transition-all cursor-pointer`}>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 group-hover:bg-primary/20 transition-colors mb-4">
                <ProductIcon entry={productRow.entry} className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-lg font-bold text-foreground mb-1">{productRow.name}</h3>
              <p className="text-sm text-muted-foreground mb-1">{productRow.description}</p>
              <p className="text-xs text-muted-foreground/90 mb-4">{productRow.planosLabel}</p>
              <div className="grid grid-cols-4 gap-2 pt-4 border-t border-border/50">
                {isLoading ? (
                  <div className="col-span-4 flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-xs">Carregando...</span>
                  </div>
                ) : (
                  <>
                    <div className="text-center min-w-0">
                      <p className="text-lg font-bold text-amber-400">{productRow.aguardando}</p>
                      <p className="text-[10px] text-muted-foreground leading-tight">Aguardando produto</p>
                    </div>
                    <div className="text-center min-w-0">
                      <p className="text-lg font-bold text-emerald-400">{productRow.contratado}</p>
                      <p className="text-[10px] text-muted-foreground leading-tight">Contratado</p>
                    </div>
                    <div className="text-center min-w-0">
                      <p className="text-lg font-bold text-sky-400">{productRow.trial}</p>
                      <p className="text-[10px] text-muted-foreground leading-tight">Teste grátis</p>
                    </div>
                    <div className="text-center min-w-0">
                      <p className="text-lg font-bold text-muted-foreground">{productRow.inativo}</p>
                      <p className="text-[10px] text-muted-foreground leading-tight">Inativo</p>
                    </div>
                  </>
                )}
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div className="glass rounded-xl border border-border/50 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/50 bg-muted/20">
              <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Produto</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Contratados</th>
              {isAdmin && <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Valor Mensal</th>}
              <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Ação</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((productRow) => (
              <tr
                key={productRow.entry.slug}
                className="cursor-pointer hover:bg-muted/10 transition-colors border-b border-border/30"
                onClick={() => { window.location.href = `/dashboard/produtos/${productRow.entry.slug}` }}
              >
                <td className="px-6 py-4 font-semibold text-foreground underline-offset-2 hover:underline">{productRow.name}</td>
                <td className="px-6 py-4 text-foreground">{isLoading ? "—" : productRow.contratado}</td>
                {isAdmin && <td className="px-6 py-4 text-foreground">{isLoading ? "—" : productRow.monthlyValue}</td>}
                <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                  {isAdmin ? (
                    <select
                      value={productRow.productStatus}
                      disabled={productRow.isSaving}
                      onChange={(e) => updateProductStatus(productRow.entry.slug, e.target.value as ProductStatus)}
                      className={`rounded-lg border px-3 py-1.5 text-xs font-medium focus:border-primary focus:outline-none cursor-pointer disabled:opacity-60 ${PRODUCT_STATUS_STYLE[productRow.productStatus]}`}
                    >
                      {PRODUCT_STATUS_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  ) : (
                    <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${PRODUCT_STATUS_STYLE[productRow.productStatus]}`}>
                      {PRODUCT_STATUS_LABELS[productRow.productStatus]}
                    </span>
                  )}
                </td>
                <td className="px-6 py-4">
                  <Link href={`/dashboard/produtos/${productRow.entry.slug}`} onClick={(e) => e.stopPropagation()}>
                    <button className="rounded-lg bg-primary px-4 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors">Ver assinantes</button>
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
