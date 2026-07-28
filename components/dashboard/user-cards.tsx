"use client"

import { useState } from "react"
import { Plus, Pencil, X, Save, Trash2, Loader2 } from "lucide-react"
import { ROLE_LABELS, type UserRole } from "@/lib/types"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import useSWR, { useSWRConfig } from "swr"
import { FormSelect } from "@/components/ui/form-select"

export interface DashboardUser {
  id: string
  username: string
  role: string
  display_name: string
  email?: string | null
  created_at: string
  updated_at?: string
}

const DASHBOARD_ROLES: UserRole[] = ["admin", "comercial"]

export function UserCards() {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showAddUser, setShowAddUser] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const { mutate: globalMutate } = useSWRConfig()
  const { data: users = [], mutate } = useSWR<DashboardUser[]>("dashboard-users", async () => {
    const res = await fetch("/api/users")
    if (!res.ok) {
      const j = await res.json().catch(() => ({}))
      throw new Error(j?.error ?? "Erro ao carregar usuários")
    }
    return res.json()
  })

  const [editForm, setEditForm] = useState({
    display_name: "",
    email: "" as string,
    role: "comercial" as UserRole,
    new_password: "",
  })

  const [newUser, setNewUser] = useState({
    username: "",
    password: "",
    display_name: "",
    email: "",
    role: "comercial" as UserRole,
  })

  const startEdit = (user: DashboardUser) => {
    setEditingId(user.id)
    setEditForm({
      display_name: user.display_name,
      email: user.email ?? "",
      role: (DASHBOARD_ROLES.includes(user.role as UserRole) ? user.role : "comercial") as UserRole,
      new_password: "",
    })
  }

  const saveEdit = async (id: string) => {
    setSaving(true)
    try {
      const body: { display_name: string; role: string; email?: string | null; new_password?: string } = {
        display_name: editForm.display_name,
        role: editForm.role,
        email: editForm.email.trim() || null,
      }
      if (editForm.new_password.trim()) body.new_password = editForm.new_password
      const res = await fetch(`/api/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(data?.error ?? "Erro ao atualizar usuário")
        return
      }
      toast.success("Usuário atualizado com sucesso")
      setEditingId(null)
      globalMutate("recent-activity")
      globalMutate("all-activities")
      mutate()
    } finally {
      setSaving(false)
    }
  }

  const handleRemove = async (id: string, displayName: string) => {
    if (!confirm(`Tem certeza que deseja excluir o usuário "${displayName}"? Esta ação não pode ser desfeita.`)) return
    setDeletingId(id)
    try {
      const res = await fetch(`/api/users/${id}`, { method: "DELETE" })
      const data = await res.json().catch(() => ({}))
      if (!res.ok && res.status !== 204) {
        toast.error(data?.error ?? "Erro ao remover usuário")
        return
      }
      toast.success("Usuário removido")
      mutate()
      if (editingId === id) setEditingId(null)
    } finally {
      setDeletingId(null)
    }
  }

  const handleAddUser = async () => {
    if (!newUser.username.trim() || !newUser.password || !newUser.display_name.trim()) {
      toast.error("Preencha todos os campos: Login, Nome e Senha")
      return
    }
    setSaving(true)
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: newUser.username.trim(),
          password: newUser.password,
          display_name: newUser.display_name.trim(),
          email: newUser.email.trim() || null,
          role: newUser.role,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(data?.error ?? "Erro ao criar usuário")
        return
      }
      toast.success("Usuário cadastrado com sucesso")
      setShowAddUser(false)
      setNewUser({ username: "", password: "", display_name: "", email: "", role: "comercial" })
      globalMutate("recent-activity")
      globalMutate("all-activities")
      mutate()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="glass rounded-xl p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Usuários do Sistema</h2>
        <button
          onClick={() => setShowAddUser(true)}
          className="flex items-center gap-2 rounded-lg bg-primary/10 px-4 py-2 text-sm font-medium text-primary hover:bg-primary/20 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Novo Usuário
        </button>
      </div>

      {/* Modal Novo Usuário */}
      {showAddUser && (
        <div className="mb-6 rounded-xl border border-primary/20 bg-secondary p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-semibold text-foreground">Novo Usuário</h3>
            <button title="Fechar" onClick={() => setShowAddUser(false)} className="text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <input
              placeholder="Nome de exibição"
              value={newUser.display_name}
              onChange={(e) => setNewUser({ ...newUser, display_name: e.target.value })}
              className="h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
            />
            <input
              placeholder="E-mail que recebe o código de redefinição (só admin altera)"
              type="email"
              value={newUser.email}
              onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
              className="h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
            />
            <input
              placeholder="Login (usuário)"
              type="text"
              value={newUser.username}
              onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
              className="h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
            />
            <input
              placeholder="Senha"
              type="password"
              value={newUser.password}
              onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
              className="h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
            />
            <FormSelect
              title="Perfil"
              value={newUser.role}
              onValueChange={(role) => setNewUser({ ...newUser, role: role as UserRole })}
              triggerClassName="h-10"
              options={DASHBOARD_ROLES.map((r) => ({
                value: r,
                label: ROLE_LABELS[r] ?? r,
              }))}
            />
          </div>
          <button
            onClick={handleAddUser}
            disabled={saving}
            className="mt-4 flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition-colors"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Criar usuário
          </button>
        </div>
      )}

      {/* Duas colunas: Administradores e Comercial */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Coluna Administradores */}
        <div>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Administradores</h3>
          <div className="flex flex-col gap-4">
            {users
              .filter((u) => (u.role === "admin"))
              .map((user) => (
                <div
                  key={user.id}
                  className="rounded-xl border border-border bg-secondary/50 p-4 transition-all hover:border-primary/20"
                >
                  {editingId === user.id ? (
                    <div className="flex flex-col gap-3">
                      <div>
                        <label className="mb-1 block text-xs font-medium text-muted-foreground">Nome de exibição</label>
                        <input
                          placeholder="Ex: Pamella"
                          value={editForm.display_name}
                          onChange={(e) => setEditForm({ ...editForm, display_name: e.target.value })}
                          className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:border-primary focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-muted-foreground">E-mail que recebe o código de redefinição (só admin altera)</label>
                        <input
                          placeholder="Nenhum e-mail cadastrado"
                          type="email"
                          value={editForm.email}
                          onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                          className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                        />
                        <p className="mt-1 text-[11px] text-muted-foreground">Para alterar: apague o e-mail atual, digite o novo e clique em Salvar.</p>
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-muted-foreground">Login (igual ao nome de exibição)</label>
                        <input value={user.username} readOnly className="h-9 w-full rounded-lg border border-border bg-muted/50 px-3 text-sm text-muted-foreground" title="Altere o Nome de exibição acima e clique em Salvar para mudar o login." />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-muted-foreground">Perfil</label>
                        <FormSelect
                          value={editForm.role}
                          onValueChange={(role) => setEditForm({ ...editForm, role: role as UserRole })}
                          triggerClassName="h-9"
                          options={DASHBOARD_ROLES.map((r) => ({
                            value: r,
                            label: ROLE_LABELS[r] ?? r,
                          }))}
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-muted-foreground">Nova senha (deixe em branco para não alterar)</label>
                        <input
                          type="password"
                          placeholder="••••••••"
                          value={editForm.new_password}
                          onChange={(e) => setEditForm({ ...editForm, new_password: e.target.value })}
                          className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => saveEdit(user.id)}
                          disabled={saving}
                          className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-primary py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
                        >
                          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                          Salvar
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="flex-1 rounded-lg border border-border py-2 text-xs font-medium text-muted-foreground hover:bg-secondary"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/20 font-semibold text-sm text-primary">
                          {user.display_name?.charAt(0)?.toUpperCase() || user.username?.charAt(0)?.toUpperCase() || "?"}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-foreground truncate">{user.display_name}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{ROLE_LABELS[user.role as UserRole] ?? user.role}</p>
                          <p className="text-[11px] text-muted-foreground/80 truncate mt-0.5">
                            E-mail (código de redefinição): {user.email?.trim() || "—"}
                          </p>
                          {user.username.trim().toLowerCase() !== (user.display_name ?? "").trim().toLowerCase() && (
                            <p className="text-[11px] text-muted-foreground/80 truncate mt-0.5">Login: {user.username}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button title="Editar usuário" onClick={() => startEdit(user)} className="rounded-lg p-2 text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors">
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          title="Remover usuário"
                          onClick={() => handleRemove(user.id, user.display_name)}
                          disabled={deletingId === user.id}
                          className="rounded-lg p-2 text-muted-foreground hover:bg-red-500/10 hover:text-red-500 transition-colors disabled:opacity-50"
                        >
                          {deletingId === user.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            {users.filter((u) => u.role === "admin").length === 0 && (
              <p className="py-4 text-center text-sm text-muted-foreground">Nenhum administrador.</p>
            )}
          </div>
        </div>

        {/* Coluna Comercial */}
        <div>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Comercial</h3>
          <div className="flex flex-col gap-4">
            {users
              .filter((u) => (u.role !== "admin"))
              .map((user) => (
                <div
                  key={user.id}
                  className="rounded-xl border border-border bg-secondary/50 p-4 transition-all hover:border-primary/20"
                >
                  {editingId === user.id ? (
                    <div className="flex flex-col gap-3">
                      <div>
                        <label className="mb-1 block text-xs font-medium text-muted-foreground">Nome de exibição</label>
                        <input
                          placeholder="Ex: Pamella"
                          value={editForm.display_name}
                          onChange={(e) => setEditForm({ ...editForm, display_name: e.target.value })}
                          className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:border-primary focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-muted-foreground">E-mail que recebe o código de redefinição (só admin altera)</label>
                        <input
                          placeholder="Nenhum e-mail cadastrado"
                          type="email"
                          value={editForm.email}
                          onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                          className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                        />
                        <p className="mt-1 text-[11px] text-muted-foreground">Para alterar: apague o e-mail atual, digite o novo e clique em Salvar.</p>
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-muted-foreground">Login (igual ao nome de exibição)</label>
                        <input value={user.username} readOnly className="h-9 w-full rounded-lg border border-border bg-muted/50 px-3 text-sm text-muted-foreground" title="Altere o Nome de exibição acima e clique em Salvar para mudar o login." />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-muted-foreground">Perfil</label>
                        <FormSelect
                          value={editForm.role}
                          onValueChange={(role) => setEditForm({ ...editForm, role: role as UserRole })}
                          triggerClassName="h-9"
                          options={DASHBOARD_ROLES.map((r) => ({
                            value: r,
                            label: ROLE_LABELS[r] ?? r,
                          }))}
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-muted-foreground">Nova senha (deixe em branco para não alterar)</label>
                        <input
                          type="password"
                          placeholder="••••••••"
                          value={editForm.new_password}
                          onChange={(e) => setEditForm({ ...editForm, new_password: e.target.value })}
                          className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => saveEdit(user.id)}
                          disabled={saving}
                          className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-primary py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
                        >
                          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                          Salvar
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="flex-1 rounded-lg border border-border py-2 text-xs font-medium text-muted-foreground hover:bg-secondary"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/20 font-semibold text-sm text-primary">
                          {user.display_name?.charAt(0)?.toUpperCase() || user.username?.charAt(0)?.toUpperCase() || "?"}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-foreground truncate">{user.display_name}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{ROLE_LABELS[user.role as UserRole] ?? user.role}</p>
                          <p className="text-[11px] text-muted-foreground/80 truncate mt-0.5">
                            E-mail (código de redefinição): {user.email?.trim() || "—"}
                          </p>
                          {user.username.trim().toLowerCase() !== (user.display_name ?? "").trim().toLowerCase() && (
                            <p className="text-[11px] text-muted-foreground/80 truncate mt-0.5">Login: {user.username}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button title="Editar usuário" onClick={() => startEdit(user)} className="rounded-lg p-2 text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors">
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          title="Remover usuário"
                          onClick={() => handleRemove(user.id, user.display_name)}
                          disabled={deletingId === user.id}
                          className="rounded-lg p-2 text-muted-foreground hover:bg-red-500/10 hover:text-red-500 transition-colors disabled:opacity-50"
                        >
                          {deletingId === user.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            {users.filter((u) => u.role !== "admin").length === 0 && (
              <p className="py-4 text-center text-sm text-muted-foreground">Nenhum usuário comercial.</p>
            )}
          </div>
        </div>
      </div>

      {users.length === 0 && !showAddUser && (
        <p className="py-8 text-center text-sm text-muted-foreground">Nenhum usuário cadastrado. Clique em &quot;Novo Usuário&quot; para adicionar.</p>
      )}
    </div>
  )
}
