"use client"

import { useMemo, useState } from "react"
import useSWR from "swr"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import {
  Search,
  Users,
  Loader2,
  Mail,
  Phone,
  ShoppingBag,
  LayoutGrid,
  List,
  ShieldAlert,
  User,
  Plus,
} from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { formatToroPrice } from "@/lib/products/catalog"
import { formatCpfCnpjForDisplayOrDash } from "@/lib/clients/cpf-cnpj-display"
import { cn } from "@/lib/utils"
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
import type { StoreCustomerSegment } from "@/lib/db/repositories/toro-customers.repository"

const SITE_URL = "https://toro-green.vercel.app"

type StoreCustomer = {
  customer_key: string
  name: string | null
  email: string | null
  phone: string | null
  cpf_cnpj: string | null
  order_count: number
  paid_count: number
  total_spent: number
  last_order_at: string
  last_order_number: string | null
  last_order_status: string | null
  last_payment_status: string | null
  last_order_total: number
  segment: StoreCustomerSegment
  source?: "checkout" | "manual"
  notes?: string | null
}

const SEGMENT_TABS: { id: "all" | StoreCustomerSegment; label: string; class: string }[] = [
  { id: "all", label: "Todos", class: "bg-[#101010] text-[#FDFCF8]" },
  { id: "comprou", label: "Comprou", class: "bg-[#101010]/10 text-[#101010] border-[#E3DBCC]" },
  { id: "recorrente", label: "Recorrente", class: "bg-[#E3DBCC] text-[#101010]" },
  { id: "pendente", label: "Aguardando pagamento", class: "bg-amber-500/15 text-amber-800" },
  { id: "cancelado", label: "Cancelado", class: "bg-red-500/15 text-red-700" },
  { id: "novo", label: "Novo", class: "bg-[#F3F0E9] text-[#101010]" },
]

const SEGMENT_LABELS: Record<StoreCustomerSegment, string> = {
  comprou: "Comprou",
  recorrente: "Recorrente",
  pendente: "Aguardando pagamento",
  cancelado: "Cancelado",
  novo: "Novo",
}

const ORDER_STATUS_LABELS: Record<string, string> = {
  pending_payment: "Aguardando pagamento",
  paid: "Pago",
  processing: "Em separação",
  shipped: "Enviado",
  delivered: "Entregue",
  cancelled: "Cancelado",
}

const PAYMENT_LABELS: Record<string, string> = {
  pending: "Pendente",
  approved: "Aprovado",
  expired: "Expirado",
  rejected: "Recusado",
}

async function fetchCustomers(): Promise<{ customers: StoreCustomer[]; warning?: string }> {
  const res = await fetch("/api/store-customers", { credentials: "include", cache: "no-store" })
  const json = await res.json()
  if (!res.ok) throw new Error(json.error || "Erro ao carregar clientes")
  return json
}

export default function ClientesPage() {
  const { hasPermission, isAdmin } = useAuth()
  const [search, setSearch] = useState("")
  const [filterTab, setFilterTab] = useState<"all" | StoreCustomerSegment>("all")
  const [view, setView] = useState<"list" | "grid">("list")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    cpf_cnpj: "",
    notes: "",
  })

  const { data, error, isLoading, mutate } = useSWR("store-customers", fetchCustomers)
  const customers = data?.customers ?? []
  const warning = data?.warning

  const countByTab = useMemo(() => {
    const counts: Record<string, number> = { all: customers.length }
    for (const c of customers) {
      counts[c.segment] = (counts[c.segment] ?? 0) + 1
    }
    return counts
  }, [customers])

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    return customers.filter((c) => {
      const matchTab = filterTab === "all" || c.segment === filterTab
      const matchSearch =
        !q ||
        c.name?.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q) ||
        c.phone?.includes(q) ||
        c.cpf_cnpj?.includes(q) ||
        c.last_order_number?.toLowerCase().includes(q)
      return matchTab && matchSearch
    })
  }, [customers, search, filterTab])

  const resetForm = () => {
    setForm({ name: "", email: "", phone: "", cpf_cnpj: "", notes: "" })
  }

  const handleCreateCustomer = async () => {
    if (!form.name.trim()) {
      toast.error("Informe o nome do cliente.")
      return
    }
    if (!form.email.trim() && !form.phone.trim() && !form.cpf_cnpj.trim()) {
      toast.error("Informe ao menos e-mail, telefone ou CPF/CNPJ.")
      return
    }

    setSaving(true)
    try {
      const res = await fetch("/api/store-customers", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim() || null,
          phone: form.phone.trim() || null,
          cpf_cnpj: form.cpf_cnpj.trim() || null,
          notes: form.notes.trim() || null,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Erro ao cadastrar cliente")

      await mutate(
        (prev) => ({
          customers: [json.customer, ...(prev?.customers ?? [])],
          warning: prev?.warning,
        }),
        { revalidate: true },
      )
      toast.success("Cliente cadastrado!")
      resetForm()
      setDialogOpen(false)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao cadastrar cliente.")
    } finally {
      setSaving(false)
    }
  }

  if (!hasPermission("clientes") && !isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <ShieldAlert className="h-16 w-16 text-muted-foreground/20 mb-4" />
        <h2 className="text-xl font-bold text-foreground mb-2">Acesso Restrito</h2>
        <p className="text-muted-foreground">Você não tem permissão para acessar Clientes.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Clientes</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Compradores do site{" "}
            <a href={SITE_URL} target="_blank" rel="noopener noreferrer" className="underline">
              toro-green.vercel.app
            </a>{" "}
            e cadastros manuais. Cada linha agrupa os pedidos do mesmo cliente.
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
              Adicionar cliente
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Novo cliente</DialogTitle>
              <DialogDescription>
                Cadastre manualmente um cliente que ainda não comprou no site.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div>
                <Label htmlFor="customer-name">Nome *</Label>
                <Input
                  id="customer-name"
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  placeholder="Nome completo"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="customer-email">E-mail</Label>
                <Input
                  id="customer-email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                  placeholder="cliente@email.com"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="customer-phone">Telefone</Label>
                <Input
                  id="customer-phone"
                  value={form.phone}
                  onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                  placeholder="(11) 99999-9999"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="customer-cpf">CPF / CNPJ</Label>
                <Input
                  id="customer-cpf"
                  value={form.cpf_cnpj}
                  onChange={(e) => setForm((p) => ({ ...p, cpf_cnpj: e.target.value }))}
                  placeholder="000.000.000-00"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="customer-notes">Observações</Label>
                <Input
                  id="customer-notes"
                  value={form.notes}
                  onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                  placeholder="Opcional"
                  className="mt-1"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                * Informe ao menos e-mail, telefone ou CPF/CNPJ.
              </p>
              <Button
                onClick={handleCreateCustomer}
                disabled={saving}
                className="w-full bg-[#101010] text-[#FDFCF8] hover:bg-[#101010]/90"
              >
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Salvando…
                  </>
                ) : (
                  "Salvar cliente"
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="glass rounded-xl p-5 border border-[#E3DBCC]/60">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Total de clientes</p>
          <p className="text-2xl font-bold text-foreground mt-1">{customers.length}</p>
        </div>
        <div className="glass rounded-xl p-5 border border-[#E3DBCC]/60">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Com compra paga</p>
          <p className="text-2xl font-bold text-foreground mt-1">
            {customers.filter((c) => c.paid_count > 0).length}
          </p>
        </div>
        <div className="glass rounded-xl p-5 border border-[#E3DBCC]/60">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Recorrentes</p>
          <p className="text-2xl font-bold text-foreground mt-1">
            {customers.filter((c) => c.segment === "recorrente").length}
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            placeholder="Buscar por nome, e-mail, telefone, CPF ou pedido..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-10 w-full rounded-lg border border-[#E3DBCC] bg-[#FDFCF8] pl-10 pr-4 text-sm focus:border-[#101010] focus:outline-none"
          />
        </div>
        <div className="flex rounded-lg border border-[#E3DBCC] overflow-hidden shrink-0">
          <button
            type="button"
            onClick={() => setView("list")}
            className={cn(
              "flex items-center gap-2 px-3 py-2 text-sm",
              view === "list" ? "bg-[#101010] text-[#FDFCF8]" : "hover:bg-[#F3F0E9]",
            )}
          >
            <List className="h-4 w-4" /> Listagem
          </button>
          <button
            type="button"
            onClick={() => setView("grid")}
            className={cn(
              "flex items-center gap-2 px-3 py-2 text-sm",
              view === "grid" ? "bg-[#101010] text-[#FDFCF8]" : "hover:bg-[#F3F0E9]",
            )}
          >
            <LayoutGrid className="h-4 w-4" /> Cards
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {SEGMENT_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setFilterTab(tab.id)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
              filterTab === tab.id ? tab.class : "border-[#E3DBCC] bg-[#FDFCF8] text-muted-foreground hover:bg-[#F3F0E9]",
            )}
          >
            {tab.label} ({countByTab[tab.id] ?? 0})
          </button>
        ))}
      </div>

      {isLoading && (
        <div className="flex items-center gap-2 text-muted-foreground py-8 justify-center">
          <Loader2 className="h-5 w-5 animate-spin" /> Carregando clientes…
        </div>
      )}

      {error && (
        <p className="text-sm text-destructive rounded-lg border border-red-200 bg-red-50 px-4 py-3">
          Erro ao carregar clientes da loja.
        </p>
      )}

      {warning && (
        <p className="text-sm text-amber-900 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">{warning}</p>
      )}

      {!isLoading && !error && customers.length === 0 && (
        <div className="glass rounded-xl border border-dashed border-[#E3DBCC] p-12 text-center">
          <Users className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Nenhum cliente cadastrado ainda.</p>
          <p className="text-xs text-muted-foreground mt-1">
            Use <strong>Adicionar cliente</strong> ou aguarde uma compra no site.
          </p>
        </div>
      )}

      {!isLoading && filtered.length > 0 && view === "list" && (
        <div className="glass rounded-xl overflow-hidden border border-[#E3DBCC]/60">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#E3DBCC]/50 bg-[#F3F0E9]/50">
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Cliente</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Contato</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Pedidos</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Total gasto</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Último pedido</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((client) => (
                <tr key={client.customer_key} className="border-b border-[#E3DBCC]/30 hover:bg-[#F3F0E9]/30">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#101010]/10">
                        <User className="h-4 w-4 text-[#101010]" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{client.name ?? "—"}</p>
                        <p className="text-xs text-muted-foreground font-mono">
                          {formatCpfCnpjForDisplayOrDash(client.cpf_cnpj)}
                        </p>
                        {client.source === "manual" && (
                          <span className="mt-0.5 inline-flex rounded-full bg-[#F3F0E9] px-1.5 py-0.5 text-[9px] font-semibold uppercase text-[#101010]">
                            Manual
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {client.email && (
                      <p className="flex items-center gap-1">
                        <Mail className="h-3 w-3" /> {client.email}
                      </p>
                    )}
                    {client.phone && (
                      <p className="flex items-center gap-1 mt-0.5">
                        <Phone className="h-3 w-3" /> {client.phone}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1 font-medium">
                      <ShoppingBag className="h-3.5 w-3.5" /> {client.order_count}
                    </span>
                    {client.paid_count > 0 && (
                      <p className="text-[10px] text-muted-foreground">{client.paid_count} pago(s)</p>
                    )}
                  </td>
                  <td className="px-4 py-3 font-semibold">{formatToroPrice(Number(client.total_spent))}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full border border-[#E3DBCC] bg-[#F3F0E9] px-2 py-0.5 text-[10px] font-semibold uppercase">
                      {SEGMENT_LABELS[client.segment]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {client.last_order_number ? (
                      <>
                        <p className="font-mono">{client.last_order_number}</p>
                        <p>{formatToroPrice(Number(client.last_order_total))}</p>
                        <p className="mt-0.5">
                          {PAYMENT_LABELS[client.last_payment_status ?? ""] ?? client.last_payment_status} ·{" "}
                          {ORDER_STATUS_LABELS[client.last_order_status ?? ""] ?? client.last_order_status}
                        </p>
                        <p>{format(new Date(client.last_order_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}</p>
                      </>
                    ) : (
                      <p>Sem pedidos · cadastro manual</p>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!isLoading && filtered.length > 0 && view === "grid" && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((client) => (
            <div key={client.customer_key} className="glass rounded-xl border border-[#E3DBCC]/60 p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-foreground">{client.name ?? "Cliente"}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{client.email ?? client.phone ?? "—"}</p>
                </div>
                <span className="rounded-full border border-[#E3DBCC] bg-[#F3F0E9] px-2 py-0.5 text-[10px] font-semibold uppercase shrink-0">
                  {SEGMENT_LABELS[client.segment]}
                </span>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <p className="text-muted-foreground">Pedidos</p>
                  <p className="font-semibold text-foreground">{client.order_count}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Total gasto</p>
                  <p className="font-semibold text-foreground">{formatToroPrice(Number(client.total_spent))}</p>
                </div>
              </div>
              <p className="mt-3 text-[10px] text-muted-foreground font-mono">{client.last_order_number}</p>
            </div>
          ))}
        </div>
      )}

      {!isLoading && customers.length > 0 && filtered.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-8">Nenhum cliente encontrado para os filtros aplicados.</p>
      )}
    </div>
  )
}
