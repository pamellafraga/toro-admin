"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Plus, Pencil, X, UserCheck, UserX, Save } from "lucide-react"
import { ROLE_LABELS, PERMISSION_LABELS, ROLE_PERMISSIONS, type Profile, type Permission, type UserRole } from "@/lib/types"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import useSWR from "swr"

export function UserCards() {
  const supabase = createClient()
  const [editingUser, setEditingUser] = useState<string | null>(null)
  const [showAddUser, setShowAddUser] = useState(false)

  const { data: profiles, mutate } = useSWR("profiles", async () => {
    const { data } = await supabase.from("profiles").select("*").order("created_at")
    return (data || []) as Profile[]
  })

  const [editForm, setEditForm] = useState({
    name: "",
    role: "custom" as UserRole,
    is_active: true,
    permissions: [] as Permission[],
  })

  const [newUser, setNewUser] = useState({
    login: "",
    password: "",
    name: "",
    role: "custom" as UserRole,
    permissions: [] as Permission[],
  })

  const startEdit = (profile: Profile) => {
    setEditingUser(profile.id)
    setEditForm({
      name: profile.name,
      role: profile.role,
      is_active: profile.is_active,
      permissions: profile.permissions as Permission[],
    })
  }

  const saveEdit = async (id: string) => {
    const { error } = await supabase
      .from("profiles")
      .update({
        name: editForm.name,
        role: editForm.role,
        is_active: editForm.is_active,
        permissions: editForm.role === "custom" ? editForm.permissions : ROLE_PERMISSIONS[editForm.role],
      })
      .eq("id", id)

    if (error) {
      toast.error("Erro ao atualizar usuario")
      return
    }

    toast.success("Usuario atualizado com sucesso")
    setEditingUser(null)
    mutate()
  }

  const handleAddUser = async () => {
    if (!newUser.login.trim() || !newUser.password.trim() || !newUser.name.trim()) {
      toast.error("Preencha todos os campos obrigatorios (Login, Nome e Senha)")
      return
    }

    const email = `${newUser.login.toLowerCase().trim()}@xpress.local`

    const { data, error } = await supabase.auth.signUp({
      email,
      password: newUser.password,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
        data: {
          name: newUser.name,
          role: newUser.role,
          permissions: newUser.role === "custom" ? newUser.permissions : ROLE_PERMISSIONS[newUser.role],
        },
      },
    })

    if (error || !data.user) {
      toast.error("Erro ao criar usuario: " + (error?.message || "Erro desconhecido"))
      return
    }

    toast.success("Usuario criado com sucesso!")
    setShowAddUser(false)
    setNewUser({ login: "", password: "", name: "", role: "custom", permissions: [] })
    mutate()
  }

  const togglePermission = (perms: Permission[], perm: Permission): Permission[] => {
    return perms.includes(perm) ? perms.filter((p) => p !== perm) : [...perms, perm]
  }

  return (
    <div className="glass rounded-xl p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Usuarios do Sistema</h2>
        <button
          onClick={() => setShowAddUser(true)}
          className="flex items-center gap-2 rounded-lg bg-primary/10 px-4 py-2 text-sm font-medium text-primary hover:bg-primary/20 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Novo Usuario
        </button>
      </div>

      {/* Add User Modal */}
      {showAddUser && (
        <div className="mb-6 rounded-xl border border-primary/20 bg-secondary p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-semibold text-foreground">Novo Usuario</h3>
            <button title="Fechar" onClick={() => setShowAddUser(false)} className="text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <input
              placeholder="Nome"
              value={newUser.name}
              onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
              className="h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
            />
            <input
              placeholder="Login (ex: marketing)"
              type="text"
              value={newUser.login}
              onChange={(e) => setNewUser({ ...newUser, login: e.target.value })}
              className="h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
            />
            <input
              placeholder="Senha"
              type="password"
              value={newUser.password}
              onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
              className="h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
            />
            <select
              title="Perfil de acesso"
              value={newUser.role}
              onChange={(e) => setNewUser({ ...newUser, role: e.target.value as UserRole })}
              className="h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:border-primary focus:outline-none"
            >
              {Object.entries(ROLE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
          {newUser.role === "custom" && (
            <div className="mt-4">
              <p className="mb-2 text-sm text-muted-foreground">Permissoes:</p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(PERMISSION_LABELS).map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => setNewUser({ ...newUser, permissions: togglePermission(newUser.permissions, key as Permission) })}
                    className={cn(
                      "rounded-lg px-3 py-1.5 text-xs font-medium border transition-colors",
                      newUser.permissions.includes(key as Permission)
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:border-primary/50"
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}
          <button
            onClick={handleAddUser}
            className="mt-4 flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Save className="h-4 w-4" />
            Criar Usuario
          </button>
        </div>
      )}

      {/* User Cards Grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {profiles?.map((profile) => (
          <div
            key={profile.id}
            className={cn(
              "rounded-xl border p-4 transition-all",
              profile.is_active
                ? "border-border bg-secondary/50 hover:border-primary/30"
                : "border-border/50 bg-secondary/20 opacity-60"
            )}
          >
            {editingUser === profile.id ? (
              <div className="flex flex-col gap-3">
                <input
                  title="Nome do usuário"
                  placeholder="Nome"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="h-9 rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:border-primary focus:outline-none"
                />
                <select
                  title="Perfil de acesso"
                  value={editForm.role}
                  onChange={(e) => setEditForm({ ...editForm, role: e.target.value as UserRole })}
                  className="h-9 rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:border-primary focus:outline-none"
                >
                  {Object.entries(ROLE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
                {editForm.role === "custom" && (
                  <div className="flex flex-wrap gap-1.5">
                    {Object.entries(PERMISSION_LABELS).map(([key, label]) => (
                      <button
                        key={key}
                        onClick={() => setEditForm({ ...editForm, permissions: togglePermission(editForm.permissions, key as Permission) })}
                        className={cn(
                          "rounded px-2 py-1 text-[11px] font-medium border transition-colors",
                          editForm.permissions.includes(key as Permission)
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border text-muted-foreground"
                        )}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setEditForm({ ...editForm, is_active: !editForm.is_active })}
                    className={cn(
                      "flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium transition-colors",
                      editForm.is_active ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"
                    )}
                  >
                    {editForm.is_active ? <UserCheck className="h-3.5 w-3.5" /> : <UserX className="h-3.5 w-3.5" />}
                    {editForm.is_active ? "Ativo" : "Inativo"}
                  </button>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => saveEdit(profile.id)}
                    className="flex-1 rounded-lg bg-primary py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
                  >
                    Salvar
                  </button>
                  <button
                    onClick={() => setEditingUser(null)}
                    className="flex-1 rounded-lg border border-border py-2 text-xs font-medium text-muted-foreground hover:bg-secondary transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-full font-semibold text-sm",
                    profile.is_active ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
                  )}>
                    {profile.name?.charAt(0)?.toUpperCase() || "?"}
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{profile.name}</p>
                    <p className="text-xs text-muted-foreground">{ROLE_LABELS[profile.role] || profile.role}</p>
                    <div className="mt-1 flex items-center gap-1.5">
                      <span className={cn(
                        "h-1.5 w-1.5 rounded-full",
                        profile.is_active ? "bg-emerald-400" : "bg-red-400"
                      )} />
                      <span className="text-[11px] text-muted-foreground">{profile.is_active ? "Ativo" : "Inativo"}</span>
                    </div>
                  </div>
                </div>
                <button
                  title="Editar usuário"
                  onClick={() => startEdit(profile)}
                  className="rounded-lg p-2 text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors"
                >
                  <Pencil className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
