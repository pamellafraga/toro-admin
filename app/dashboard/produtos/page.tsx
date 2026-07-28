"use client"

import { useState } from "react"
import { Shirt, Loader2, ExternalLink } from "lucide-react"
import Link from "next/link"
import useSWR from "swr"
import { toast } from "sonner"
import { useAuth } from "@/lib/auth-context"
import {
  getProductsAlphabetically,
  formatToroPrice,
  getTotalStock,
  type ProductCatalogEntry,
} from "@/lib/products/catalog"

type ProductStatus = "no_ar" | "pausado" | "desativado"

const PRODUCT_STATUS_OPTIONS: { value: ProductStatus; label: string }[] = [
  { value: "no_ar", label: "No ar" },
  { value: "pausado", label: "Pausado" },
  { value: "desativado", label: "Desativado" },
]

const PRODUCT_STATUS_STYLE: Record<ProductStatus, string> = {
  no_ar: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30",
  pausado: "bg-amber-500/15 text-amber-700 border-amber-500/30",
  desativado: "bg-zinc-500/15 text-zinc-600 border-zinc-500/30",
}

const SITE_URL = "https://toro-green.vercel.app"

export default function ProdutosPage() {
  const { isAdmin } = useAuth()
  const [statusOverrides, setStatusOverrides] = useState<Partial<Record<string, ProductStatus>>>({})
  const [savingSlug, setSavingSlug] = useState<string | null>(null)

  const catalog = getProductsAlphabetically()

  const { data, isLoading, mutate } = useSWR("toro-products", async () => {
    const res = await fetch("/api/products", { credentials: "include", cache: "no-store" })
    if (!res.ok) return { products: [] as Array<{ slug?: string; product_status?: string; price?: number; metadata?: Record<string, unknown> }> }
    return res.json() as Promise<{ products: Array<{ slug?: string; product_status?: string; price?: number; metadata?: Record<string, unknown> }> }>
  })

  const dbBySlug = new Map((data?.products ?? []).map((p) => [p.slug, p]))

  const updateProductStatus = async (slug: string, newStatus: ProductStatus) => {
    setSavingSlug(slug)
    try {
      const res = await fetch(`/api/products/${slug}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product_status: newStatus }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error((j as { error?: string }).error || "Erro ao atualizar")
      }
      setStatusOverrides((prev) => ({ ...prev, [slug]: newStatus }))
      await mutate()
      toast.success("Status atualizado.")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao atualizar")
    } finally {
      setSavingSlug(null)
    }
  }

  const rows = catalog.map((entry) => {
    const db = dbBySlug.get(entry.slug)
    const stock = db?.metadata?.stockBySize
      ? Object.values(db.metadata.stockBySize as Record<string, number>).reduce((a, b) => a + b, 0)
      : getTotalStock(entry)
    const status = statusOverrides[entry.slug] ?? ((db?.product_status as ProductStatus) ?? "no_ar")
    return { entry, stock, status, price: db?.price ?? entry.price }
  })

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Produtos</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Catálogo sincronizado com o site{" "}
            <a href={SITE_URL} target="_blank" rel="noopener noreferrer" className="underline">
              toro-green.vercel.app
            </a>
            . As compras são feitas na loja online.
          </p>
        </div>
        <a
          href={SITE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm text-foreground hover:bg-muted/50"
        >
          Ver loja <ExternalLink className="h-4 w-4" />
        </a>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {rows.map(({ entry, stock, status, price }) => (
          <ProductCard
            key={entry.slug}
            entry={entry}
            stock={stock}
            status={status}
            price={price}
            isAdmin={isAdmin}
            isSaving={savingSlug === entry.slug}
            onStatusChange={(s) => updateProductStatus(entry.slug, s)}
          />
        ))}
      </div>

      {isLoading && (
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <Loader2 className="h-4 w-4 animate-spin" /> Sincronizando com o banco…
        </div>
      )}
    </div>
  )
}

function ProductCard({
  entry,
  stock,
  status,
  price,
  isAdmin,
  isSaving,
  onStatusChange,
}: {
  entry: ProductCatalogEntry
  stock: number
  status: ProductStatus
  price: number
  isAdmin: boolean
  isSaving: boolean
  onStatusChange: (s: ProductStatus) => void
}) {
  const siteProductUrl = `${SITE_URL}/produto/${entry.slug}`

  return (
    <div className="glass rounded-xl border border-border/50 overflow-hidden">
      <div className="aspect-[4/3] bg-[#F3F0E9] flex items-center justify-center border-b border-border/30">
        <Shirt className="h-12 w-12 text-[#101010]/20" />
      </div>
      <div className="p-5 space-y-3">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
            {entry.category} · {entry.gender === "feminino" ? "Feminino" : "Masculino"}
          </p>
          <h3 className="text-lg font-semibold text-foreground">{entry.name}</h3>
          <p className="text-sm font-medium text-foreground mt-1">{formatToroPrice(price)}</p>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Estoque total</span>
          <span className={stock === 0 ? "text-destructive font-medium" : "text-foreground font-medium"}>
            {stock} un.
          </span>
        </div>
        <div className="flex items-center justify-between gap-2">
          {isAdmin ? (
            <select
              value={status}
              disabled={isSaving}
              onChange={(e) => onStatusChange(e.target.value as ProductStatus)}
              className={`rounded-lg border px-2 py-1 text-xs font-medium ${PRODUCT_STATUS_STYLE[status]}`}
            >
              {PRODUCT_STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          ) : (
            <span className={`rounded-full border px-2.5 py-0.5 text-xs ${PRODUCT_STATUS_STYLE[status]}`}>
              {PRODUCT_STATUS_OPTIONS.find((o) => o.value === status)?.label}
            </span>
          )}
          <Link
            href={siteProductUrl}
            target="_blank"
            className="text-xs text-primary underline-offset-2 hover:underline"
          >
            Ver no site
          </Link>
        </div>
      </div>
    </div>
  )
}
