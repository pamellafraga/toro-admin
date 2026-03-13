"use client"
import { useState, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import {
  Search, Plus, X, Save, Users, MapPin, Mail, Phone,
  LayoutGrid, List, Filter, Pencil, CheckCircle, XCircle, Building2, Trash2, Upload, Loader2
} from "lucide-react"
import useSWR from "swr"
import type { Client } from "@/lib/types"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"

const ORIGEM_CAPTACAO_OPCOES = [
  "Comercial - Lisete",
  "Website",
  "Comercial - Pamella",
  "Comercial - Roberto",
] as const

const STATUS_LEAD_OPCOES = [
  { id: "all", label: "Todos", btn: "bg-blue-600 hover:bg-blue-500 text-white", inactive: "bg-blue-600/25 text-blue-300 hover:bg-blue-600/40" },
  { id: "novo", label: "Novo", btn: "bg-cyan-600 hover:bg-cyan-500 text-white", inactive: "bg-cyan-600/25 text-cyan-300 hover:bg-cyan-600/40" },
  { id: "contratando", label: "Contratando", btn: "bg-amber-600 hover:bg-amber-500 text-white", inactive: "bg-amber-600/25 text-amber-300 hover:bg-amber-600/40" },
  { id: "negociando", label: "Negociando", btn: "bg-violet-600 hover:bg-violet-500 text-white", inactive: "bg-violet-600/25 text-violet-300 hover:bg-violet-600/40" },
  { id: "ativo", label: "Ativo", btn: "bg-emerald-600 hover:bg-emerald-500 text-white", inactive: "bg-emerald-600/25 text-emerald-300 hover:bg-emerald-600/40" },
  { id: "perdido", label: "Perdido", btn: "bg-red-600 hover:bg-red-500 text-white", inactive: "bg-red-600/25 text-red-300 hover:bg-red-600/40" },
] as const

const CONTRACT_STATUS_MAP: Record<string, { label: string; class: string }> = {
  active: { label: "Ativa", class: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" },
  ativa: { label: "Ativa", class: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" },
  aguardando_produto: { label: "Aguardando produto", class: "bg-amber-500/10 text-amber-400 border-amber-500/30" },
  inactive: { label: "Inativa", class: "bg-gray-500/10 text-gray-400 border-gray-500/30" },
  inativa: { label: "Inativa", class: "bg-gray-500/10 text-gray-400 border-gray-500/30" },
  suspended: { label: "Suspensa", class: "bg-amber-500/10 text-amber-400 border-amber-500/30" },
  pendente: { label: "Pendente", class: "bg-amber-500/10 text-amber-400 border-amber-500/30" },
  cancelled: { label: "Cancelada", class: "bg-red-500/10 text-red-400 border-red-500/30" },
  cancelada: { label: "Cancelada", class: "bg-red-500/10 text-red-400 border-red-500/30" },
}

export default function ClientesPage() {
  const supabase = createClient()
  const [search, setSearch] = useState("")
  const [showAdd, setShowAdd] = useState(false)
  const [view, setView] = useState<"grid" | "list">("list")
  const [filterTab, setFilterTab] = useState<"all" | "novo" | "contratando" | "negociando" | "ativo" | "perdido">("all")
  const [filterOrigem, setFilterOrigem] = useState("all")
  const [showImport, setShowImport] = useState(false)
  const [importText, setImportText] = useState("")
  const [importing, setImporting] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [editForm, setEditForm] = useState<Partial<Client>>({})
  const [newClient, setNewClient] = useState({
    name: "",
    email: "",
    phone: "",
    cpf_cnpj: "",
    company_name: "",
    address: "",
    number: "",
    district: "",
    city: "",
    state: "",
    zip_code: "",
    notes: "",
    origem_captacao: "",
    status_lead: "novo",
  })

  const formatCpfCnpj = (value: string) => {
    const digits = value.replace(/\D/g, "")
    if (digits.length <= 11) {
      // CPF: 000.000.000-00
      return digits
        .replace(/(\d{3})(\d)/, "$1.$2")
        .replace(/(\d{3})(\d)/, "$1.$2")
        .replace(/(\d{3})(\d{1,2})$/, "$1-$2")
    }
    // CNPJ: 00.000.000/0000-00
    return digits
      .replace(/^(\d{2})(\d)/, "$1.$2")
      .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
      .replace(/\.(\d{3})(\d)/, ".$1/$2")
      .replace(/(\d{4})(\d{1,2})$/, "$1-$2")
  }

  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, "")
    if (digits.length <= 10) {
      // Fixo: (00) 0000-0000
      return digits
        .replace(/(\d{2})(\d)/, "($1) $2")
        .replace(/(\d{4})(\d)/, "$1-$2")
    }
    // Celular: (00) 00000-0000
    return digits
      .replace(/(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{5})(\d)/, "$1-$2")
  }

  const { data: clients, mutate } = useSWR("clients-list", async () => {
    const { data } = await supabase.from("clients").select("*").order("name").range(0, 9999)
    return (data || []) as Client[]
  })

  const { data: contractsByClient } = useSWR("contracts-by-client", async () => {
    const { data } = await supabase.from("contracts").select("client_id, status").order("created_at", { ascending: false }).range(0, 9999)
    const map = new Map<string, string>()
    ;(data || []).forEach((r: { client_id: string; status: string }) => {
      if (!map.has(r.client_id)) map.set(r.client_id, r.status)
    })
    return map
  })

  const getStatusLead = (c: Client) => (c.status_lead || "contratando") as string
  const getContractStatus = (clientId: string) => contractsByClient?.get(clientId) ?? null
  const countByTab = (id: "all" | "novo" | "contratando" | "negociando" | "ativo" | "perdido") => {
    if (!clients) return 0
    if (id === "all") return clients.length
    return clients.filter((c) => getStatusLead(c) === id).length
  }

  const filtered = clients?.filter((c) => {
    const matchSearch = !search ||
      (c.name || "").toLowerCase().includes(search.toLowerCase()) ||
      (c.cpf_cnpj || "").includes(search) ||
      (c.email || "").toLowerCase().includes(search.toLowerCase()) ||
      (c.phone || "").includes(search)
    const matchTab = filterTab === "all" || getStatusLead(c) === filterTab
    const matchOrigem = filterOrigem === "all" ||
      (filterOrigem === "none" && !(c.origem_captacao || "").trim()) ||
      (filterOrigem !== "none" && (c.origem_captacao || "") === filterOrigem)
    return matchSearch && matchTab && matchOrigem
  })

  const handleAdd = async () => {
    if (!newClient.name) {
      toast.error("Nome obrigatório")
      return
    }
    try {
      const addressParts = [newClient.address, newClient.number, newClient.district, newClient.city, newClient.state, newClient.zip_code].filter(Boolean)
      const addressFull = addressParts.length ? addressParts.join(", ") : null
      const payload: Record<string, unknown> = {
        name: newClient.name,
        email: newClient.email || null,
        phone: newClient.phone || null,
        cpf_cnpj: (newClient.cpf_cnpj || "").replace(/\D/g, "") || null,
        company: newClient.company_name || null,
        address: addressFull,
        origem_captacao: newClient.origem_captacao || null,
        status_lead: newClient.status_lead || "novo",
      }
      if (!payload.cpf_cnpj) payload.cpf_cnpj = `sem-cpf-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
      const { error } = await supabase.from("clients").insert(payload)
      if (error) {
        toast.error("Erro ao salvar: " + error.message)
        return
      }
      toast.success("Cliente salvo com sucesso")
      setShowAdd(false)
      setNewClient({
        name: "",
        email: "",
        phone: "",
        cpf_cnpj: "",
        company_name: "",
        address: "",
        number: "",
        district: "",
        city: "",
        state: "",
        zip_code: "",
        notes: "",
        origem_captacao: "",
        status_lead: "novo",
      })
      mutate()
    } catch (err) {
      toast.error("Erro inesperado ao salvar cliente")
    }
  }

  const parseImportRows = (text: string): { name: string; email: string; phone: string; cpf_cnpj: string; company_name: string }[] => {
    const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
    const rows: { name: string; email: string; phone: string; cpf_cnpj: string; company_name: string }[] = []
    const sep = text.includes(";") ? ";" : ","
    let start = 0
    if (lines.length > 0) {
      const first = lines[0].toLowerCase()
      if (first.includes("nome") || first.includes("name") || first.includes("email") || first === "nome" || first === "name") start = 1
    }
    for (let i = start; i < lines.length; i++) {
      const parts = lines[i].split(sep).map((p) => p.trim().replace(/^["']|["']$/g, ""))
      const name = parts[0] || ""
      if (!name) continue
      const email = parts[1] ?? ""
      const phone = parts[2] ?? ""
      const cpf_cnpj = (parts[3] ?? "").replace(/\D/g, "")
      const company_name = parts[4] ?? ""
      rows.push({ name, email, phone, cpf_cnpj, company_name })
    }
    return rows
  }

  const handleImport = async () => {
    const rows = parseImportRows(importText)
    if (rows.length === 0) {
      toast.error("Cole ou importe um arquivo com pelo menos uma linha (nome obrigatório). Colunas: Nome; Email; Telefone; CPF/CNPJ; Empresa")
      return
    }
    setImporting(true)
    let ok = 0
    let err = 0
    const ts = Date.now()
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i]
      const cpfCnpj = r.cpf_cnpj && (r.cpf_cnpj.length === 11 || r.cpf_cnpj.length === 14) ? r.cpf_cnpj : `import-${ts}-${i}`
      const payload: Record<string, unknown> = {
        name: r.name,
        email: r.email || null,
        phone: r.phone || null,
        cpf_cnpj: cpfCnpj,
        company: r.company_name || null,
        address: null,
        origem_captacao: null,
        status_lead: "novo",
      }
      const { error } = await supabase.from("clients").insert(payload)
      if (error) {
        err++
        if (err <= 2) toast.error(`Linha ${i + 1}: ${error.message}`)
      } else ok++
    }
    setImporting(false)
    setShowImport(false)
    setImportText("")
    mutate()
    if (ok) toast.success(`${ok} contato(s) importado(s).${err ? ` ${err} falha(s).` : ""}`)
  }

  const startEdit = (client: Client) => {
    setEditingId(client.id)
    let address = client.address || ""
    let number = client.number || ""
    let district = client.district || ""
    let city = client.city || ""
    let state = client.state || ""
    let zip_code = client.zip_code || ""
    if (address && !city && !state) {
      const parts = address.split(",").map((p) => p.trim()).filter(Boolean)
      if (parts.length >= 6) {
        address = parts[0]
        number = number || parts[1] || ""
        district = district || parts[2] || ""
        city = city || parts[3] || ""
        state = state || parts[4] || ""
        zip_code = zip_code || parts[5] || ""
      } else if (parts.length >= 5) {
        address = parts[0]
        number = number || parts[1] || ""
        district = district || parts[2] || ""
        city = city || parts[3] || ""
        state = state || parts[4] || ""
      } else if (parts.length >= 4) {
        address = parts[0]
        number = number || parts[1] || ""
        district = district || parts[2] || ""
        city = city || parts[3] || ""
      } else if (parts.length >= 3) {
        address = parts[0]
        number = number || parts[1] || ""
        district = district || parts[2] || ""
      } else if (parts.length >= 2) {
        address = parts[0]
        number = number || parts[1] || ""
      }
    }
    setEditForm({
      name: client.name, email: client.email || "", phone: client.phone || "",
      cpf_cnpj: client.cpf_cnpj || "", company_name: client.company_name || "",
      address, city, state, zip_code, number, district,
      notes: client.notes || "", is_active: client.is_active !== false,
      origem_captacao: client.origem_captacao || "",
      status_lead: (client.status_lead as string) || "contratando",
    })
  }

  const saveEdit = async () => {
    const parts = [editForm.address, editForm.number, editForm.district, editForm.city, editForm.state, editForm.zip_code].filter(Boolean)
    const addressFull = parts.length ? parts.join(", ") : null
    const payload: Record<string, unknown> = {
      name: editForm.name,
      email: editForm.email ?? "",
      phone: editForm.phone ?? "",
      cpf_cnpj: editForm.cpf_cnpj ?? "",
      company: editForm.company_name ?? editForm.company ?? null,
      address: addressFull,
      origem_captacao: (editForm.origem_captacao as string) || null,
      status_lead: (editForm.status_lead as string) || "contratando",
    }
    const { error } = await supabase.from("clients").update(payload).eq("id", editingId)
    if (error) { toast.error("Erro ao atualizar: " + error.message); return }
    setEditingId(null)
    mutate()
  }

  const toggleActive = async (client: Client) => {
    toast.success(client.is_active ? "Cliente desativado" : "Cliente ativado")
    mutate()
  }

  const handleDelete = async (client: Client) => {
    if (!confirm(`Excluir o cliente "${client.name}"? Contratos e NF-e vinculados também serão removidos.`)) return
    const { error } = await supabase.from("clients").delete().eq("id", client.id)
    if (error) {
      toast.error("Erro ao excluir: " + error.message)
      return
    }
    toast.success("Cliente excluído.")
    mutate()
  }

  const isClientActive = (c: Client) => c.is_active !== false

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Clientes</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Cadastros únicos por pessoa. Um mesmo cliente pode ter vários contratos na página do produto.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-border overflow-hidden">
            <button title="Lista" onClick={() => setView("list")} className={cn("px-3 py-2 transition-colors", view === "list" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-secondary")}>
              <List className="h-4 w-4" />
            </button>
            <button title="Grade" onClick={() => setView("grid")} className={cn("px-3 py-2 transition-colors", view === "grid" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-secondary")}>
              <LayoutGrid className="h-4 w-4" />
            </button>
          </div>
          <button onClick={() => setShowImport(true)} className="flex items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-foreground hover:bg-secondary transition-colors">
            <Upload className="h-4 w-4" /> Importar contatos
          </button>
          <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors glow-blue-sm">
            <Plus className="h-4 w-4" /> Novo Cliente
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-3">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            placeholder="Buscar por nome ou CNPJ..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-10 w-full rounded-lg border border-border bg-secondary pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
          />
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium text-muted-foreground">Status</span>
          <select
            title="Filtrar por status"
            value={filterTab}
            onChange={(e) => setFilterTab(e.target.value as typeof filterTab)}
            className="h-10 min-w-[140px] rounded-lg border border-border bg-secondary px-3 text-sm font-medium text-foreground focus:border-primary focus:outline-none"
          >
            <option value="all">Todos</option>
            <option value="novo">Novo</option>
            <option value="contratando">Contratando</option>
            <option value="negociando">Negociando</option>
            <option value="ativo">Ativo</option>
            <option value="perdido">Perdido</option>
          </select>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium text-muted-foreground">Origem</span>
          <select
            title="Filtrar por origem"
            value={filterOrigem}
            onChange={(e) => setFilterOrigem(e.target.value)}
            className="h-10 min-w-[160px] rounded-lg border border-border bg-secondary px-3 text-sm font-medium text-foreground focus:border-primary focus:outline-none"
          >
            <option value="all">Todas origens</option>
            <option value="none">Sem origem</option>
            {ORIGEM_CAPTACAO_OPCOES.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-wrap gap-4">
        {STATUS_LEAD_OPCOES.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setFilterTab(tab.id)}
            className={cn(
              "rounded-xl px-8 py-2.5 text-sm font-medium transition-all shadow-sm",
              filterTab === tab.id ? tab.btn + " ring-2 ring-offset-2 ring-offset-background ring-white/30" : tab.inactive
            )}
          >
            {tab.label} ({countByTab(tab.id)})
          </button>
        ))}
      </div>

      {showAdd && (
        <div className="glass rounded-xl p-5 border border-primary/20">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-foreground">Novo Cliente</h3>
            <button title="Fechar" onClick={() => setShowAdd(false)} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <input
              placeholder="Nome *"
              value={newClient.name}
              onChange={(e) => setNewClient({ ...newClient, name: e.target.value })}
              className="h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
            />
            <input
              placeholder="Email"
              type="email"
              value={newClient.email}
              onChange={(e) => setNewClient({ ...newClient, email: e.target.value })}
              className="h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
            />
            <input
              placeholder="Telefone"
              value={newClient.phone}
              onChange={(e) => setNewClient({ ...newClient, phone: formatPhone(e.target.value) })}
              className="h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
            />
            <input
              placeholder="CPF/CNPJ"
              value={newClient.cpf_cnpj}
              onChange={(e) => setNewClient({ ...newClient, cpf_cnpj: formatCpfCnpj(e.target.value) })}
              className="h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
            />
            <input
              placeholder="Empresa"
              value={newClient.company_name}
              onChange={(e) => setNewClient({ ...newClient, company_name: e.target.value })}
              className="h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
            />
            <input
              placeholder="CEP"
              value={newClient.zip_code}
              onChange={(e) => setNewClient({ ...newClient, zip_code: e.target.value })}
              onBlur={async () => {
                const raw = newClient.zip_code.replace(/\D/g, "")
                if (!raw) return
                try {
                  const res = await fetch(`/api/geo/cep?value=${encodeURIComponent(raw)}`)
                  const data = await res.json()
                  if (!res.ok) return
                  setNewClient((prev) => ({
                    ...prev,
                    zip_code: data.cep || prev.zip_code,
                    city: data.city || prev.city,
                    state: (data.state || prev.state || "").toUpperCase(),
                    district: data.district || prev.district,
                    address: data.street || prev.address,
                  }))
                } catch {
                  // ignora erro de rede
                }
              }}
              className="h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
            />
            <input
              placeholder="Cidade"
              value={newClient.city}
              onChange={(e) => setNewClient({ ...newClient, city: e.target.value })}
              className="h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
            />
            <input
              placeholder="Estado (UF)"
              value={newClient.state}
              onChange={(e) => setNewClient({ ...newClient, state: e.target.value.toUpperCase() })}
              className="h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
            />
            <input
              placeholder="Endereço (rua)"
              value={newClient.address}
              onChange={(e) => setNewClient({ ...newClient, address: e.target.value })}
              className="h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
            />
            <input
              placeholder="Número"
              value={newClient.number}
              onChange={(e) => setNewClient({ ...newClient, number: e.target.value })}
              className="h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
            />
            <input
              placeholder="Bairro"
              value={newClient.district}
              onChange={(e) => setNewClient({ ...newClient, district: e.target.value })}
              className="h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
            />
            <input
              placeholder="Observações"
              value={newClient.notes}
              onChange={(e) => setNewClient({ ...newClient, notes: e.target.value })}
              className="h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
            />
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Origem de captação</p>
              <select value={newClient.origem_captacao} onChange={(e) => setNewClient({ ...newClient, origem_captacao: e.target.value })}
                className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:border-primary focus:outline-none">
                <option value="">—</option>
                {ORIGEM_CAPTACAO_OPCOES.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Contato</p>
              <select value={newClient.status_lead} onChange={(e) => setNewClient({ ...newClient, status_lead: e.target.value })}
                className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:border-primary focus:outline-none">
                <option value="novo">Novo</option>
                <option value="contratando">Contratando</option>
                <option value="negociando">Negociando</option>
                <option value="ativo">Ativo</option>
                <option value="perdido">Perdido</option>
              </select>
            </div>
          </div>
          <button onClick={handleAdd} className="mt-4 flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            <Save className="h-4 w-4" /> Salvar Cliente
          </button>
        </div>
      )}

      {showImport && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60">
          <div className="w-full max-w-xl rounded-2xl bg-background border border-border p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-foreground">Importar contatos</h3>
              <button onClick={() => { setShowImport(false); setImportText("") }} className="rounded-full border border-border px-2 py-1 text-xs text-muted-foreground hover:bg-secondary">Fechar</button>
            </div>
            <p className="text-sm text-muted-foreground mb-2">
              Cole as linhas abaixo ou use o botão para enviar um arquivo. Colunas: <strong>Nome</strong>; Email; Telefone; CPF/CNPJ; Empresa (separador vírgula ou ponto-e-vírgula). A primeira linha pode ser o cabeçalho.
            </p>
            <input type="file" ref={fileInputRef} accept=".csv,.txt" className="hidden" onChange={(e) => {
              const f = e.target.files?.[0]
              if (!f) return
              const r = new FileReader()
              r.onload = () => setImportText(String(r.result ?? ""))
              r.readAsText(f, "UTF-8")
              e.target.value = ""
            }} />
            <button type="button" onClick={() => fileInputRef.current?.click()} className="mb-3 flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm text-foreground hover:bg-secondary">
              <Upload className="h-4 w-4" /> Escolher arquivo CSV/TXT
            </button>
            <textarea placeholder="Nome; Email; Telefone; CPF/CNPJ; Empresa&#10;João Silva; joao@email.com; (11) 99999-9999; 12345678901; Empresa X" value={importText} onChange={(e) => setImportText(e.target.value)}
              className="h-40 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none resize-y" />
            <div className="mt-4 flex gap-2">
              <button onClick={handleImport} disabled={importing} className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60">
                {importing ? <><Loader2 className="h-4 w-4 animate-spin" /> Importando...</> : <><Upload className="h-4 w-4" /> Importar</>}
              </button>
              <button onClick={() => { setShowImport(false); setImportText("") }} className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-secondary">Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {view === "list" && (
        <div className="glass rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-secondary/30">
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Cliente</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">CPF/CNPJ</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Contato</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Localizacao</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Contato</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Origem</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Cadastro</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wide">Acoes</th>
                </tr>
              </thead>
              <tbody>
                {filtered && filtered.length > 0 ? filtered.map((client) => (
                  <tr key={client.id} className="border-b border-border/30 hover:bg-secondary/20 transition-colors">
                    {editingId === client.id ? (
                      <td colSpan={9} className="px-4 py-4">
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                          {[
                            { key: "name", label: "Nome *" },
                            { key: "email", label: "Email" },
                            { key: "phone", label: "Telefone" },
                            { key: "cpf_cnpj", label: "CPF/CNPJ" },
                            { key: "company_name", label: "Empresa" },
                            { key: "address", label: "Rua / Endereço", colSpan: 2 },
                            { key: "number", label: "Número" },
                            { key: "district", label: "Bairro" },
                            { key: "city", label: "Cidade" },
                            { key: "state", label: "Estado (UF)" },
                            { key: "zip_code", label: "CEP" },
                          ].map((field) => (
                            <input
                              key={field.key}
                              placeholder={field.label}
                              value={(editForm[field.key as keyof typeof editForm] as string) || ""}
                              onChange={(e) => setEditForm({ ...editForm, [field.key]: e.target.value })}
                              className={field.colSpan ? "h-9 rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:border-primary focus:outline-none col-span-2" : "h-9 rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:border-primary focus:outline-none"}
                            />
                          ))}
                          <div className="col-span-2">
                            <p className="text-xs font-medium text-muted-foreground mb-1">Origem de captação</p>
                            <select value={editForm.origem_captacao ?? ""} onChange={(e) => setEditForm({ ...editForm, origem_captacao: e.target.value })}
                              className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:border-primary focus:outline-none">
                              <option value="">—</option>
                              {ORIGEM_CAPTACAO_OPCOES.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                            </select>
                          </div>
                          <button onClick={() => setEditForm({ ...editForm, is_active: !editForm.is_active })}
                            className={cn("flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium transition-colors", editForm.is_active ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400")}>
                            {editForm.is_active ? <CheckCircle className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
                            {editForm.is_active ? "Ativo" : "Inativo"}
                          </button>
                        </div>
                        <div className="col-span-2 flex flex-wrap gap-2 items-center">
                            <span className="text-xs font-medium text-muted-foreground">Contato:</span>
                            <select value={editForm.status_lead ?? "contratando"} onChange={(e) => setEditForm({ ...editForm, status_lead: e.target.value })}
                              className="h-9 rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:border-primary focus:outline-none">
                              <option value="novo">Novo</option>
                              <option value="contratando">Contratando</option>
                              <option value="negociando">Negociando</option>
                              <option value="ativo">Ativo</option>
                              <option value="perdido">Perdido</option>
                            </select>
                          </div>
                        <div className="flex gap-2 mt-3">
                          <button onClick={saveEdit} className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90">
                            <Save className="h-3.5 w-3.5" /> Salvar
                          </button>
                          <button onClick={() => setEditingId(null)} className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-secondary">Cancelar</button>
                        </div>
                      </td>
                    ) : (
                      <>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 shrink-0"><Users className="h-4 w-4 text-primary" /></div>
                            <div>
                              <p className="text-sm font-medium text-foreground">{client.name}</p>
                              {client.company_name && <p className="text-xs text-muted-foreground flex items-center gap-1"><Building2 className="h-3 w-3" />{client.company_name}</p>}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3"><span className="text-xs font-mono text-muted-foreground">{client.cpf_cnpj || "---"}</span></td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col gap-0.5 text-xs text-muted-foreground">
                            {client.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{client.email}</span>}
                            {client.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{client.phone}</span>}
                          </div>
                        </td>
                        <td className="px-4 py-3 max-w-[200px]">
                          {client.address ? (
                            <span className="flex items-center gap-1 text-xs text-muted-foreground" title={client.address}><MapPin className="h-3 w-3 shrink-0" /><span className="truncate">{client.address}</span></span>
                          ) : (client.city || client.state) ? (
                            <span className="flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="h-3 w-3" />{[client.city, client.state].filter(Boolean).join(", ")}</span>
                          ) : (
                            <span className="text-xs text-muted-foreground/40">---</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {(() => {
                            const etapa = getStatusLead(client)
                            const t = STATUS_LEAD_OPCOES.find((x) => x.id === etapa)
                            const label = t ? t.label : etapa
                            const color = etapa === "novo" ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/30" : etapa === "contratando" ? "bg-amber-500/10 text-amber-400 border-amber-500/30" : etapa === "negociando" ? "bg-violet-500/10 text-violet-400 border-violet-500/30" : etapa === "ativo" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" : etapa === "perdido" ? "bg-red-500/10 text-red-400 border-red-500/30" : "bg-secondary text-muted-foreground border-border"
                            return <span className={cn("inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium", color)}>{label}</span>
                          })()}
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">{client.origem_captacao || "—"}</td>
                        <td className="px-4 py-3">
                          {(() => {
                            const status = getContractStatus(client.id)
                            if (!status) return <span className="text-muted-foreground text-xs">—</span>
                            const info = CONTRACT_STATUS_MAP[status] ?? { label: status, class: "bg-secondary text-muted-foreground border-border" }
                            return <span className={cn("inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium", info.class)}>{info.label}</span>
                          })()}
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">{format(new Date(client.created_at), "dd/MM/yyyy", { locale: ptBR })}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <button onClick={() => startEdit(client)} className="rounded-lg p-1.5 text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors" title="Editar"><Pencil className="h-3.5 w-3.5" /></button>
                            <button onClick={() => toggleActive(client)} className={cn("rounded-lg p-1.5 transition-colors", isClientActive(client) ? "text-muted-foreground hover:bg-red-500/10 hover:text-red-400" : "text-muted-foreground hover:bg-emerald-500/10 hover:text-emerald-400")} title={isClientActive(client) ? "Desativar" : "Ativar"}>
                              {isClientActive(client) ? <XCircle className="h-3.5 w-3.5" /> : <CheckCircle className="h-3.5 w-3.5" />}
                            </button>
                            <button onClick={() => handleDelete(client)} className="rounded-lg p-1.5 text-muted-foreground hover:bg-red-500/10 hover:text-red-400 transition-colors" title="Excluir"><Trash2 className="h-3.5 w-3.5" /></button>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                )) : (
                  <tr><td colSpan={9} className="px-4 py-16 text-center"><Users className="h-10 w-10 text-muted-foreground/20 mx-auto mb-3" /><p className="text-sm text-muted-foreground">{search ? "Nenhum cliente encontrado." : "Nenhum cliente cadastrado."}</p></td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {view === "grid" && (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filtered?.map((client) => (
              <div key={client.id} className={cn("glass rounded-xl p-5 hover:glow-blue-sm transition-all", !isClientActive(client) && "opacity-60")}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10"><Users className="h-5 w-5 text-primary" /></div>
                    <div>
                      <p className="font-medium text-foreground">{client.name}</p>
                      {client.company_name && <p className="text-xs text-muted-foreground">{client.company_name}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button title="Editar" onClick={() => startEdit(client)} className="rounded p-1 text-muted-foreground hover:text-primary transition-colors"><Pencil className="h-3.5 w-3.5" /></button>
                    <button title="Excluir" onClick={() => handleDelete(client)} className="rounded p-1 text-muted-foreground hover:text-red-400 transition-colors"><Trash2 className="h-3.5 w-3.5" /></button>
                    {(() => {
                      const etapa = getStatusLead(client)
                      const color = etapa === "novo" ? "bg-cyan-500/20 text-cyan-400" : etapa === "contratando" ? "bg-amber-500/20 text-amber-400" : etapa === "negociando" ? "bg-violet-500/20 text-violet-400" : etapa === "ativo" ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"
                      const label = STATUS_LEAD_OPCOES.find((x) => x.id === etapa)?.label ?? etapa
                      return <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", color)}>{label}</span>
                    })()}
                  </div>
                </div>
                <div className="flex flex-col gap-1.5 text-sm text-muted-foreground">
                  {client.cpf_cnpj && !String(client.cpf_cnpj).startsWith("import-") && !String(client.cpf_cnpj).startsWith("sem-cpf-") && <p className="font-mono text-xs text-foreground/60">{client.cpf_cnpj}</p>}
                  {client.email && <div className="flex items-center gap-1.5"><Mail className="h-3 w-3" />{client.email}</div>}
                  {client.phone && <div className="flex items-center gap-1.5"><Phone className="h-3 w-3" />{client.phone}</div>}
                  {(client.address || client.city || client.state) && <div className="flex items-center gap-1.5"><MapPin className="h-3 w-3 shrink-0" />{client.address || [client.city, client.state].filter(Boolean).join(", ")}</div>}
                  <div className="mt-2 flex flex-wrap gap-2 border-t border-border/50 pt-2 text-xs">
                    <span className="text-muted-foreground">Contato:</span>
                    {(() => {
                      const etapa = getStatusLead(client)
                      const color = etapa === "novo" ? "text-cyan-400" : etapa === "contratando" ? "text-amber-400" : etapa === "negociando" ? "text-violet-400" : etapa === "ativo" ? "text-emerald-400" : "text-red-400"
                      const label = STATUS_LEAD_OPCOES.find((x) => x.id === etapa)?.label ?? etapa
                      return <span className={cn("font-medium", color)}>{label}</span>
                    })()}
                    <span className="text-muted-foreground/50">|</span>
                    <span className="text-muted-foreground">Origem:</span>
                    <span className="font-medium">{client.origem_captacao || "—"}</span>
                    <span className="text-muted-foreground/50">|</span>
                    <span className="text-muted-foreground">Status:</span>
                    {(() => {
                      const status = getContractStatus(client.id)
                      if (!status) return <span className="font-medium text-muted-foreground">—</span>
                      const info = CONTRACT_STATUS_MAP[status]
                      const color = info?.class?.includes("emerald") ? "text-emerald-400" : info?.class?.includes("amber") ? "text-amber-400" : info?.class?.includes("red") ? "text-red-400" : "text-muted-foreground"
                      return <span className={cn("font-medium", color)}>{info?.label ?? status}</span>
                    })()}
                  </div>
                </div>
                <p className="mt-3 text-xs text-muted-foreground/50">Cadastrado em {format(new Date(client.created_at), "dd/MM/yyyy", { locale: ptBR })}</p>
              </div>
            ))}
          </div>
          {filtered?.length === 0 && <div className="flex flex-col items-center justify-center py-16"><Users className="h-12 w-12 text-muted-foreground/20 mb-3" /><p className="text-muted-foreground">{search ? "Nenhum cliente encontrado" : "Nenhum cliente cadastrado"}</p></div>}
        </>
      )}
    </div>
  )
}
