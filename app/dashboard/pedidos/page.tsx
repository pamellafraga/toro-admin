"use client"

import useSWR from "swr"
import { Loader2, Package, ExternalLink } from "lucide-react"
import { formatToroPrice } from "@/lib/products/catalog"

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
}

export default function PedidosPage() {
  const { data, error, isLoading } = useSWR("toro-orders", async () => {
    const res = await fetch("/api/orders", { credentials: "include", cache: "no-store" })
    const json = await res.json()
    return (json.orders ?? []) as OrderRow[]
  })

  const orders = data ?? []

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Pedidos</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Compras realizadas em{" "}
          <a href={SITE_URL} target="_blank" rel="noopener noreferrer" className="underline">
            toro-green.vercel.app
          </a>
          . Sincronizados automaticamente no checkout.
        </p>
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
            Quando um cliente finalizar uma compra no site, o pedido aparecerá aqui.
          </p>
        </div>
      )}

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
            {orders.map((order) => (
              <tr key={order.id} className="border-b border-border/30 hover:bg-muted/10">
                <td className="px-4 py-3 font-mono text-xs">{order.order_number}</td>
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
                <td className="px-4 py-3 text-xs">{PAYMENT_STATUS_LABELS[order.payment_status] ?? order.payment_status}</td>
                <td className="px-4 py-3 text-xs">{ORDER_STATUS_LABELS[order.order_status] ?? order.order_status}</td>
                <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                  {new Date(order.created_at).toLocaleString("pt-BR")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {orders.some((o) => o.tracking_code) && (
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          Rastreamento disponível no site ·{" "}
          <a href={`${SITE_URL}/rastreio`} target="_blank" rel="noopener noreferrer" className="underline inline-flex items-center gap-1">
            toro-green.vercel.app/rastreio <ExternalLink className="h-3 w-3" />
          </a>
        </p>
      )}
    </div>
  )
}
