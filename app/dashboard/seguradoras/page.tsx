"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/lib/auth-context"
import { Search, Plus, X, Save, LayoutGrid, List, Filter } from "lucide-react"
import useSWR from "swr"
import type { Seguradora, Profile } from "@/lib/types"
import { KANBAN_COLUMNS } from "@/lib/types"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

export default function SeguradorasPage() {
  const supabase = createClient()
  const { profile: currentUser } = useAuth()
  const [search, setSearch] = useState("")
  const [showAdd, setShowAdd] = useState(false)
  const [view, setView] = useState<"kanban" | "list">("kanban")
  const [filterAssigned, setFilterAssigned] = useState("all")
  const [newItem, setNewItem] = useState({ name: "", cnpj: "", phone: "", email: "", city: "", state: "" })

  const { data: seguradoras, mutate } = useSWR("seguradoras-list", async () => {
    const { data } = await supabase.from("seguradoras").select("*").order("created_at", { ascending: false })
    return (data || []) as Seguradora[]
  })

  const { data: users } = useSWR("profiles-for-assignment", async () => {
    const { data } = await supabase.from("profiles").select("*").eq("is_active", true)
    return (data || []) as Profile[]
  })

  const filtered = seguradoras?.filter((s) => {
    const matchesSearch = !search || s.name.toLowerCase().includes(search.toLowerCase()) || s.cnpj?.includes(search)
    const matchesAssigned = filterAssigned === "all" || s.assigned_to === filterAssigned || (filterAssigned === "unassigned" && !s.assigned_to)
    return matchesSearch && matchesAssigned
  })

  const handleAdd = async () => {
    if (!newItem.name) { toast.error("Nome obrigatorio"); return }
    const { error } = await supabase.from("seguradoras").insert(newItem)
    if (error) { toast.error("Erro: " + error.message); return }
    toast.success("Corretora adicionada!")
    setShowAdd(false)
    setNewItem({ name: "", cnpj: "", phone: "", email: "", city: "", state: "" })
    mutate()
  }

  const handleAssign = async (id: string, userId: string | null) => {
    const user = users?.find(u => u.id === userId)
    await supabase.from("seguradoras").update({
      assigned_to: userId,
      assigned_name: user?.name || null,
      contact_status: userId ? "in_progress" : "pending",
    }).eq("id", id)
    mutate()
    toast.success(userId ? `Atribuido a ${user?.name}` : "Atribuicao removida")
  }

  const handleMoveKanban = async (id: string, column: string) => {
    await supabase.from("seguradoras").update({ kanban_column: column }).eq("id", id)
    mutate()
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Marketing / Corretoras</h2>
          <p className="text-sm text-muted-foreground mt-1">Contatos para captação de clientes</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-border overflow-hidden">
            <button title="Visualização Kanban" onClick={() => setView("kanban")} className={cn("px-3 py-2", view === "kanban" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-secondary")}>
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button title="Visualização em lista" onClick={() => setView("list")} className={cn("px-3 py-2", view === "list" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-secondary")}>
              <List className="h-4 w-4" />
            </button>
          </div>
          <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 glow-blue-sm">
            <Plus className="h-4 w-4" /> Novo Contato
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input placeholder="Buscar por nome ou CNPJ..." value={search} onChange={(e) => setSearch(e.target.value)}
            className="h-10 w-full rounded-lg border border-border bg-secondary pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <select title="Filtrar por atribuição" value={filterAssigned} onChange={(e) => setFilterAssigned(e.target.value)}
            className="h-10 rounded-lg border border-border bg-secondary px-3 text-sm text-foreground focus:border-primary focus:outline-none"
          >
            <option value="all">Todos</option>
            <option value="unassigned">Sem atribuicao</option>
            {users?.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
        </div>
      </div>

      {/* Add Modal */}
      {showAdd && (
        <div className="glass rounded-xl p-5 border border-primary/20">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-foreground">Novo Contato</h3>
            <button title="Fechar" onClick={() => setShowAdd(false)} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { key: "name", label: "Nome *" }, { key: "cnpj", label: "CNPJ" },
              { key: "phone", label: "Telefone" }, { key: "email", label: "Email" },
              { key: "city", label: "Cidade" }, { key: "state", label: "Estado" },
            ].map((f) => (
              <input key={f.key} placeholder={f.label} value={newItem[f.key as keyof typeof newItem]}
                onChange={(e) => setNewItem({ ...newItem, [f.key]: e.target.value })}
                className="h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
              />
            ))}
          </div>
          <button onClick={handleAdd} className="mt-4 flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            <Save className="h-4 w-4" /> Adicionar
          </button>
        </div>
      )}

      {/* Kanban View */}
      {view === "kanban" ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {KANBAN_COLUMNS.map((col) => {
            const items = filtered?.filter(s => s.kanban_column === col.id) || []
            return (
              <div key={col.id} className="flex flex-col gap-3">
                <div className={cn("rounded-lg border px-3 py-2 text-sm font-medium text-center", col.color)}>
                  {col.label} ({items.length})
                </div>
                <div className="flex flex-col gap-2 min-h-[200px]">
                  {items.map((item) => (
                    <div key={item.id} className="glass rounded-lg p-3 hover:glow-blue-sm transition-all">
                      <p className="text-sm font-medium text-foreground truncate">{item.name}</p>
                      {item.cnpj && <p className="text-xs text-muted-foreground font-mono mt-0.5">{item.cnpj}</p>}
                      {item.phone && <p className="text-xs text-muted-foreground mt-0.5">{item.phone}</p>}

                      <div className="mt-2 flex items-center gap-1">
                        <select
                          title="Atribuir responsável"
                          value={item.assigned_to || ""}
                          onChange={(e) => handleAssign(item.id, e.target.value || null)}
                          className="h-7 flex-1 rounded border border-border bg-background px-1.5 text-[11px] text-foreground focus:border-primary focus:outline-none"
                        >
                          <option value="">Ninguem</option>
                          {users?.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                        </select>
                      </div>

                      <div className="mt-2 flex gap-1 flex-wrap">
                        {KANBAN_COLUMNS.filter(c => c.id !== item.kanban_column).map(c => (
                          <button key={c.id} onClick={() => handleMoveKanban(item.id, c.id)}
                            className="rounded px-1.5 py-0.5 text-[10px] font-medium border border-border text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors"
                          >
                            {c.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        /* List View */
        <div className="glass rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-secondary/30">
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Nome</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">CNPJ</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Telefone</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Atribuido a</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Etapa</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered?.map((item) => {
                  const col = KANBAN_COLUMNS.find(c => c.id === item.kanban_column)
                  return (
                    <tr key={item.id} className="border-b border-border/50 hover:bg-secondary/20 transition-colors">
                      <td className="px-4 py-3 text-sm font-medium text-foreground">{item.name}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground font-mono">{item.cnpj || "---"}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{item.phone || "---"}</td>
                      <td className="px-4 py-3">
                        <select title="Atribuir responsável" value={item.assigned_to || ""} onChange={(e) => handleAssign(item.id, e.target.value || null)}
                          className="h-8 rounded border border-border bg-background px-2 text-xs text-foreground focus:border-primary focus:outline-none"
                        >
                          <option value="">Ninguem</option>
                          {users?.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <select title="Mover etapa" value={item.kanban_column} onChange={(e) => handleMoveKanban(item.id, e.target.value)}
                          className="h-8 rounded border border-border bg-background px-2 text-xs text-foreground focus:border-primary focus:outline-none"
                        >
                          {KANBAN_COLUMNS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn("rounded-full border px-2 py-0.5 text-xs font-medium", col?.color)}>{col?.label}</span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
