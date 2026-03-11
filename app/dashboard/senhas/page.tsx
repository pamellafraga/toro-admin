"use client"

import { useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Plus, Trash2, Eye, EyeOff, Copy, Check } from "lucide-react"

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

export default function SenhasPage() {
  const { isAdmin } = useAuth()
  const [passwords, setPasswords] = useState<Password[]>([])
  const [visiblePasswords, setVisiblePasswords] = useState<Set<string>>(new Set())
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [formData, setFormData] = useState({
    service: "",
    login: "",
    password: "",
    url: "",
    notes: "",
    category: "FERRAMENTAS",
  })

  const categories = ["FERRAMENTAS", "DOMÍNIOS", "HOSPEDAGENS", "OUTROS"]

  const handleAddPassword = () => {
    if (!formData.service || !formData.login || !formData.password) {
      alert("Por favor, preencha os campos obrigatórios: Serviço, Login e Senha")
      return
    }

    const newPassword: Password = {
      id: Date.now().toString(),
      service: formData.service,
      login: formData.login,
      password: formData.password,
      url: formData.url,
      notes: formData.notes,
      category: formData.category,
      createdAt: new Date(),
    }

    setPasswords([...passwords, newPassword])
    setFormData({ service: "", login: "", password: "", url: "", notes: "", category: "FERRAMENTAS" })
    setIsDialogOpen(false)
  }

  const handleDeletePassword = (id: string) => {
    if (confirm("Tem certeza que deseja deletar este acesso?")) {
      setPasswords(passwords.filter((pwd) => pwd.id !== id))
      setVisiblePasswords((prev) => {
        const newSet = new Set(prev)
        newSet.delete(id)
        return newSet
      })
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

  const groupedPasswords = categories.map((cat) => ({
    category: cat,
    items: passwords.filter((p) => p.category === cat),
  }))

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-lg text-muted-foreground">Acesso restrito a administradores</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Senhas de Administração</h1>
          <p className="text-muted-foreground mt-2">Gerenciador seguro de acessos para ferramentas, domínios e hospedagens</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Adicionar Acesso
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Adicionar Novo Acesso</DialogTitle>
              <DialogDescription>Adicione um novo acesso de ferramenta, domínio ou hospedagem</DialogDescription>
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
              <Button onClick={handleAddPassword} className="w-full">
                Salvar Acesso
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Tabelas por Categoria */}
      <div className="space-y-8">
        {groupedPasswords.map((group) => (
          <div key={group.category}>
            <h2 className="text-xl font-semibold mb-4">🔐 {group.category}</h2>
            {group.items.length === 0 ? (
              <Card>
                <CardContent className="pt-6 text-center text-muted-foreground">
                  Nenhum acesso cadastrado nesta categoria
                </CardContent>
              </Card>
            ) : (
              <Card>
                <Table>
                  <TableHeader>
                    <TableRow className="border-b">
                      <TableHead className="w-[25%]">Serviço</TableHead>
                      <TableHead className="w-[25%]">Login</TableHead>
                      <TableHead className="w-[20%]">Senha</TableHead>
                      <TableHead className="w-[20%]">Ações</TableHead>
                      <TableHead className="w-[10%]">Remover</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {group.items.map((pwd) => (
                      <TableRow key={pwd.id} className="border-b">
                        <TableCell>
                          <div>
                            <p className="font-medium">{pwd.service}</p>
                            {pwd.notes && <p className="text-xs text-muted-foreground">{pwd.notes}</p>}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-mono text-sm">{pwd.login}</div>
                          {pwd.url && (
                            <a href={pwd.url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 hover:underline">
                              {pwd.url.replace("https://", "").replace("http://", "").substring(0, 30)}...
                            </a>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm">
                              {visiblePasswords.has(pwd.id) ? pwd.password : "••••••••"}
                            </span>
                            <button
                              onClick={() => togglePasswordVisibility(pwd.id)}
                              className="text-muted-foreground hover:text-foreground transition-colors"
                              title="Mostrar/Ocultar senha"
                            >
                              {visiblePasswords.has(pwd.id) ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                            <button
                              onClick={() => copyToClipboard(pwd.password, pwd.id)}
                              className="text-muted-foreground hover:text-foreground transition-colors"
                              title="Copiar senha"
                            >
                              {copiedId === pwd.id ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                            </button>
                          </div>
                        </TableCell>
                        <TableCell>
                          <button
                            onClick={() => copyToClipboard(pwd.login, `login-${pwd.id}`)}
                            className="text-muted-foreground hover:text-foreground transition-colors"
                            title="Copiar login"
                          >
                            {copiedId === `login-${pwd.id}` ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                          </button>
                        </TableCell>
                        <TableCell>
                          <button
                            onClick={() => handleDeletePassword(pwd.id)}
                            className="text-destructive hover:text-destructive/80 transition-colors"
                            title="Deletar acesso"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            )}
          </div>
        ))}
      </div>

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
