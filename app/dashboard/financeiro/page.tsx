"use client"
import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/lib/auth-context"
import {
  DollarSign, TrendingUp, TrendingDown, AlertCircle, CheckCircle2,
  Clock, Search, Download, Calendar, Package, User, ChevronDown, ChevronUp,
  CheckCircle, PauseCircle, XCircle, LayoutGrid, List
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import useSWR from "swr"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { ShieldAlert } from "lucide-react"
import type { Contract } from "@/lib/types"

const PAYMENT_STATUS_MAP: Record<string, { label: string; class: string; icon: typeof CheckCircle2 }> = {
  em_dia: { label: "Em Dia", class: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30", icon: CheckCircle2 },
  paid: { label: "Em Dia", class: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30", icon: CheckCircle2 },
  atrasado: { label: "Atrasado", class: "bg-red-500/15 text-red-400 border-red-500/30", icon: AlertCircle },
  overdue: { label: "Atrasado", class: "bg-red-500/15 text-red-400 border-red-500/30", icon: AlertCircle },
  pendente: { label: "Pendente", class: "bg-amber-500/15 text-amber-400 border-amber-500/30", icon: Clock },
  pending: { label: "Pendente", class: "bg-amber-500/15 text-amber-400 border-amber-500/30", icon: Clock },
  cancelado: { label: "Cancelado", class: "bg-zinc-500/15 text-zinc-400 border-zinc-500/30", icon: AlertCircle },
  cancelled: { label: "Cancelado", class: "bg-zinc-500/15 text-zinc-400 border-zinc-500/30", icon: AlertCircle },
  expirado: { label: "Expirado", class: "bg-red-500/15 text-red-400 border-red-500/30", icon: AlertCircle },
  expired: { label: "Expirado", class: "bg-red-500/15 text-red-400 border-red-500/30", icon: AlertCircle },
}

function normalizeProductStatus(s: string | null): string {
  if (!s) return ""
  const t = (s || "").toLowerCase().trim()
  if (t === "active" || t === "ativa") return "ativa"
  if (t === "inactive" || t === "inativa") return "inativa"
  if (t === "cancelled" || t === "cancelada") return "cancelada"
  if (t === "suspended" || t === "pendente") return "pendente"
  return t || s
}
const CONTRACT_STATUS_MAP: Record<string, { label: string; Icon: LucideIcon; class: string }> = {
  ativa: { label: "Produto ativo", Icon: CheckCircle, class: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
  active: { label: "Produto ativo", Icon: CheckCircle, class: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
  aguardando_produto: { label: "Aguardando produto", Icon: Clock, class: "bg-amber-500/15 text-amber-400 border-amber-500/30" },
  inativa: { label: "Produto inativo", Icon: PauseCircle, class: "bg-zinc-500/15 text-zinc-400 border-zinc-500/30" },
  inactive: { label: "Produto inativo", Icon: PauseCircle, class: "bg-zinc-500/15 text-zinc-400 border-zinc-500/30" },
  pendente: { label: "Produto vencido", Icon: AlertCircle, class: "bg-amber-500/15 text-amber-400 border-amber-500/30" },
  suspended: { label: "Produto vencido", Icon: AlertCircle, class: "bg-orange-500/15 text-orange-400 border-orange-500/30" },
  cancelada: { label: "Produto cancelado", Icon: XCircle, class: "bg-red-500/15 text-red-400 border-red-500/30" },
  cancelled: { label: "Produto cancelado", Icon: XCircle, class: "bg-red-500/15 text-red-400 border-red-500/30" },
}

type SortField = "client" | "product" | "value" | "status" | "payment" | "date"
type SortDir = "asc" | "desc"

const PAYMENT_KANBAN_COLUMNS = [
  { id: "em_dia", label: "Em dia", class: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30", icon: CheckCircle2 },
  { id: "pendente", label: "Pendente", class: "bg-amber-500/15 text-amber-400 border-amber-500/30", icon: Clock },
  { id: "expirado", label: "Expirado", class: "bg-red-600/15 text-red-500 border-red-600/30", icon: XCircle },
  { id: "cancelado", label: "Cancelado", class: "bg-zinc-500/15 text-zinc-400 border-zinc-500/30", icon: XCircle },
] as const

function normalizePaymentForKanban(payment_status: string | null | undefined): string {
  const p = (payment_status ?? "").toString().toLowerCase().trim()
  if (p === "em_dia" || p === "paid") return "em_dia"
  if (p === "pendente" || p === "pending") return "pendente"
  if (p === "atrasado" || p === "overdue") return "expirado"
  if (p === "expirado" || p === "expired") return "expirado"
  if (p === "cancelado" || p === "cancelled") return "cancelado"
  return "pendente"
}

export default function FinanceiroPage() {
  const { hasPermission, isAdmin } = useAuth()
  const supabase = createClient()
  const [view, setView] = useState<"list" | "kanban">("kanban")
  const [search, setSearch] = useState("")
  const [filterPayment, setFilterPayment] = useState("all")
  const [filterStatus, setFilterStatus] = useState("all")
  const [filterProduct, setFilterProduct] = useState("all")
  const [sortField, setSortField] = useState<SortField>("date")
  const [sortDir, setSortDir] = useState<SortDir>("desc")

  if (!hasPermission("financeiro") && !isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <ShieldAlert className="h-16 w-16 text-muted-foreground/20 mb-4" />
        <h2 className="text-xl font-bold text-foreground mb-2">Acesso Restrito</h2>
        <p className="text-muted-foreground">Voce nao tem permissao para acessar o modulo Financeiro.</p>
      </div>
    )
  }

  const { data: contracts } = useSWR("financeiro-contracts", async () => {
    const { data } = await supabase
      .from("contracts")
      .select("*, clients(name, email, cpf_cnpj, phone), products(name, icon)")
      .order("created_at", { ascending: false })
    return (data || []) as (Contract & { clients: { name: string; email: string; cpf_cnpj: string; phone: string } | null; products: { name: string; icon: string } | null })[]
  })

  const { data: products } = useSWR("products-for-filter", async () => {
    const { data } = await supabase.from("products").select("id, name").order("name")
    return data || []
  })

  // Stats
  const isContratoAtivo = (c: { status?: string | null }) => {
    const s = (c.status ?? "").toString().toLowerCase()
    return s === "ativa" || s === "active" || s === "aguardando_produto"
  }
  const totalAtivos = contracts?.filter(isContratoAtivo).length ?? 0
  const totalInativos = (contracts?.length ?? 0) - totalAtivos
  const activeContracts = contracts?.filter(c => c.status === "ativa" || c.status === "active") || []
  const contractsEmDia = contracts?.filter(c => {
    const p = (c.payment_status ?? "").toString().toLowerCase()
    return p === "em_dia" || p === "paid"
  }) || []
  const expiredContracts = contracts?.filter(c => c.payment_status === "expirado" || c.payment_status === "expired") || []
  const pendingContracts = contracts?.filter(c => c.payment_status === "pendente" || c.payment_status === "pending") || []
  const monthlyRevenue = contractsEmDia.reduce((sum, c) => sum + Number(c.monthly_value ?? 0), 0)
  const expiredRevenue = expiredContracts.reduce((sum, c) => sum + Number(c.monthly_value), 0)

  // Filter & sort
  const filtered = contracts?.filter(c => {
    const matchSearch = !search ||
      c.clients?.name?.toLowerCase().includes(search.toLowerCase()) ||
      c.clients?.cpf_cnpj?.includes(search) ||
      c.clients?.email?.toLowerCase().includes(search.toLowerCase())
    const matchPayment = filterPayment === "all" || c.payment_status === filterPayment
    const matchStatus = filterStatus === "all" || c.status === filterStatus
    const matchProduct = filterProduct === "all" || c.product_id === filterProduct
    return matchSearch && matchPayment && matchStatus && matchProduct
  }).sort((a, b) => {
    let valA: string | number = ""
    let valB: string | number = ""
    if (sortField === "client") { valA = a.clients?.name || ""; valB = b.clients?.name || "" }
    if (sortField === "product") { valA = a.products?.name || ""; valB = b.products?.name || "" }
    if (sortField === "value") { valA = Number(a.monthly_value); valB = Number(b.monthly_value) }
    if (sortField === "status") { valA = a.status; valB = b.status }
    if (sortField === "payment") { valA = a.payment_status; valB = b.payment_status }
    if (sortField === "date") { valA = a.created_at; valB = b.created_at }
    if (valA < valB) return sortDir === "asc" ? -1 : 1
    if (valA > valB) return sortDir === "asc" ? 1 : -1
    return 0
  }) || []

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortDir(d => d === "asc" ? "desc" : "asc")
    else { setSortField(field); setSortDir("asc") }
  }

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null
    return sortDir === "asc" ? <ChevronUp className="h-3 w-3 inline ml-1" /> : <ChevronDown className="h-3 w-3 inline ml-1" />
  }

  const exportCSV = () => {
    const header = "Cliente,CPF/CNPJ,Produto,Contratacao,Status Pagamento,Valor Mensal,Data Inicio\n"
    const rows = filtered.map(c =>
      `"${c.clients?.name || ""}","${c.clients?.cpf_cnpj || ""}","${c.products?.name || ""}","${c.status}","${c.payment_status}","${c.monthly_value}","${c.start_date}"`
    ).join("\n")
    const blob = new Blob(["\uFEFF" + header + rows], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = "financeiro.csv"
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Financeiro</h2>
          <p className="text-sm text-muted-foreground mt-1">Visao geral de receitas e pagamentos</p>
        </div>
        <button
          onClick={exportCSV}
          className="flex items-center gap-2 rounded-lg border border-border bg-secondary px-4 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:border-primary/50 transition-all"
        >
          <Download className="h-4 w-4" />
          Exportar CSV
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="glass rounded-xl p-5 glow-blue-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Receita Mensal</p>
              <p className="text-2xl font-bold text-foreground mt-1">
                R$ {monthlyRevenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </p>
              <p className="text-xs text-emerald-400 mt-1">{contractsEmDia.length} contratos em dia</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10">
              <TrendingUp className="h-5 w-5 text-emerald-400" />
            </div>
          </div>
        </div>

        <div className="glass rounded-xl p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Expirados</p>
              <p className="text-2xl font-bold text-red-400 mt-1">
                R$ {expiredRevenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </p>
              <p className="text-xs text-red-400/70 mt-1">{expiredContracts.length} contratos</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-500/10">
              <TrendingDown className="h-5 w-5 text-red-400" />
            </div>
          </div>
        </div>

        <div className="glass rounded-xl p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Pendentes</p>
              <p className="text-2xl font-bold text-amber-400 mt-1">{pendingContracts.length}</p>
              <p className="text-xs text-amber-400/70 mt-1">aguardando pagamento</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10">
              <Clock className="h-5 w-5 text-amber-400" />
            </div>
          </div>
        </div>

        <div className="glass rounded-xl p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Contratos</p>
              <p className="text-2xl font-bold text-foreground mt-1">{contracts?.length || 0}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {totalAtivos} ativos / {totalInativos} inativos
              </p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <DollarSign className="h-5 w-5 text-primary" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters + View toggle */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            placeholder="Buscar por cliente, CPF/CNPJ ou email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-10 w-full rounded-lg border border-border bg-secondary pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
          />
        </div>
        <div className="flex rounded-lg border border-border overflow-hidden shrink-0">
          <button
            type="button"
            title="Listagem"
            onClick={() => setView("list")}
            className={cn("flex items-center gap-2 px-3 py-2 text-sm", view === "list" ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:bg-secondary")}
          >
            <List className="h-4 w-4" /> Listagem
          </button>
          <button
            type="button"
            title="Kanban (por status de pagamento)"
            onClick={() => setView("kanban")}
            className={cn("flex items-center gap-2 px-3 py-2 text-sm", view === "kanban" ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:bg-secondary")}
          >
            <LayoutGrid className="h-4 w-4" /> Kanban
          </button>
        </div>
      </div>

      {view === "kanban" ? (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 overflow-x-auto pb-4">
          {PAYMENT_KANBAN_COLUMNS.map((col) => {
            const colContracts = filtered.filter((c) => normalizePaymentForKanban(c.payment_status) === col.id)
            const ColIcon = col.icon
            return (
              <div key={col.id} className="flex flex-col min-w-[240px] rounded-xl border border-border bg-card/50 overflow-hidden">
                <div className={cn("flex items-center justify-between px-3 py-2.5 border-b border-border", col.class)}>
                  <span className="flex items-center gap-2 text-sm font-semibold">
                    <ColIcon className="h-4 w-4" /> {col.label}
                  </span>
                  <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-background/80 text-xs font-bold">{colContracts.length}</span>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-2 max-h-[calc(100vh-320px)]">
                  {colContracts.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-4 text-center">Nenhum contrato</p>
                  ) : (
                    colContracts.map((contract) => (
                      <div
                        key={contract.id}
                        className="rounded-lg border border-border bg-background p-3 shadow-sm hover:shadow transition-shadow"
                      >
                        <p className="font-medium text-foreground truncate">{contract.clients?.name || "—"}</p>
                        <p className="text-xs text-muted-foreground truncate mt-0.5">{contract.clients?.email || contract.clients?.cpf_cnpj || ""}</p>
                        <div className="flex items-center gap-1.5 mt-2 text-xs text-muted-foreground">
                          <Package className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">{contract.products?.name || "—"}</span>
                        </div>
                        <p className="text-sm font-semibold text-primary mt-2">
                          R$ {Number(contract.monthly_value).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </p>
                        <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {contract.start_date ? format(new Date(contract.start_date + "T00:00:00"), "dd/MM/yyyy", { locale: ptBR }) : "—"}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
      /* Contracts Table */
      <div className="glass rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
          <p className="text-sm font-medium text-foreground">
            {filtered.length} contrato{filtered.length !== 1 ? "s" : ""} encontrado{filtered.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-secondary/30">
                <th
                  className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide cursor-pointer hover:text-foreground transition-colors"
                  onClick={() => handleSort("client")}
                >
                  Cliente <SortIcon field="client" />
                </th>
                <th
                  className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide cursor-pointer hover:text-foreground transition-colors"
                  onClick={() => handleSort("product")}
                >
                  Produto <SortIcon field="product" />
                </th>
                <th
                  className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide cursor-pointer hover:text-foreground transition-colors"
                  onClick={() => handleSort("status")}
                >
                  Produto <SortIcon field="status" />
                </th>
                <th
                  className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide cursor-pointer hover:text-foreground transition-colors"
                  onClick={() => handleSort("payment")}
                >
                  Pagamento <SortIcon field="payment" />
                </th>
                <th
                  className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide cursor-pointer hover:text-foreground transition-colors"
                  onClick={() => handleSort("value")}
                >
                  Valor/Mes <SortIcon field="value" />
                </th>
                <th
                  className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide cursor-pointer hover:text-foreground transition-colors"
                  onClick={() => handleSort("date")}
                >
                  Inicio <SortIcon field="date" />
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.length > 0 ? (
                filtered.map((contract) => {
                  const payInfo = PAYMENT_STATUS_MAP[contract.payment_status] || PAYMENT_STATUS_MAP.pendente
                  const PayIcon = payInfo.icon
                  const statusNorm = normalizeProductStatus(contract.status)
                  const statusInfo = CONTRACT_STATUS_MAP[statusNorm] || CONTRACT_STATUS_MAP[contract.status] || CONTRACT_STATUS_MAP.pendente
                  const StatusIcon = statusInfo.Icon
                  return (
                    <tr key={contract.id} className="border-b border-border/30 hover:bg-secondary/20 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 shrink-0">
                            <User className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground">{contract.clients?.name || "---"}</p>
                            <p className="text-xs text-muted-foreground font-mono">{contract.clients?.cpf_cnpj || ""}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Package className="h-4 w-4 text-muted-foreground shrink-0" />
                          <span className="text-sm text-foreground">{contract.products?.name || "---"}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span title={statusInfo.label} className={cn("inline-flex items-center justify-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium", statusInfo.class)}>
                          <StatusIcon className="h-3.5 w-3.5 shrink-0" />
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <PayIcon className={cn("h-3.5 w-3.5", payInfo.class.split(" ").find(c => c.startsWith("text-")))} />
                          <span className={cn("text-sm font-medium", payInfo.class.split(" ").find(c => c.startsWith("text-")))}>
                            {payInfo.label}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm font-semibold text-foreground">
                          R$ {Number(contract.monthly_value).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          <Calendar className="h-3.5 w-3.5" />
                          {contract.start_date
                            ? format(new Date(contract.start_date + "T00:00:00"), "dd/MM/yyyy", { locale: ptBR })
                            : "---"}
                        </div>
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan={6} className="px-4 py-16 text-center">
                    <DollarSign className="h-10 w-10 text-muted-foreground/20 mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">
                      {search || filterPayment !== "all" || filterStatus !== "all"
                        ? "Nenhum contrato encontrado para os filtros aplicados."
                        : "Nenhum contrato registrado."}
                    </p>
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
