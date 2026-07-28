"use client"

import { useMemo, useState } from "react"
import useSWR from "swr"
import { format, parseISO } from "date-fns"
import { ptBR } from "date-fns/locale"
import {
  Loader2,
  Plus,
  PackageCheck,
  Truck,
  Factory,
  Trash2,
  CheckCircle2,
} from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { FormSelect } from "@/components/ui/form-select"
import { cn } from "@/lib/utils"
import { formatToroPrice } from "@/lib/products/catalog"
import type { FactoryOrderStatus } from "@/lib/db/repositories/toro-factory-orders.repository"

type CatalogProduct = {
  id: string
  name: string
  sizes?: string[]
}

type FactoryOrder = {
  id: string
  product_slug: string
  product_name: string
  supplier_name: string
  stock_by_size: Record<string, number>
  quantity_total: number
  unit_cost: number | null
  total_cost: number | null
  ordered_at: string
  expected_at: string | null
  received_at: string | null
  status: FactoryOrderStatus
  stock_applied: boolean
  notes: string | null
}

const STATUS_LABELS: Record<FactoryOrderStatus, string> = {
  encomendado: "Encomendado",
  em_producao: "Em produção",
  a_caminho: "A caminho",
  recebido: "Recebido",
  cancelado: "Cancelado",
}

const STATUS_TABS: { id: "all" | FactoryOrderStatus; label: string; class: string }[] = [
  { id: "all", label: "Todos", class: "bg-[#101010] text-[#FDFCF8]" },
  { id: "encomendado", label: "Encomendado", class: "bg-[#F3F0E9] text-[#101010]" },
  { id: "em_producao", label: "Em produção", class: "bg-amber-500/15 text-amber-900" },
  { id: "a_caminho", label: "A caminho", class: "bg-blue-500/10 text-blue-900" },
  { id: "recebido", label: "Recebido", class: "bg-emerald-500/15 text-emerald-900" },
]

const STATUS_OPTIONS = Object.entries(STATUS_LABELS).map(([value, label]) => ({ value, label }))

function formatDate(value: string | null): string {
  if (!value) return "—"
  try {
    return format(parseISO(value.slice(0, 10)), "dd/MM/yyyy", { locale: ptBR })
  } catch {
    return value
  }
}

function formatSizes(stock: Record<string, number>): string {
  return Object.entries(stock)
    .filter(([, q]) => q > 0)
    .map(([size, q]) => `${size}: ${q}`)
    .join(" · ")
}

export default function EstoquePage() {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [filterTab, setFilterTab] = useState<"all" | FactoryOrderStatus>("all")
  const [form, setForm] = useState({
    productSlug: "",
    supplierName: "",
    orderedAt: new Date().toISOString().slice(0, 10),
    expectedAt: "",
    status: "encomendado" as FactoryOrderStatus,
    unitCost: "",
    notes: "",
  })
  const [sizeQty, setSizeQty] = useState<Record<string, string>>({})

  const { data, isLoading, mutate } = useSWR("factory-orders", async () => {
    const res = await fetch("/api/factory-orders", { credentials: "include", cache: "no-store" })
    const json = await res.json()
    return (json.orders ?? []) as FactoryOrder[]
  })

  const { data: productsData } = useSWR(
    dialogOpen ? "products-estoque" : null,
    async () => {
      const res = await fetch("/api/products", { credentials: "include" })
      const json = await res.json()
      return (json.products ?? []) as CatalogProduct[]
    },
  )

  const orders = data ?? []
  const products = productsData ?? []
  const selectedProduct = products.find((p) => p.id === form.productSlug)
  const sizes = selectedProduct?.sizes?.length ? selectedProduct.sizes : ["UN"]

  const stats = useMemo(() => {
    const pending = orders.filter((o) => !["recebido", "cancelado"].includes(o.status))
    const pendingUnits = pending.reduce((s, o) => s + o.quantity_total, 0)
    const received = orders.filter((o) => o.status === "recebido")
    const receivedUnits = received.reduce((s, o) => s + o.quantity_total, 0)
    return { pending: pending.length, pendingUnits, received: received.length, receivedUnits }
  }, [orders])

  const filtered = useMemo(
    () => (filterTab === "all" ? orders : orders.filter((o) => o.status === filterTab)),
    [orders, filterTab],
  )

  const countByTab = useMemo(() => {
    const counts: Record<string, number> = { all: orders.length }
    for (const o of orders) counts[o.status] = (counts[o.status] ?? 0) + 1
    return counts
  }, [orders])

  const resetForm = () => {
    setForm({
      productSlug: "",
      supplierName: "",
      orderedAt: new Date().toISOString().slice(0, 10),
      expectedAt: "",
      status: "encomendado",
      unitCost: "",
      notes: "",
    })
    setSizeQty({})
  }

  const handleProductChange = (productSlug: string) => {
    const p = products.find((x) => x.id === productSlug)
    const nextSizes = p?.sizes?.length ? p.sizes : ["UN"]
    setForm((f) => ({ ...f, productSlug }))
    setSizeQty(Object.fromEntries(nextSizes.map((s) => [s, ""])))
  }

  const handleCreate = async () => {
    if (!form.productSlug) {
      toast.error("Selecione o produto.")
      return
    }
    if (!form.supplierName.trim()) {
      toast.error("Informe a costureira ou fábrica.")
      return
    }

    const stockBySize: Record<string, number> = {}
    for (const [size, raw] of Object.entries(sizeQty)) {
      const n = parseInt(raw, 10)
      if (n > 0) stockBySize[size] = n
    }
    if (Object.keys(stockBySize).length === 0) {
      toast.error("Informe quantidades por tamanho.")
      return
    }

    setSaving(true)
    try {
      const res = await fetch("/api/factory-orders", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productSlug: form.productSlug,
          productName: selectedProduct?.name ?? form.productSlug,
          supplierName: form.supplierName.trim(),
          stockBySize,
          unitCost: form.unitCost ? parseFloat(form.unitCost.replace(",", ".")) : null,
          orderedAt: form.orderedAt,
          expectedAt: form.expectedAt || null,
          status: form.status,
          notes: form.notes.trim() || null,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Erro ao salvar")

      await mutate((prev) => [json.order, ...(prev ?? [])], { revalidate: true })
      toast.success("Encomenda registrada!")
      resetForm()
      setDialogOpen(false)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar encomenda.")
    } finally {
      setSaving(false)
    }
  }

  const markReceived = async (order: FactoryOrder, applyStock: boolean) => {
    try {
      const res = await fetch(`/api/factory-orders/${order.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "recebido",
          receivedAt: new Date().toISOString().slice(0, 10),
          applyStock,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Erro ao atualizar")

      await mutate(
        (prev) => prev?.map((o) => (o.id === order.id ? json.order : o)),
        { revalidate: true },
      )
      toast.success(applyStock ? "Recebido e estoque atualizado!" : "Marcado como recebido!")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao atualizar.")
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir esta encomenda?")) return
    try {
      const res = await fetch(`/api/factory-orders/${id}`, {
        method: "DELETE",
        credentials: "include",
      })
      if (!res.ok) throw new Error("Erro ao excluir")
      await mutate((prev) => prev?.filter((o) => o.id !== id), { revalidate: true })
      toast.success("Encomenda excluída.")
    } catch {
      toast.error("Erro ao excluir encomenda.")
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Estoque</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Controle o que você encomendou com a costureira ou fábrica — quantidades, previsão e chegada.
          </p>
        </div>
        <Dialog
          open={dialogOpen}
          onOpenChange={(open) => {
            setDialogOpen(open)
            if (!open) resetForm()
          }}
        >
          <DialogTrigger asChild>
            <Button className="gap-2 shrink-0 bg-[#101010] text-[#FDFCF8] hover:bg-[#101010]/90">
              <Plus className="h-4 w-4" />
              Nova encomenda
            </Button>
          </DialogTrigger>
          <DialogContent className="flex max-h-[min(92dvh,760px)] flex-col overflow-hidden p-0 sm:max-w-lg">
            <DialogHeader className="border-b border-border px-6 py-4">
              <DialogTitle>Encomenda à costureira / fábrica</DialogTitle>
              <DialogDescription>Registre o pedido de produção e as quantidades por tamanho.</DialogDescription>
            </DialogHeader>
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-4">
              <div>
                <Label>Produto *</Label>
                <FormSelect
                  value={form.productSlug}
                  onValueChange={handleProductChange}
                  placeholder="Selecione o produto"
                  className="mt-1"
                  options={products.map((p) => ({ value: p.id, label: p.name }))}
                />
              </div>
              <div>
                <Label htmlFor="supplier">Costureira / Fábrica *</Label>
                <Input
                  id="supplier"
                  value={form.supplierName}
                  onChange={(e) => setForm((p) => ({ ...p, supplierName: e.target.value }))}
                  placeholder="Ex.: Ateliê Maria, Fábrica XYZ"
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Quantidades por tamanho *</Label>
                <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {sizes.map((size) => (
                    <div key={size}>
                      <Label className="text-xs text-muted-foreground">{size}</Label>
                      <Input
                        type="number"
                        min={0}
                        value={sizeQty[size] ?? ""}
                        onChange={(e) => setSizeQty((p) => ({ ...p, [size]: e.target.value }))}
                        className="mt-0.5 h-9"
                      />
                    </div>
                  ))}
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="ordered-at">Data da encomenda</Label>
                  <Input
                    id="ordered-at"
                    type="date"
                    value={form.orderedAt}
                    onChange={(e) => setForm((p) => ({ ...p, orderedAt: e.target.value }))}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="expected-at">Previsão de chegada</Label>
                  <Input
                    id="expected-at"
                    type="date"
                    value={form.expectedAt}
                    onChange={(e) => setForm((p) => ({ ...p, expectedAt: e.target.value }))}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Status</Label>
                  <FormSelect
                    value={form.status}
                    onValueChange={(status) =>
                      setForm((p) => ({ ...p, status: status as FactoryOrderStatus }))
                    }
                    options={STATUS_OPTIONS.filter((o) => o.value !== "recebido" && o.value !== "cancelado")}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="unit-cost">Custo unitário (R$)</Label>
                  <Input
                    id="unit-cost"
                    value={form.unitCost}
                    onChange={(e) => setForm((p) => ({ ...p, unitCost: e.target.value }))}
                    placeholder="Opcional"
                    className="mt-1"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="notes">Observações</Label>
                <Input
                  id="notes"
                  value={form.notes}
                  onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                  className="mt-1"
                />
              </div>
            </div>
            <div className="border-t border-border px-6 py-4">
              <Button
                onClick={handleCreate}
                disabled={saving || products.length === 0}
                className="w-full bg-[#101010] text-[#FDFCF8] hover:bg-[#101010]/90"
              >
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando…
                  </>
                ) : (
                  "Salvar encomenda"
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="glass rounded-xl p-5 border border-[#E3DBCC]/60">
          <p className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1">
            <Truck className="h-3.5 w-3.5" /> Em aberto
          </p>
          <p className="text-2xl font-bold mt-1">{stats.pending}</p>
          <p className="text-xs text-muted-foreground">{stats.pendingUnits} peças aguardando</p>
        </div>
        <div className="glass rounded-xl p-5 border border-[#E3DBCC]/60">
          <p className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1">
            <PackageCheck className="h-3.5 w-3.5" /> Recebidas
          </p>
          <p className="text-2xl font-bold mt-1">{stats.received}</p>
          <p className="text-xs text-muted-foreground">{stats.receivedUnits} peças no total</p>
        </div>
        <div className="glass rounded-xl p-5 border border-[#E3DBCC]/60">
          <p className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1">
            <Factory className="h-3.5 w-3.5" /> Encomendas
          </p>
          <p className="text-2xl font-bold mt-1">{orders.length}</p>
          <p className="text-xs text-muted-foreground">registros no histórico</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setFilterTab(tab.id)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
              filterTab === tab.id
                ? tab.class
                : "border-[#E3DBCC] bg-[#FDFCF8] text-muted-foreground hover:bg-[#F3F0E9]",
            )}
          >
            {tab.label} ({countByTab[tab.id] ?? 0})
          </button>
        ))}
      </div>

      {isLoading && (
        <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" /> Carregando…
        </div>
      )}

      {!isLoading && orders.length === 0 && (
        <div className="glass rounded-xl border border-dashed border-[#E3DBCC] p-12 text-center">
          <Factory className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Nenhuma encomenda registrada.</p>
          <p className="text-xs text-muted-foreground mt-1">
            Use <strong>Nova encomenda</strong> para controlar a produção com a costureira.
          </p>
        </div>
      )}

      {filtered.length > 0 && (
        <div className="glass rounded-xl border border-[#E3DBCC]/60 overflow-x-auto">
          <table className="w-full text-sm min-w-[900px]">
            <thead>
              <tr className="border-b border-[#E3DBCC]/50 bg-[#F3F0E9]/50">
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">Produto</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">Fornecedor</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">Quantidades</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">Datas</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">Custo</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">Status</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase text-muted-foreground">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((order) => (
                <tr key={order.id} className="border-b border-[#E3DBCC]/30 hover:bg-[#F3F0E9]/20">
                  <td className="px-4 py-3">
                    <p className="font-medium">{order.product_name}</p>
                    <p className="text-xs text-muted-foreground font-mono">{order.product_slug}</p>
                    {order.notes && <p className="text-xs text-muted-foreground mt-0.5">{order.notes}</p>}
                  </td>
                  <td className="px-4 py-3">{order.supplier_name}</td>
                  <td className="px-4 py-3 text-xs">
                    <p>{formatSizes(order.stock_by_size)}</p>
                    <p className="font-semibold text-foreground mt-0.5">Total: {order.quantity_total} peças</p>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    <p>Encomenda: {formatDate(order.ordered_at)}</p>
                    <p>Previsão: {formatDate(order.expected_at)}</p>
                    <p>Chegou: {formatDate(order.received_at)}</p>
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {order.unit_cost != null ? (
                      <>
                        <p>{formatToroPrice(order.unit_cost)}/un</p>
                        {order.total_cost != null && (
                          <p className="font-semibold">{formatToroPrice(order.total_cost)}</p>
                        )}
                      </>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-full border border-[#E3DBCC] bg-[#F3F0E9] px-2 py-0.5 text-[10px] font-semibold uppercase">
                      {STATUS_LABELS[order.status]}
                    </span>
                    {order.stock_applied && (
                      <p className="text-[10px] text-emerald-700 mt-1">Estoque atualizado</p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      {order.status !== "recebido" && order.status !== "cancelado" && (
                        <>
                          <button
                            type="button"
                            title="Marcar recebido e somar ao estoque"
                            onClick={() => markReceived(order, true)}
                            className="rounded-lg p-2 text-emerald-700 hover:bg-emerald-500/10"
                          >
                            <CheckCircle2 className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            title="Marcar recebido sem alterar estoque"
                            onClick={() => markReceived(order, false)}
                            className="rounded-lg px-2 py-1 text-[10px] border border-[#E3DBCC] hover:bg-[#F3F0E9]"
                          >
                            Só receber
                          </button>
                        </>
                      )}
                      <button
                        type="button"
                        title="Excluir"
                        onClick={() => handleDelete(order.id)}
                        className="rounded-lg p-2 text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
