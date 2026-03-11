"use client"
import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import {
  Search, Plus, X, Save, Users, MapPin, Mail, Phone,
  LayoutGrid, List, Filter, Pencil, CheckCircle, XCircle, Building2
} from "lucide-react"
import useSWR from "swr"
import type { Client } from "@/lib/types"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"

export default function ClientesPage() {
  const supabase = createClient()
  const [search, setSearch] = useState("")
  const [showAdd, setShowAdd] = useState(false)
  const [view, setView] = useState<"grid" | "list">("list")
  const [filterStatus, setFilterStatus] = useState("all")
  const [editingId, setEditingId] = useState<string | null>(null)
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
    const { data } = await supabase.from("clients").select("*").order("name")
    return (data || []) as Client[]
  })

  const filtered = clients?.filter((c) => {
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.cpf_cnpj?.includes(search) ||
      c.email?.toLowerCase().includes(search.toLowerCase()) ||
      c.company_name?.toLowerCase().includes(search.toLowerCase()) ||
      c.phone?.includes(search)
    const matchStatus = filterStatus === "all" ||
      (filterStatus === "active" && c.is_active) ||
      (filterStatus === "inactive" && !c.is_active)
    return matchSearch && matchStatus
  })

  const handleAdd = async () => {
    if (!newClient.name) {
      toast.error("Nome obrigatório")
      return
    }
    try {
      const payload = {
        name: newClient.name,
        email: newClient.email || null,
        phone: newClient.phone || null,
        cpf_cnpj: newClient.cpf_cnpj || null,
        company_name: newClient.company_name || null,
        address: newClient.address || null,
        number: newClient.number || null,
        district: newClient.district || null,
        city: newClient.city || null,
        state: newClient.state || null,
        zip_code: newClient.zip_code || null,
        notes: newClient.notes || null,
      }
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
      })
      mutate()
    } catch (err) {
      toast.error("Erro inesperado ao salvar cliente")
    }
  }

  const startEdit = (client: Client) => {
    setEditingId(client.id)
    setEditForm({
      name: client.name, email: client.email || "", phone: client.phone || "",
      cpf_cnpj: client.cpf_cnpj || "", company_name: client.company_name || "",
      city: client.city || "", state: client.state || "", notes: client.notes || "",
      is_active: client.is_active,
    })
  }

  const saveEdit = async () => {
    const { error } = await supabase.from("clients").update(editForm).eq("id", editingId)
    if (error) { toast.error("Erro ao atualizar: " + error.message); return }
    setEditingId(null)
    mutate()
  }

  const toggleActive = async (client: Client) => {
    toast.success(client.is_active ? "Cliente desativado" : "Cliente ativado")
    mutate()
  }

  const activeCount = clients?.filter(c => c.is_active).length || 0
  const inactiveCount = clients?.filter(c => !c.is_active).length || 0

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Clientes</h2>
          <p className="text-sm text-muted-foreground mt-1">
            <span className="text-emerald-400 font-medium">{activeCount}</span> ativos &middot;{" "}
            <span className="text-red-400 font-medium">{inactiveCount}</span> inativos &middot;{" "}
            <span className="text-foreground font-medium">{clients?.length || 0}</span> total
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-border overflow-hidden">
            <button title="Visualização em lista" onClick={() => setView("list")} className={cn("px-3 py-2 transition-colors", view === "list" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-secondary")}>
              <List className="h-4 w-4" />
            </button>
            <button title="Visualização em grade" onClick={() => setView("grid")} className={cn("px-3 py-2 transition-colors", view === "grid" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-secondary")}>
              <LayoutGrid className="h-4 w-4" />
            </button>
          </div>
          <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors glow-blue-sm">
            <Plus className="h-4 w-4" /> Novo Cliente
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input placeholder="Buscar por nome, CPF/CNPJ, email, telefone ou empresa..." value={search} onChange={(e) => setSearch(e.target.value)}
            className="h-10 w-full rounded-lg border border-border bg-secondary pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none" />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <select title="Filtrar por status" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
            className="h-10 rounded-lg border border-border bg-secondary px-3 text-sm text-foreground focus:border-primary focus:outline-none">
            <option value="all">Todos</option>
            <option value="active">Ativos</option>
            <option value="inactive">Inativos</option>
          </select>
        </div>
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
          </div>
          <button onClick={handleAdd} className="mt-4 flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            <Save className="h-4 w-4" /> Salvar Cliente
          </button>
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
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Cadastro</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wide">Acoes</th>
                </tr>
              </thead>
              <tbody>
                {filtered && filtered.length > 0 ? filtered.map((client) => (
                  <tr key={client.id} className="border-b border-border/30 hover:bg-secondary/20 transition-colors">
                    {editingId === client.id ? (
                      <td colSpan={7} className="px-4 py-4">
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                          {[{key:"name",label:"Nome *"},{key:"email",label:"Email"},{key:"phone",label:"Telefone"},{key:"cpf_cnpj",label:"CPF/CNPJ"},{key:"company_name",label:"Empresa"},{key:"city",label:"Cidade"},{key:"state",label:"Estado"}].map((field) => (
                            <input key={field.key} placeholder={field.label} value={editForm[field.key as keyof typeof editForm] as string || ""}
                              onChange={(e) => setEditForm({ ...editForm, [field.key]: e.target.value })}
                              className="h-9 rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:border-primary focus:outline-none" />
                          ))}
                          <button onClick={() => setEditForm({ ...editForm, is_active: !editForm.is_active })}
                            className={cn("flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium transition-colors", editForm.is_active ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400")}>
                            {editForm.is_active ? <CheckCircle className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
                            {editForm.is_active ? "Ativo" : "Inativo"}
                          </button>
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
                        <td className="px-4 py-3">{(client.city || client.state) ? <span className="flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="h-3 w-3" />{[client.city,client.state].filter(Boolean).join(", ")}</span> : <span className="text-xs text-muted-foreground/40">---</span>}</td>
                        <td className="px-4 py-3">
                          <span className={cn("inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium", client.is_active ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" : "bg-red-500/10 text-red-400 border-red-500/30")}>
                            <span className={cn("h-1.5 w-1.5 rounded-full", client.is_active ? "bg-emerald-400" : "bg-red-400")} />
                            {client.is_active ? "Ativo" : "Inativo"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">{format(new Date(client.created_at), "dd/MM/yyyy", { locale: ptBR })}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <button onClick={() => startEdit(client)} className="rounded-lg p-1.5 text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors" title="Editar"><Pencil className="h-3.5 w-3.5" /></button>
                            <button onClick={() => toggleActive(client)} className={cn("rounded-lg p-1.5 transition-colors", client.is_active ? "text-muted-foreground hover:bg-red-500/10 hover:text-red-400" : "text-muted-foreground hover:bg-emerald-500/10 hover:text-emerald-400")} title={client.is_active ? "Desativar" : "Ativar"}>
                              {client.is_active ? <XCircle className="h-3.5 w-3.5" /> : <CheckCircle className="h-3.5 w-3.5" />}
                            </button>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                )) : (
                  <tr><td colSpan={7} className="px-4 py-16 text-center"><Users className="h-10 w-10 text-muted-foreground/20 mx-auto mb-3" /><p className="text-sm text-muted-foreground">{search ? "Nenhum cliente encontrado." : "Nenhum cliente cadastrado."}</p></td></tr>
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
              <div key={client.id} className={cn("glass rounded-xl p-5 hover:glow-blue-sm transition-all", !client.is_active && "opacity-60")}>
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
                    <span className={cn("h-2 w-2 rounded-full", client.is_active ? "bg-emerald-400" : "bg-red-400")} />
                  </div>
                </div>
                <div className="flex flex-col gap-1.5 text-sm text-muted-foreground">
                  {client.cpf_cnpj && <p className="font-mono text-xs text-foreground/60">{client.cpf_cnpj}</p>}
                  {client.email && <div className="flex items-center gap-1.5"><Mail className="h-3 w-3" />{client.email}</div>}
                  {client.phone && <div className="flex items-center gap-1.5"><Phone className="h-3 w-3" />{client.phone}</div>}
                  {(client.city || client.state) && <div className="flex items-center gap-1.5"><MapPin className="h-3 w-3" />{[client.city,client.state].filter(Boolean).join(", ")}</div>}
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
