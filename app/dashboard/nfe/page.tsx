"use client"

import { useEffect, useMemo, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/lib/auth-context"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Loader2, FileText, Plus } from "lucide-react"
import { toast } from "sonner"

interface NFeDocument {
  id: string
  client_id: string | null
  number: string | null
  series: string | null
  status: string
  client_name: string
  total_value: number
  created_at: string
}

export default function NFePage() {
  const supabase = createClient()
  const { isAdmin } = useAuth()

  const [loading, setLoading] = useState(true)
  const [loadingModal, setLoadingModal] = useState(false)
  const [issuing, setIssuing] = useState(false)
  const [docs, setDocs] = useState<NFeDocument[]>([])
  const [open, setOpen] = useState(false)
  const [selectedDoc, setSelectedDoc] = useState<NFeDocument | null>(null)

  const [form, setForm] = useState({
    client_id: "",
    client_name: "",
    client_document: "",
    client_email: "",
    street: "",
    number: "",
    district: "",
    city: "",
    state: "",
    zip_code: "",
    nature_operation: "Prestação de serviços",
    cfop: "5933",
    description: "",
    total_value: "",
  })

  useEffect(() => {
    const load = async () => {
      setLoading(true)

      const { data, error } = await supabase
        .from("nfe_documents")
        .select("id, client_id, number, series, status, client_name, total_value, created_at")
        .order("created_at", { ascending: false })
        .limit(50)

      if (!error && data) {
        setDocs(data as NFeDocument[])
      }

      setLoading(false)
    }

    load()
  }, [])

  const totalEmitido = useMemo(
    () => docs.reduce((sum, n) => sum + (n.status === "emitida" ? Number(n.total_value) : 0), 0),
    [docs],
  )

  const handleOpenEmitModal = async (doc: NFeDocument) => {
    if (!doc.client_id) {
      toast.error("NF-e não está vinculada a um cliente.")
      return
    }

    setLoadingModal(true)

    const { data, error } = await supabase
      .from("clients")
      .select("id, name, email, cpf_cnpj, address, number, district, city, state, zip_code")
      .eq("id", doc.client_id)
      .maybeSingle()

    if (error || !data) {
      setLoadingModal(false)
      toast.error("Cliente não encontrado para esta NF-e.")
      return
    }

    const rawZip = (data.zip_code as string | null) || ""
    const rawDoc = (data.cpf_cnpj as string | null) || ""

    setSelectedDoc(doc)
    setForm({
      client_id: data.id as string,
      client_name: (data.name as string) || doc.client_name,
      client_document: rawDoc,
      client_email: (data.email as string | null) || "",
      street: (data.address as string | null) || "",
      number: (data.number as string | null) || "",
      district: (data.district as string | null) || "",
      city: (data.city as string | null) || "",
      state: ((data.state as string | null) || "").toUpperCase(),
      zip_code: rawZip,
      nature_operation: "Prestação de serviços de software (SaaS)",
      cfop: "5933",
      description: `Assinatura de software - valor mensal R$ ${Number(doc.total_value).toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
      })}`,
      total_value: String(doc.total_value ?? ""),
    })

    setLoadingModal(false)
    setOpen(true)
  }

  const handleIssue = async () => {
    if (!selectedDoc) {
      toast.error("Selecione uma NF-e pendente para emitir.")
      return
    }

    if (!form.client_id || !form.total_value) {
      toast.error("Dados do cliente ou valor total ausentes.")
      return
    }

    setIssuing(true)

    try {
      const total = Number(form.total_value)

      const payload = {
        id: selectedDoc.id,
        client_id: form.client_id,
        client_name: form.client_name,
        total_value: total,
        nature_operation: form.nature_operation,
        cfop: form.cfop,
        description: form.description,
        recipient: {
          document: form.client_document.replace(/\D/g, ""),
          name: form.client_name,
          email: form.client_email,
          address: {
            street: form.street,
            number: form.number,
            district: form.district,
            city: form.city,
            state: form.state,
            zip_code: form.zip_code?.replace(/\D/g, ""),
          },
        },
        items: [
          {
            description: form.description || "Serviços",
            quantity: 1,
            unit_value: total,
            total_value: total,
            cfop: form.cfop,
          },
        ],
      }

      const res = await fetch("/api/nfe/issue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      const data = await res.json()

      if (!res.ok) {
        console.error("Erro ao emitir NF-e:", data)
        toast.error(data.error || "Erro ao emitir NF-e")
        return
      }

      toast.success("NF-e emitida com sucesso.")
      if (data.nfe) {
        setDocs((prev) => prev.map((n) => (n.id === data.nfe.id ? (data.nfe as NFeDocument) : n)))
      }

      setForm({
        client_id: "",
        client_name: "",
        client_document: "",
        client_email: "",
        street: "",
        number: "",
        district: "",
        city: "",
        state: "",
        zip_code: "",
        nature_operation: "Prestação de serviços",
        cfop: "5933",
        description: "",
        total_value: "",
      })
      setSelectedDoc(null)
      setOpen(false)
    } catch (err) {
      console.error(err)
      toast.error("Erro inesperado ao emitir NF-e.")
    } finally {
      setIssuing(false)
    }
  }

  const handleGuessUF = async () => {
    if (!form.city || form.state) return

    try {
      const res = await fetch(`/api/geo/city-to-uf?name=${encodeURIComponent(form.city)}`)
      const data = await res.json()
      if (!res.ok || !data.uf) {
        return
      }
      setForm((prev) => ({ ...prev, state: String(data.uf).toUpperCase() }))
    } catch {
      // se falhar, apenas não preenche
    }
  }

  if (!isAdmin) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground">Acesso restrito a administradores.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Emissão de NF-e</h1>
          <p className="text-sm text-muted-foreground">
            Centralize a emissão de notas fiscais eletrônicas geradas a partir das assinaturas.
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total emitido</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              R$ {totalEmitido.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Quantidade de NF-e</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{docs.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Situação</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Integração via API externa configurada com <code>NFE_API_URL</code> e <code>NFE_API_KEY</code>.
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <FileText className="h-4 w-4" />
              NF-e recentes
            </CardTitle>
            <CardDescription>Notas fiscais geradas a partir das assinaturas deste painel.</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-10 text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Carregando notas fiscais...
            </div>
          ) : docs.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Nenhuma NF-e registrada ainda. Registre assinaturas para gerar notas fiscais pendentes.
            </p>
          ) : (
            <div className="space-y-2">
              {docs.map((nfe) => (
                <div
                  key={nfe.id}
                  className="flex flex-col gap-2 rounded-md border border-border/60 bg-card px-3 py-2 text-sm md:flex-row md:items-center md:justify-between"
                >
                  <div className="space-y-1">
                    <p className="font-medium">
                      NF-e {nfe.number || "—"}
                      {nfe.series ? ` / Série ${nfe.series}` : ""}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {nfe.client_name} •{" "}
                      {new Date(nfe.created_at).toLocaleString("pt-BR", {
                        dateStyle: "short",
                        timeStyle: "short",
                      })}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold">
                      R$ {Number(nfe.total_value).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </span>
                    <Badge
                      variant={nfe.status === "emitida" ? "default" : "outline"}
                      className={nfe.status === "emitida" ? "bg-emerald-600 text-white" : ""}
                    >
                      {nfe.status}
                    </Badge>
                    {nfe.status === "pendente" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenEmitModal(nfe)}
                        disabled={loadingModal || issuing}
                      >
                        {loadingModal && selectedDoc?.id === nfe.id ? (
                          <>
                            <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                            Carregando...
                          </>
                        ) : (
                          <>
                            <Plus className="mr-1 h-3 w-3" />
                            Emitir NF-e
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Emitir NF-e</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>CPF / CNPJ do cliente</Label>
              <Input value={form.client_document} disabled />
            </div>

            <div className="space-y-2">
              <Label>Cliente</Label>
              <Input value={form.client_name} disabled />
            </div>

            <div className="space-y-2">
              <Label>Natureza da operação</Label>
              <Input
                value={form.nature_operation}
                onChange={(e) => setForm((prev) => ({ ...prev, nature_operation: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>CFOP</Label>
                <Input value={form.cfop} onChange={(e) => setForm((prev) => ({ ...prev, cfop: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Valor total (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.total_value}
                  onChange={(e) => setForm((prev) => ({ ...prev, total_value: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Descrição dos serviços / produtos</Label>
              <Textarea
                rows={3}
                value={form.description}
                onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>CEP</Label>
                <Input
                  placeholder="Apenas números"
                  value={form.zip_code}
                  onChange={(e) => setForm((prev) => ({ ...prev, zip_code: e.target.value }))}
                  onBlur={async () => {
                    const raw = form.zip_code.replace(/\D/g, "")
                    if (!raw) return
                    try {
                      const res = await fetch(`/api/geo/cep?value=${encodeURIComponent(raw)}`)
                      const data = await res.json()
                      if (!res.ok) return
                      setForm((prev) => ({
                        ...prev,
                        zip_code: data.cep || prev.zip_code,
                        street: data.street || prev.street,
                        district: data.district || prev.district,
                        city: data.city || prev.city,
                        state: (data.state || prev.state || "").toUpperCase(),
                      }))
                    } catch {
                    }
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label>Cidade / UF</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Cidade"
                    value={form.city}
                    onChange={(e) => setForm((prev) => ({ ...prev, city: e.target.value }))}
                    onBlur={handleGuessUF}
                  />
                  <Input
                    placeholder="UF"
                    className="w-20"
                    value={form.state}
                    onChange={(e) => setForm((prev) => ({ ...prev, state: e.target.value.toUpperCase() }))}
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-[2fr,1fr,2fr] gap-4">
              <div className="space-y-2">
                <Label>Endereço</Label>
                <Input
                  value={form.street}
                  onChange={(e) => setForm((prev) => ({ ...prev, street: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Número</Label>
                <Input value={form.number} onChange={(e) => setForm((prev) => ({ ...prev, number: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Bairro</Label>
                <Input
                  value={form.district}
                  onChange={(e) => setForm((prev) => ({ ...prev, district: e.target.value }))}
                />
              </div>
            </div>

            <Button onClick={handleIssue} className="w-full" disabled={issuing}>
              {issuing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Emitindo NF-e...
                </>
              ) : (
                "Emitir NF-e"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

