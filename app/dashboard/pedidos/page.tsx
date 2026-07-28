"use client"

import { useMemo, useState } from "react"
import useSWR from "swr"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { Loader2, Package, ExternalLink, Plus, Trash2 } from "lucide-react"
import { formatToroPrice } from "@/lib/products/catalog"
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

const SITE_URL = "https://toro-green.vercel.app"

const ORDER_STATUS_LABELS: Record<string, string> = {
  pending_payment: "Aguardando pagamento",
  paid: "Pago",
  processing: "Em separação",
  shipped: "Enviado",
  delivered: "Entregue",
  cancelled: "Cancelado",
  under_review: "Em análise",
}

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  pending: "Pendente",
  approved: "Aprovado",
  expired: "Expirado",
  rejected: "Recusado",
  under_review: "Em análise",
}

const ORDER_STATUS_OPTIONS = Object.entries(ORDER_STATUS_LABELS).map(([value, label]) => ({
  value,
  label,
}))

const PAYMENT_STATUS_OPTIONS = Object.entries(PAYMENT_STATUS_LABELS).map(([value, label]) => ({
  value,
  label,
}))

type CatalogProduct = {
  id: string
  name: string
  price: number
  sizes?: string[]
}

type OrderRow = {
  id: string
  order_number: string
  customer_name: string | null
  customer_email: string | null
  total: number
  order_status: string
  payment_status: string
  tracking_code: string | null
  items: Array<{ productId: string; productName?: string; size: string; quantity: number; unitPrice: number }>
  created_at: string
  metadata?: { source?: string }
}

type OrderItemDraft = {
  productId: string
  size: string
  quantity: number
}

const EMPTY_ITEM: OrderItemDraft = { productId: "", size: "", quantity: 1 }

export default function PedidosPage() {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    customerName: "",
    customerEmail: "",
    customerPhone: "",
    customerCpfCnpj: "",
    shipping: "0",
    discount: "0",
    paymentStatus: "approved",
    orderStatus: "paid",
    paymentMethod: "manual",
    notes: "",
    decrementStock: true,
  })
  const [items, setItems] = useState<OrderItemDraft[]>([{ ...EMPTY_ITEM }])

  const { data, error, isLoading, mutate } = useSWR("toro-orders", async () => {
    const res = await fetch("/api/orders", { credentials: "include", cache: "no-store" })
    const json = await res.json()
    return (json.orders ?? []) as OrderRow[]
  })

  const { data: catalogData } = useSWR(
    dialogOpen ? "products-for-order" : null,
    async () => {
      const res = await fetch("/api/products", { credentials: "include", cache: "no-store" })
      const json = await res.json()
      return (json.products ?? []) as CatalogProduct[]
    },
  )

  const products = catalogData ?? []
  const orders = data ?? []

  const totals = useMemo(() => {
    let subtotal = 0
    for (const item of items) {
      const product = products.find((p) => p.id === item.productId)
      if (!product || item.quantity <= 0) continue
      subtotal += product.price * item.quantity
    }
    const shipping = parseFloat(form.shipping.replace(",", ".")) || 0
    const discount = parseFloat(form.discount.replace(",", ".")) || 0
    const total = Math.max(0, subtotal + shipping - discount)
    return { subtotal, shipping, discount, total }
  }, [items, products, form.shipping, form.discount])

  const resetForm = () => {
    setForm({
      customerName: "",
      customerEmail: "",
      customerPhone: "",
      customerCpfCnpj: "",
      shipping: "0",
      discount: "0",
      paymentStatus: "approved",
      orderStatus: "paid",
      paymentMethod: "manual",
      notes: "",
      decrementStock: true,
    })
    setItems([{ ...EMPTY_ITEM }])
  }

  const updateItem = (index: number, patch: Partial<OrderItemDraft>) => {
    setItems((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)))
  }

  const addItem = () => setItems((prev) => [...prev, { ...EMPTY_ITEM }])

  const removeItem = (index: number) => {
    setItems((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)))
  }

  const handleCreateOrder = async () => {
    if (!form.customerName.trim()) {
      toast.error("Informe o nome do cliente.")
      return
    }
    const validItems = items.filter((i) => i.productId && i.size && i.quantity > 0)
    if (validItems.length === 0) {
      toast.error("Adicione ao menos um produto com tamanho e quantidade.")
      return
    }

    setSaving(true)
    try {
      const payloadItems = validItems.map((item) => {
        const product = products.find((p) => p.id === item.productId)!
        return {
          productId: item.productId,
          productName: product.name,
          size: item.size,
          quantity: item.quantity,
          unitPrice: product.price,
        }
      })

      const res = await fetch("/api/orders", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: form.customerName.trim(),
          customerEmail: form.customerEmail.trim() || null,
          customerPhone: form.customerPhone.trim() || null,
          customerCpfCnpj: form.customerCpfCnpj.trim() || null,
          items: payloadItems,
          subtotal: totals.subtotal,
          shipping: totals.shipping,
          discount: totals.discount,
          total: totals.total,
          paymentStatus: form.paymentStatus,
          orderStatus: form.orderStatus,
          paymentMethod: form.paymentMethod,
          notes: form.notes.trim() || null,
          decrementStock: form.decrementStock,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Erro ao registrar pedido")

      await mutate((prev) => [json.order, ...(prev ?? [])], { revalidate: true })
      toast.success(`Pedido ${json.order.order_number} registrado!`)
      resetForm()
      setDialogOpen(false)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao registrar pedido.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Pedidos</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Compras do site{" "}
            <a href={SITE_URL} target="_blank" rel="noopener noreferrer" className="underline">
              toro-green.vercel.app
            </a>{" "}
            e registros manuais de venda.
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
              Registrar compra
            </Button>
          </DialogTrigger>
          <DialogContent className="flex max-h-[min(92dvh,780px)] flex-col overflow-hidden p-0 sm:max-w-2xl">
            <DialogHeader className="border-b border-border px-6 py-4">
              <DialogTitle>Nova compra manual</DialogTitle>
              <DialogDescription>
                Registre uma venda feita fora do site (WhatsApp, loja física, etc.).
              </DialogDescription>
            </DialogHeader>
            <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 py-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Label htmlFor="order-customer-name">Cliente *</Label>
                  <Input
                    id="order-customer-name"
                    value={form.customerName}
                    onChange={(e) => setForm((p) => ({ ...p, customerName: e.target.value }))}
                    placeholder="Nome completo"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="order-email">E-mail</Label>
                  <Input
                    id="order-email"
                    type="email"
                    value={form.customerEmail}
                    onChange={(e) => setForm((p) => ({ ...p, customerEmail: e.target.value }))}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="order-phone">Telefone</Label>
                  <Input
                    id="order-phone"
                    value={form.customerPhone}
                    onChange={(e) => setForm((p) => ({ ...p, customerPhone: e.target.value }))}
                    className="mt-1"
                  />
                </div>
                <div className="sm:col-span-2">
                  <Label htmlFor="order-cpf">CPF / CNPJ</Label>
                  <Input
                    id="order-cpf"
                    value={form.customerCpfCnpj}
                    onChange={(e) => setForm((p) => ({ ...p, customerCpfCnpj: e.target.value }))}
                    className="mt-1"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Produtos *</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addItem} className="gap-1 h-8">
                    <Plus className="h-3.5 w-3.5" /> Item
                  </Button>
                </div>
                {items.map((item, index) => {
                  const product = products.find((p) => p.id === item.productId)
                  const sizes = product?.sizes?.length ? product.sizes : ["UN"]
                  return (
                    <div
                      key={index}
                      className="grid gap-2 rounded-lg border border-[#E3DBCC] bg-[#FDFCF8] p-3 sm:grid-cols-[1fr_100px_80px_auto]"
                    >
                      <FormSelect
                        value={item.productId}
                        onValueChange={(productId) => {
                          const p = products.find((x) => x.id === productId)
                          updateItem(index, {
                            productId,
                            size: p?.sizes?.[0] ?? "UN",
                          })
                        }}
                        placeholder="Produto"
                        options={products.map((p) => ({
                          value: p.id,
                          label: `${p.name} — ${formatToroPrice(p.price)}`,
                        }))}
                      />
                      <FormSelect
                        value={item.size || sizes[0]}
                        onValueChange={(size) => updateItem(index, { size })}
                        placeholder="Tam."
                        triggerClassName="min-w-0"
                        options={sizes.map((s) => ({ value: s, label: s }))}
                      />
                      <Input
                        type="number"
                        min={1}
                        value={item.quantity}
                        onChange={(e) =>
                          updateItem(index, { quantity: Math.max(1, parseInt(e.target.value, 10) || 1) })
                        }
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeItem(index)}
                        disabled={items.length <= 1}
                        className="shrink-0 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      {product && (
                        <p className="sm:col-span-4 text-xs text-muted-foreground">
                          Subtotal item: {formatToroPrice(product.price * item.quantity)}
                        </p>
                      )}
                    </div>
                  )
                })}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="order-shipping">Frete (R$)</Label>
                  <Input
                    id="order-shipping"
                    value={form.shipping}
                    onChange={(e) => setForm((p) => ({ ...p, shipping: e.target.value }))}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="order-discount">Desconto (R$)</Label>
                  <Input
                    id="order-discount"
                    value={form.discount}
                    onChange={(e) => setForm((p) => ({ ...p, discount: e.target.value }))}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Pagamento</Label>
                  <FormSelect
                    value={form.paymentStatus}
                    onValueChange={(paymentStatus) => setForm((p) => ({ ...p, paymentStatus }))}
                    options={PAYMENT_STATUS_OPTIONS}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Status do pedido</Label>
                  <FormSelect
                    value={form.orderStatus}
                    onValueChange={(orderStatus) => setForm((p) => ({ ...p, orderStatus }))}
                    options={ORDER_STATUS_OPTIONS}
                    className="mt-1"
                  />
                </div>
                <div className="sm:col-span-2">
                  <Label htmlFor="order-notes">Observações</Label>
                  <Input
                    id="order-notes"
                    value={form.notes}
                    onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                    placeholder="Ex.: Venda via WhatsApp"
                    className="mt-1"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.decrementStock}
                  onChange={(e) => setForm((p) => ({ ...p, decrementStock: e.target.checked }))}
                  className="rounded border-[#E3DBCC]"
                />
                Baixar estoque dos produtos automaticamente
              </label>

              <div className="rounded-lg border border-[#E3DBCC] bg-[#F3F0E9]/50 px-4 py-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatToroPrice(totals.subtotal)}</span>
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-muted-foreground">Frete − Desconto</span>
                  <span>
                    {formatToroPrice(totals.shipping)} − {formatToroPrice(totals.discount)}
                  </span>
                </div>
                <div className="flex justify-between mt-2 pt-2 border-t border-[#E3DBCC] font-semibold text-base">
                  <span>Total</span>
                  <span>{formatToroPrice(totals.total)}</span>
                </div>
              </div>
            </div>
            <div className="border-t border-border px-6 py-4">
              <Button
                onClick={handleCreateOrder}
                disabled={saving || products.length === 0}
                className="w-full bg-[#101010] text-[#FDFCF8] hover:bg-[#101010]/90"
              >
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Registrando…
                  </>
                ) : (
                  "Salvar pedido"
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading && (
        <div className="flex items-center gap-2 text-muted-foreground py-12 justify-center">
          <Loader2 className="h-5 w-5 animate-spin" /> Carregando pedidos…
        </div>
      )}

      {error && (
        <p className="text-sm text-destructive">Erro ao carregar pedidos. Verifique a conexão com o banco.</p>
      )}

      {!isLoading && orders.length === 0 && (
        <div className="glass rounded-xl border border-dashed border-border p-12 text-center">
          <Package className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Nenhum pedido ainda.</p>
          <p className="text-xs text-muted-foreground mt-1">
            Use <strong>Registrar compra</strong> ou aguarde uma venda no site.
          </p>
        </div>
      )}

      {orders.length > 0 && (
        <div className="glass rounded-xl border border-border/50 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/50 bg-muted/20">
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Pedido</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Cliente</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Itens</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Total</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Pagamento</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Data</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => {
                const isManual =
                  typeof order.metadata === "object" &&
                  order.metadata !== null &&
                  (order.metadata as { source?: string }).source === "manual"
                return (
                  <tr key={order.id} className="border-b border-border/30 hover:bg-muted/10">
                    <td className="px-4 py-3">
                      <p className="font-mono text-xs">{order.order_number}</p>
                      {isManual && (
                        <span className="mt-0.5 inline-flex rounded-full bg-[#F3F0E9] px-1.5 py-0.5 text-[9px] font-semibold uppercase">
                          Manual
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-foreground">{order.customer_name ?? "—"}</p>
                      <p className="text-xs text-muted-foreground">{order.customer_email ?? ""}</p>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground max-w-[200px]">
                      {(order.items ?? []).map((item, i) => (
                        <span key={i}>
                          {item.quantity}x {item.productName ?? item.productId} ({item.size})
                          {i < order.items.length - 1 ? ", " : ""}
                        </span>
                      ))}
                    </td>
                    <td className="px-4 py-3 font-medium">{formatToroPrice(Number(order.total))}</td>
                    <td className="px-4 py-3 text-xs">
                      {PAYMENT_STATUS_LABELS[order.payment_status] ?? order.payment_status}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {ORDER_STATUS_LABELS[order.order_status] ?? order.order_status}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                      {format(new Date(order.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {orders.some((o) => o.tracking_code) && (
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          Rastreamento disponível no site ·{" "}
          <a
            href={`${SITE_URL}/rastreio`}
            target="_blank"
            rel="noopener noreferrer"
            className="underline inline-flex items-center gap-1"
          >
            toro-green.vercel.app/rastreio <ExternalLink className="h-3 w-3" />
          </a>
        </p>
      )}
    </div>
  )
}
