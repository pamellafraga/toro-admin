"use client"

import { useMemo, useState } from "react"
import useSWR from "swr"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import {
  DollarSign,
  TrendingUp,
  Clock,
  XCircle,
  CheckCircle2,
  Search,
  Download,
  Calendar,
  Package,
  User,
  ChevronDown,
  ChevronUp,
  LayoutGrid,
  List,
  ShieldAlert,
  ShoppingBag,
  Loader2,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { formatToroPrice } from "@/lib/products/catalog"
import { cn } from "@/lib/utils"

const SITE_URL = "https://toro-green.vercel.app"

type OrderItem = {
  productId: string
  productName?: string
  size: string
  quantity: number
  unitPrice: number
}

type StoreOrder = {
  id: string
  order_number: string
  customer_name: string | null
  customer_email: string | null
  customer_cpf_cnpj: string | null
  total: number
  subtotal: number
  shipping: number
  discount: number
  payment_status: string
  order_status: string
  payment_method: string | null
  items: OrderItem[]
  created_at: string
}

type SortField = "client" | "order" | "value" | "payment" | "status" | "date"
type SortDir = "asc" | "desc"

const PAYMENT_LABELS: Record<string, { label: string; class: string; icon: LucideIcon }> = {
  approved: { label: "Pago", class: "bg-[#101010]/10 text-[#101010] border-[#E3DBCC]", icon: CheckCircle2 },
  pending: { label: "Pendente", class: "bg-amber-500/15 text-amber-700 border-amber-500/30", icon: Clock },
  expired: { label: "Expirado", class: "bg-red-500/15 text-red-600 border-red-500/30", icon: XCircle },
  rejected: { label: "Recusado", class: "bg-red-500/15 text-red-600 border-red-500/30", icon: XCircle },
  under_review: { label: "Em análise", class: "bg-amber-500/15 text-amber-700 border-amber-500/30", icon: Clock },
}

const ORDER_STATUS_LABELS: Record<string, string> = {
  pending_payment: "Aguardando pagamento",
  paid: "Pago",
  processing: "Em separação",
  shipped: "Enviado",
  delivered: "Entregue",
  cancelled: "Cancelado",
  under_review: "Em análise",
}

const KANBAN_COLUMNS = [
  { id: "approved", label: "Pago", class: "bg-[#101010] text-[#FDFCF8] border-[#101010]", icon: CheckCircle2 },
  { id: "pending", label: "Pendente", class: "bg-amber-500/20 text-amber-800 border-amber-500/40", icon: Clock },
  { id: "expired", label: "Expirado", class: "bg-red-500/15 text-red-700 border-red-500/30", icon: XCircle },
  { id: "cancelled", label: "Cancelado", class: "bg-zinc-500/15 text-zinc-600 border-zinc-500/30", icon: XCircle },
] as const

function normalizeKanbanColumn(order: StoreOrder): (typeof KANBAN_COLUMNS)[number]["id"] {
  if (order.order_status === "cancelled") return "cancelled"
  const p = order.payment_status.toLowerCase()
  if (p === "approved") return "approved"
  if (p === "expired") return "expired"
  if (p === "rejected") return "cancelled"
  return "pending"
}

function itemsSummary(items: OrderItem[]): string {
  if (!items?.length) return "—"
  return items
    .map((i) => `${i.quantity}x ${i.productName ?? i.productId}${i.size ? ` (${i.size})` : ""}`)
    .join(", ")
}

function isCurrentMonth(dateStr: string): boolean {
  const d = new Date(dateStr)
  const now = new Date()
  return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
}

async function fetchOrders(): Promise<StoreOrder[]> {
  const res = await fetch("/api/orders", { credentials: "include", cache: "no-store" })
  const json = await res.json()
  if (!res.ok) throw new Error(json.error || "Erro ao carregar pedidos")
  return (json.orders ?? []) as StoreOrder[]
}

export default function FinanceiroPage() {
  const { hasPermission, isAdmin } = useAuth()
  const [view, setView] = useState<"list" | "kanban">("kanban")
  const [search, setSearch] = useState("")
  const [filterPayment, setFilterPayment] = useState("all")
  const [sortField, setSortField] = useState<SortField>("date")
  const [sortDir, setSortDir] = useState<SortDir>("desc")

  const { data, error, isLoading } = useSWR("financeiro-orders", fetchOrders)
  const orders = data ?? []

  const stats = useMemo(() => {
    const paid = orders.filter((o) => o.payment_status === "approved")
    const pending = orders.filter((o) => o.payment_status === "pending" && o.order_status !== "cancelled")
    const expired = orders.filter((o) => o.payment_status === "expired")
    const cancelled = orders.filter((o) => o.order_status === "cancelled" || o.payment_status === "rejected")
    const monthPaid = paid.filter((o) => isCurrentMonth(o.created_at))

    return {
      monthRevenue: monthPaid.reduce((s, o) => s + Number(o.total), 0),
      monthPaidCount: monthPaid.length,
      pendingCount: pending.length,
      pendingTotal: pending.reduce((s, o) => s + Number(o.total), 0),
      expiredTotal: expired.reduce((s, o) => s + Number(o.total), 0),
      expiredCount: expired.length,
      totalOrders: orders.length,
      paidCount: paid.length,
      cancelledCount: cancelled.length,
    }
  }, [orders])

  const filtered = useMemo(() => {
    return orders
      .filter((o) => {
        const q = search.toLowerCase().trim()
        const matchSearch =
          !q ||
          o.order_number.toLowerCase().includes(q) ||
          o.customer_name?.toLowerCase().includes(q) ||
          o.customer_email?.toLowerCase().includes(q) ||
          o.customer_cpf_cnpj?.includes(q)
        const matchPayment = filterPayment === "all" || o.payment_status === filterPayment
        return matchSearch && matchPayment
      })
      .sort((a, b) => {
        let valA: string | number = ""
        let valB: string | number = ""
        if (sortField === "client") {
          valA = a.customer_name ?? ""
          valB = b.customer_name ?? ""
        }
        if (sortField === "order") {
          valA = a.order_number
          valB = b.order_number
        }
        if (sortField === "value") {
          valA = Number(a.total)
          valB = Number(b.total)
        }
        if (sortField === "payment") {
          valA = a.payment_status
          valB = b.payment_status
        }
        if (sortField === "status") {
          valA = a.order_status
          valB = b.order_status
        }
        if (sortField === "date") {
          valA = a.created_at
          valB = b.created_at
        }
        if (valA < valB) return sortDir === "asc" ? -1 : 1
        if (valA > valB) return sortDir === "asc" ? 1 : -1
        return 0
      })
  }, [orders, search, filterPayment, sortField, sortDir])

  if (!hasPermission("financeiro") && !isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <ShieldAlert className="h-16 w-16 text-muted-foreground/20 mb-4" />
        <h2 className="text-xl font-bold text-foreground mb-2">Acesso Restrito</h2>
        <p className="text-muted-foreground">Você não tem permissão para acessar o módulo Financeiro.</p>
      </div>
    )
  }

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"))
    else {
      setSortField(field)
      setSortDir("asc")
    }
  }

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null
    return sortDir === "asc" ? <ChevronUp className="h-3 w-3 inline ml-1" /> : <ChevronDown className="h-3 w-3 inline ml-1" />
  }

  const exportCSV = () => {
    const header = "Pedido,Cliente,Email,CPF/CNPJ,Itens,Total,Pagamento,Status,Data\n"
    const rows = filtered
      .map((o) =>
        [
          o.order_number,
          o.customer_name ?? "",
          o.customer_email ?? "",
          o.customer_cpf_cnpj ?? "",
          `"${itemsSummary(o.items)}"`,
          o.total,
          PAYMENT_LABELS[o.payment_status]?.label ?? o.payment_status,
          ORDER_STATUS_LABELS[o.order_status] ?? o.order_status,
          format(new Date(o.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR }),
        ].join(","),
      )
      .join("\n")
    const blob = new Blob(["\uFEFF" + header + rows], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = "compras-toro.csv"
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Financeiro</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Compras realizadas em{" "}
            <a href={SITE_URL} target="_blank" rel="noopener noreferrer" className="underline">
              toro-green.vercel.app
            </a>
          </p>
        </div>
        <button
          type="button"
          onClick={exportCSV}
          className="flex items-center gap-2 rounded-lg border border-[#E3DBCC] bg-[#FDFCF8] px-4 py-2.5 text-sm font-medium text-foreground hover:bg-[#F3F0E9] transition-all"
        >
          <Download className="h-4 w-4" />
          Exportar CSV
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="glass rounded-xl p-5 border border-[#E3DBCC]/60">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Receita do mês</p>
              <p className="text-2xl font-bold text-foreground mt-1">{formatToroPrice(stats.monthRevenue)}</p>
              <p className="text-xs text-muted-foreground mt-1">{stats.monthPaidCount} pedidos pagos</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#101010]/10">
              <TrendingUp className="h-5 w-5 text-[#101010]" />
            </div>
          </div>
        </div>

        <div className="glass rounded-xl p-5 border border-[#E3DBCC]/60">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Pendentes</p>
              <p className="text-2xl font-bold text-amber-700 mt-1">{stats.pendingCount}</p>
              <p className="text-xs text-muted-foreground mt-1">{formatToroPrice(stats.pendingTotal)} aguardando</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10">
              <Clock className="h-5 w-5 text-amber-700" />
            </div>
          </div>
        </div>

        <div className="glass rounded-xl p-5 border border-[#E3DBCC]/60">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Expirados</p>
              <p className="text-2xl font-bold text-red-600 mt-1">{formatToroPrice(stats.expiredTotal)}</p>
              <p className="text-xs text-muted-foreground mt-1">{stats.expiredCount} pedidos</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-500/10">
              <XCircle className="h-5 w-5 text-red-600" />
            </div>
          </div>
        </div>

        <div className="glass rounded-xl p-5 border border-[#E3DBCC]/60">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Total de pedidos</p>
              <p className="text-2xl font-bold text-foreground mt-1">{stats.totalOrders}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.paidCount} pagos · {stats.cancelledCount} cancelados
              </p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#101010]/10">
              <ShoppingBag className="h-5 w-5 text-[#101010]" />
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            placeholder="Buscar por pedido, cliente, CPF ou email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-10 w-full rounded-lg border border-[#E3DBCC] bg-[#FDFCF8] pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-[#101010] focus:outline-none"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={filterPayment}
            onChange={(e) => setFilterPayment(e.target.value)}
            className="h-10 rounded-lg border border-[#E3DBCC] bg-[#FDFCF8] px-3 text-sm"
          >
            <option value="all">Todos pagamentos</option>
            <option value="approved">Pago</option>
            <option value="pending">Pendente</option>
            <option value="expired">Expirado</option>
            <option value="rejected">Recusado</option>
          </select>
          <div className="flex rounded-lg border border-[#E3DBCC] overflow-hidden shrink-0">
            <button
              type="button"
              onClick={() => setView("list")}
              className={cn(
                "flex items-center gap-2 px-3 py-2 text-sm",
                view === "list" ? "bg-[#101010] text-[#FDFCF8] font-medium" : "text-muted-foreground hover:bg-[#F3F0E9]",
              )}
            >
              <List className="h-4 w-4" /> Listagem
            </button>
            <button
              type="button"
              onClick={() => setView("kanban")}
              className={cn(
                "flex items-center gap-2 px-3 py-2 text-sm",
                view === "kanban" ? "bg-[#101010] text-[#FDFCF8] font-medium" : "text-muted-foreground hover:bg-[#F3F0E9]",
              )}
            >
              <LayoutGrid className="h-4 w-4" /> Kanban
            </button>
          </div>
        </div>
      </div>

      {isLoading && (
        <div className="flex items-center gap-2 text-muted-foreground py-8 justify-center">
          <Loader2 className="h-5 w-5 animate-spin" /> Carregando compras…
        </div>
      )}

      {error && (
        <p className="text-sm text-destructive rounded-lg border border-red-200 bg-red-50 px-4 py-3">
          Erro ao carregar pedidos. Verifique a conexão com o banco.
        </p>
      )}

      {!isLoading && !error && orders.length === 0 && (
        <div className="glass rounded-xl border border-dashed border-[#E3DBCC] p-12 text-center">
          <ShoppingBag className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Nenhuma compra registrada ainda.</p>
          <p className="text-xs text-muted-foreground mt-1">
            Quando um cliente finalizar o checkout no site, o pedido aparecerá aqui.
          </p>
        </div>
      )}

      {!isLoading && orders.length > 0 && view === "kanban" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 overflow-x-auto pb-4">
          {KANBAN_COLUMNS.map((col) => {
            const colOrders = filtered.filter((o) => normalizeKanbanColumn(o) === col.id)
            const ColIcon = col.icon
            return (
              <div key={col.id} className="flex flex-col min-w-[240px] rounded-xl border border-[#E3DBCC]/80 bg-[#FDFCF8] overflow-hidden">
                <div className={cn("flex items-center justify-between px-3 py-2.5 border-b border-[#E3DBCC]/60", col.class)}>
                  <span className="flex items-center gap-2 text-sm font-semibold">
                    <ColIcon className="h-4 w-4" /> {col.label}
                  </span>
                  <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-[#FDFCF8]/90 text-xs font-bold">
                    {colOrders.length}
                  </span>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-2 max-h-[calc(100vh-320px)]">
                  {colOrders.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-4 text-center">Nenhum pedido</p>
                  ) : (
                    colOrders.map((order) => (
                      <div
                        key={order.id}
                        className="rounded-lg border border-[#E3DBCC]/60 bg-white p-3 shadow-sm hover:shadow transition-shadow"
                      >
                        <p className="font-mono text-[10px] text-muted-foreground">{order.order_number}</p>
                        <p className="font-medium text-foreground truncate mt-0.5">{order.customer_name ?? "—"}</p>
                        <p className="text-xs text-muted-foreground truncate">{order.customer_email ?? ""}</p>
                        <div className="flex items-center gap-1.5 mt-2 text-xs text-muted-foreground">
                          <Package className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate line-clamp-2">{itemsSummary(order.items)}</span>
                        </div>
                        <p className="text-sm font-semibold text-[#101010] mt-2">{formatToroPrice(Number(order.total))}</p>
                        <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(order.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {!isLoading && orders.length > 0 && view === "list" && (
        <div className="glass rounded-xl overflow-hidden border border-[#E3DBCC]/60">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#E3DBCC]/50">
            <p className="text-sm font-medium text-foreground">
              {filtered.length} pedido{filtered.length !== 1 ? "s" : ""} encontrado{filtered.length !== 1 ? "s" : ""}
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#E3DBCC]/50 bg-[#F3F0E9]/50">
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase cursor-pointer" onClick={() => handleSort("order")}>
                    Pedido <SortIcon field="order" />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase cursor-pointer" onClick={() => handleSort("client")}>
                    Cliente <SortIcon field="client" />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Itens</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase cursor-pointer" onClick={() => handleSort("value")}>
                    Total <SortIcon field="value" />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase cursor-pointer" onClick={() => handleSort("payment")}>
                    Pagamento <SortIcon field="payment" />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase cursor-pointer" onClick={() => handleSort("status")}>
                    Status <SortIcon field="status" />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase cursor-pointer" onClick={() => handleSort("date")}>
                    Data <SortIcon field="date" />
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.length > 0 ? (
                  filtered.map((order) => {
                    const payInfo = PAYMENT_LABELS[order.payment_status] ?? PAYMENT_LABELS.pending
                    const PayIcon = payInfo.icon
                    return (
                      <tr key={order.id} className="border-b border-[#E3DBCC]/30 hover:bg-[#F3F0E9]/30 transition-colors">
                        <td className="px-4 py-3 font-mono text-xs">{order.order_number}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#101010]/10 shrink-0">
                              <User className="h-4 w-4 text-[#101010]" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-foreground">{order.customer_name ?? "—"}</p>
                              <p className="text-xs text-muted-foreground">{order.customer_email ?? order.customer_cpf_cnpj ?? ""}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground max-w-[220px]">{itemsSummary(order.items)}</td>
                        <td className="px-4 py-3 font-semibold text-foreground">{formatToroPrice(Number(order.total))}</td>
                        <td className="px-4 py-3">
                          <span className={cn("inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium", payInfo.class)}>
                            <PayIcon className="h-3.5 w-3.5" />
                            {payInfo.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs">{ORDER_STATUS_LABELS[order.order_status] ?? order.order_status}</td>
                        <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                          {format(new Date(order.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                        </td>
                      </tr>
                    )
                  })
                ) : (
                  <tr>
                    <td colSpan={7} className="px-4 py-16 text-center">
                      <DollarSign className="h-10 w-10 text-muted-foreground/20 mx-auto mb-3" />
                      <p className="text-sm text-muted-foreground">Nenhum pedido encontrado para os filtros aplicados.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
