"use client"

import { useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Plus, Trash2, Eye, EyeOff, Copy, Check, Pencil, Loader2 } from "lucide-react"
import useSWR from "swr"
import { toast } from "sonner"

interface Password {
  id: string
  service: string
  login: string
  password: string
  url?: string
  notes?: string
  category: string
  createdAt: Date
}

const credentialsApi = "/api/admin/credentials"

export default function SenhasPage() {
  const { isAdmin } = useAuth()

  const { data: passwords = [], mutate, isLoading } = useSWR(
    isAdmin ? credentialsApi : null,
    async (url: string) => {
      const res = await fetch(url, { credentials: "include" })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j.error || "Erro ao carregar credenciais.")
      }
      const data = await res.json()
      return (data || []).map((row: { id: string; service: string; login: string; password: string; url?: string; notes?: string; category: string; created_at: string }) => ({
        id: row.id,
        service: row.service,
        login: row.login,
        password: row.password,
        url: row.url,
        notes: row.notes,
        category: row.category,
        createdAt: new Date(row.created_at),
      })) as Password[]
    },
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      errorRetryCount: 0,
      dedupingInterval: 5000,
    }
  )

  const [visiblePasswords, setVisiblePasswords] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [formData, setFormData] = useState({
    service: "",
    login: "",
    password: "",
    url: "",
    notes: "",
    category: "FERRAMENTAS",
  })
  const [filterCategory, setFilterCategory] = useState<string>("TODAS")

  const categories = ["FERRAMENTAS", "DOMÍNIOS", "HOSPEDAGENS", "OUTROS"]
  const filteredPasswords =
    !filterCategory || filterCategory === "TODAS"
      ? passwords
      : passwords.filter((p) => p.category === filterCategory)

  const handleAddPassword = async () => {
    if (!formData.service?.trim() || !formData.login?.trim() || !formData.password?.trim()) {
      toast.error("Preencha Serviço, Login e Senha.")
      return
    }
    setSaving(true)
    try {
      const res = await fetch(credentialsApi, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          id: editingId || undefined,
          service: formData.service.trim(),
          login: formData.login.trim(),
          password: formData.password,
          url: formData.url?.trim() || null,
          notes: formData.notes?.trim() || null,
          category: formData.category,
        }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(j.error || "Erro ao salvar.")
      }
      toast.success(editingId ? "Acesso atualizado." : "Acesso cadastrado.")
      setEditingId(null)
      setFormData({ service: "", login: "", password: "", url: "", notes: "", category: "FERRAMENTAS" })
      setIsDialogOpen(false)
      await mutate()
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Erro ao salvar."
      toast.error(msg)
    } finally {
      setSaving(false)
    }
  }

  const handleEditPassword = (pwd: Password) => {
    setEditingId(pwd.id)
    setFormData({
      service: pwd.service,
      login: pwd.login,
      password: pwd.password,
      url: pwd.url || "",
      notes: pwd.notes || "",
      category: pwd.category,
    })
    setIsDialogOpen(true)
  }

  const handleDeletePassword = async (id: string) => {
    if (!confirm("Tem certeza que deseja deletar este acesso?")) return
    try {
      const res = await fetch(`${credentialsApi}?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
        credentials: "include",
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(j.error || "Erro ao remover.")
      setVisiblePasswords((prev) => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
      toast.success("Acesso removido.")
      await mutate()
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Erro ao remover."
      toast.error(msg)
    }
  }

  const togglePasswordVisibility = (id: string) => {
    setVisiblePasswords((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(id)) {
        newSet.delete(id)
      } else {
        newSet.add(id)
      }
      return newSet
    })
  }

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-lg text-muted-foreground">Acesso restrito a administradores</p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gerenciamento dos Sistemas</h1>
          <p className="text-muted-foreground mt-2">Login, senha e link das ferramentas do sistema (banco de dados, hospedagem, domínios, etc.)</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open)
          if (!open) setEditingId(null)
        }}>
          <DialogTrigger asChild>
            <Button className="gap-2" onClick={() => { setEditingId(null); setFormData({ service: "", login: "", password: "", url: "", notes: "", category: "FERRAMENTAS" }) }}>
              <Plus className="h-4 w-4" />
              Adicionar Acesso
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editingId ? "Editar Acesso" : "Adicionar Novo Acesso"}</DialogTitle>
              <DialogDescription>{editingId ? "Altere os dados do acesso." : "Adicione um novo acesso de ferramenta, domínio ou hospedagem."}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="service">Serviço/Ferramenta *</Label>
                <Input
                  id="service"
                  placeholder="Ex: GoDaddy, Vercel, etc"
                  value={formData.service}
                  onChange={(e) => setFormData({ ...formData, service: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="category">Categoria</Label>
                <select
                  id="category"
                  title="Categoria do acesso"
                  aria-label="Categoria do acesso"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground"
                >
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="login">Login/Email/Usuário *</Label>
                <Input
                  id="login"
                  placeholder="seu.email@example.com"
                  value={formData.login}
                  onChange={(e) => setFormData({ ...formData, login: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="password">Senha *</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="url">URL/Link (Opcional)</Label>
                <Input
                  id="url"
                  placeholder="https://example.com"
                  value={formData.url}
                  onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="notes">Notas (Opcional)</Label>
                <Input
                  id="notes"
                  placeholder="Observações importantes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                />
              </div>
              <Button onClick={handleAddPassword} className="w-full" disabled={saving}>
                {saving ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Salvando...</> : "Salvar Acesso"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Um único bloco: só aparece quando há pelo menos um acesso */}
      {passwords.length > 0 && (
        <Card>
          <div className="p-4 border-b border-border flex flex-wrap items-center gap-4">
            <span className="text-sm font-medium text-muted-foreground">Filtrar por categoria:</span>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground"
              aria-label="Filtrar por categoria"
            >
              <option value="TODAS">Todas</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
            <span className="text-xs text-muted-foreground">
              {filteredPasswords.length} {filteredPasswords.length === 1 ? "acesso" : "acessos"}
            </span>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-b bg-muted/40 hover:bg-muted/40">
                  <TableHead className="whitespace-nowrap py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground w-[14%]">Categoria</TableHead>
                  <TableHead className="whitespace-nowrap py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground w-[18%]">Serviço</TableHead>
                  <TableHead className="whitespace-nowrap py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground w-[18%]">Observações</TableHead>
                  <TableHead className="whitespace-nowrap py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground w-[22%]">Login</TableHead>
                  <TableHead className="whitespace-nowrap py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground w-[18%]">Senha</TableHead>
                  <TableHead className="whitespace-nowrap py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground w-[10%] text-center">Editar / Remover</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPasswords.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                      Nenhum acesso nesta categoria
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPasswords.map((pwd) => (
                    <TableRow key={pwd.id} className="border-b hover:bg-muted/20">
                      <TableCell className="py-2.5 align-middle whitespace-nowrap text-sm text-muted-foreground">
                        {pwd.category}
                      </TableCell>
                      <TableCell className="py-2.5 align-middle whitespace-nowrap">
                        <span className="font-medium" title={pwd.service}>{pwd.service}</span>
                      </TableCell>
                      <TableCell className="py-2.5 align-middle whitespace-nowrap">
                        <span className="text-sm text-muted-foreground" title={pwd.notes || ""}>{pwd.notes || "—"}</span>
                      </TableCell>
                      <TableCell className="py-2.5 align-middle whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-sm truncate min-w-0" title={pwd.login}>{pwd.login}</span>
                          {pwd.url && (
                            <a href={pwd.url} target="_blank" rel="noopener noreferrer" className="shrink-0 text-xs text-primary hover:underline" title={pwd.url}>
                              (link)
                            </a>
                          )}
                          <button
                            onClick={() => copyToClipboard(pwd.login, `login-${pwd.id}`)}
                            className="shrink-0 p-0.5 text-muted-foreground hover:text-foreground transition-colors"
                            title="Copiar login"
                          >
                            {copiedId === `login-${pwd.id}` ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                          </button>
                        </div>
                      </TableCell>
                      <TableCell className="py-2.5 align-middle">
                        <div className="flex items-center gap-1.5 whitespace-nowrap">
                          <span className="font-mono text-sm truncate max-w-[120px]">
                            {visiblePasswords.has(pwd.id) ? pwd.password : "••••••••"}
                          </span>
                          <button
                            onClick={() => togglePasswordVisibility(pwd.id)}
                            className="shrink-0 p-0.5 text-muted-foreground hover:text-foreground transition-colors"
                            title="Mostrar/Ocultar senha"
                          >
                            {visiblePasswords.has(pwd.id) ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                          <button
                            onClick={() => copyToClipboard(pwd.password, pwd.id)}
                            className="shrink-0 p-0.5 text-muted-foreground hover:text-foreground transition-colors"
                            title="Copiar senha"
                          >
                            {copiedId === pwd.id ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                          </button>
                        </div>
                      </TableCell>
                      <TableCell className="py-2.5 align-middle">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleEditPassword(pwd)}
                            className="inline-flex p-0.5 text-muted-foreground hover:text-foreground transition-colors"
                            title="Editar acesso"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeletePassword(pwd.id)}
                            className="inline-flex p-0.5 text-destructive hover:text-destructive/80 transition-colors"
                            title="Remover acesso"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      {passwords.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="pt-12 text-center">
            <p className="text-muted-foreground mb-4">Nenhum acesso cadastrado ainda</p>
            <p className="text-sm text-muted-foreground mb-6">Comece adicionando seus acessos clicando no botão acima</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
