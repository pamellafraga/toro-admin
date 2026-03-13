"use client"

import { useEffect, useMemo, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/lib/auth-context"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
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
  provider_payload?: { contract_id?: string } | null
}

type ClientRow = {
  id: string
  name: string | null
  email: string | null
  cpf_cnpj: string | null
  address: string | null
  number: string | null
  district: string | null
  city: string | null
  state: string | null
  zip_code: string | null
}

export default function NFePage() {
  const supabase = createClient()
  const { isAdmin } = useAuth()

  const [loading, setLoading] = useState(true)
  const [loadingModal, setLoadingModal] = useState(false)
  const [issuing, setIssuing] = useState(false)
  const [docs, setDocs] = useState<NFeDocument[]>([])
  const [contractValueByContractId, setContractValueByContractId] = useState<Record<string, number>>({})
  const [clientIdByContractId, setClientIdByContractId] = useState<Record<string, string>>({})
  const [open, setOpen] = useState(false)
  const [selectedDoc, setSelectedDoc] = useState<NFeDocument | null>(null)

  const [form, setForm] = useState({
    client_id: "",
    client_name: "",
    client_document: "",
    client_email: "",
    street: "",
    number: "",
    complement: "",
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

      const { data: rawDocs, error } = await supabase
        .from("nfe_documents")
        .select("id, client_id, number, series, status, client_name, total_value, created_at, provider_payload")
        .order("created_at", { ascending: false })
        .limit(100)

      if (error) {
        setLoading(false)
        return
      }

      const allDocs = (rawDocs || []) as NFeDocument[]
      const contractIds = [...new Set(allDocs.map((d) => (d.provider_payload as { contract_id?: string } | null)?.contract_id).filter(Boolean))] as string[]

      if (contractIds.length === 0) {
        setDocs([])
        setLoading(false)
        return
      }

      const { data: contracts } = await supabase
        .from("contracts")
        .select("id, client_id, payment_status, monthly_value")
        .in("id", contractIds)

      const emDiaIds = new Set(
        (contracts || [])
          .filter((c) => {
            const p = (c.payment_status ?? "").toString().toLowerCase()
            return p === "em_dia" || p === "paid"
          })
          .map((c) => c.id),
      )

      const valueByContractId: Record<string, number> = {}
      const clientIdByContract: Record<string, string> = {}
      ;(contracts || []).forEach((c) => {
        valueByContractId[c.id] = Number((c as { monthly_value?: number }).monthly_value ?? 0)
        const cid = (c as { client_id?: string }).client_id
        if (cid) clientIdByContract[c.id] = cid
      })
      setContractValueByContractId(valueByContractId)
      setClientIdByContractId(clientIdByContract)

      const filtered = allDocs.filter((d) => {
        const cid = (d.provider_payload as { contract_id?: string } | null)?.contract_id
        if (!cid) return false
        return emDiaIds.has(cid)
      })

      setDocs(filtered)
      setLoading(false)
    }

    load()
  }, [])

  const totalEmitido = useMemo(
    () => docs.reduce((sum, n) => sum + (n.status === "emitida" ? Number(n.total_value) : 0), 0),
    [docs],
  )

  const handleOpenEmitModal = async (doc: NFeDocument) => {
    setLoadingModal(true)
    setSelectedDoc(doc)

    const contractId = (doc.provider_payload as { contract_id?: string } | null)?.contract_id
    let clientData: ClientRow | null = null
    let contractMonthlyValue: number | null = null

    // 1) Buscar pelo nome (API no servidor + Supabase no cliente)
    if (doc.client_name?.trim()) {
      const nameTrim = doc.client_name.trim()
      try {
        const res = await fetch(`/api/clients/search?name=${encodeURIComponent(nameTrim)}`)
        const json = await res.json()
        if (json?.client) clientData = json.client as ClientRow
      } catch {
        // ignora erro da API
      }
      if (!clientData) {
        const { data: list } = await supabase
          .from("clients")
          .select("id, name, email, cpf_cnpj, address, number, district, city, state, zip_code")
          .ilike("name", `%${nameTrim}%`)
          .limit(5)
        if (Array.isArray(list) && list.length > 0) clientData = list[0] as ClientRow
      }
    }

    // 2) Cliente já carregado na lista (mapa contrato -> client_id)
    const knownClientId = contractId ? clientIdByContractId[contractId] : null
    if (!clientData && knownClientId) {
      const res = await supabase
        .from("clients")
        .select("id, name, email, cpf_cnpj, address, number, district, city, state, zip_code")
        .eq("id", knownClientId)
        .maybeSingle()
      if (!res.error && res.data) clientData = res.data as ClientRow
    }

    // Prioridade 1b: buscar pelo contrato (se ainda não achou)
    if (!clientData && contractId) {
      const { data: contract } = await supabase
        .from("contracts")
        .select("client_id, monthly_value")
        .eq("id", contractId)
        .maybeSingle()
      const c = contract as { client_id?: string; monthly_value?: number } | null
      if (c?.monthly_value != null) contractMonthlyValue = Number(c.monthly_value)
      const cid = c?.client_id
      if (cid) {
        const res = await supabase
          .from("clients")
          .select("id, name, email, cpf_cnpj, address, number, district, city, state, zip_code")
          .eq("id", cid)
          .maybeSingle()
        if (!res.error && res.data) clientData = res.data as ClientRow
      }
    }

    // Fallback 2: pelo client_id do documento
    if (!clientData && doc.client_id) {
      const res = await supabase
        .from("clients")
        .select("id, name, email, cpf_cnpj, address, number, district, city, state, zip_code")
        .eq("id", doc.client_id)
        .maybeSingle()
      if (!res.error && res.data) clientData = res.data as ClientRow
    }


    if (doc.status === "pendente" && contractId && contractMonthlyValue == null) {
      const { data: contract } = await supabase
        .from("contracts")
        .select("monthly_value")
        .eq("id", contractId)
        .maybeSingle()
      const val = (contract as { monthly_value?: number } | null)?.monthly_value
      if (val != null) contractMonthlyValue = Number(val)
    }

    const payload = doc.provider_payload as {
      contract_id?: string
      recipient?: {
        document?: string
        email?: string
        street?: string
        number?: string
        district?: string
        city?: string
        state?: string
        zip_code?: string
      }
    } | null
    const recipient = payload?.recipient

    const valorAtual = doc.status === "pendente"
      ? (contractValueByContractId[contractId ?? ""] ?? contractMonthlyValue ?? Number(doc.total_value ?? 0))
      : Number(doc.total_value ?? 0)

    let rawDoc = clientData ? (String(clientData.cpf_cnpj ?? "")) : ""
    let street = clientData ? (String(clientData.address ?? "")) : ""
    let number = clientData ? (String(clientData.number ?? "")) : ""
    let district = clientData ? (String(clientData.district ?? "")) : ""
    let city = clientData ? (String(clientData.city ?? "")) : ""
    let state = clientData ? (String(clientData.state ?? "")).toUpperCase() : ""
    let zip_code = clientData ? (String(clientData.zip_code ?? "")) : ""
    let clientEmail = clientData?.email ?? ""

    if (recipient) {
      rawDoc = (recipient.document ?? "").toString() || rawDoc
      clientEmail = (recipient.email ?? "").toString() || clientEmail
      street = (recipient.street ?? "").toString() || street
      number = (recipient.number ?? "").toString() || number
      district = (recipient.district ?? "").toString() || district
      city = (recipient.city ?? "").toString() || city
      state = (recipient.state ?? "").toString().toUpperCase() || state
      zip_code = (recipient.zip_code ?? "").toString() || zip_code
    }

    if (!recipient && clientData && street && !city && !state && !zip_code) {
      const parts = street.split(",").map((p) => p.trim()).filter(Boolean)
      if (parts.length >= 2) {
        street = parts[0]
        number = number || parts[1] || ""
        district = district || (parts[2] ?? "")
        city = city || (parts[3] ?? "")
        state = (state || (parts[4] ?? "")).toUpperCase()
        zip_code = zip_code || (parts[5] ?? "")
      }
    }

    setForm({
      client_id: clientData?.id ?? "",
      client_name: (clientData?.name ?? "") || doc.client_name || "",
      client_document: rawDoc,
      client_email: clientEmail,
      street,
      number,
      complement: "",
      district,
      city,
      state,
      zip_code,
      nature_operation: "Prestação de serviços de software (SaaS)",
      cfop: "5933",
      description: `Assinatura de software - valor mensal R$ ${valorAtual.toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
      })}`,
      total_value: String(valorAtual),
    })

    setLoadingModal(false)
    setOpen(true)
    if (!clientData && !recipient) {
      toast.info("Cliente não encontrado pelo vínculo. Busque pelo CPF/CNPJ para preencher os dados.")
    }
  }

  const handleIssue = async () => {
    if (!selectedDoc) {
      toast.error("Selecione uma NF-e pendente para emitir.")
      return
    }

    if (!form.total_value) {
      toast.error("Informe o valor total.")
      return
    }
    const docOk = form.client_document?.replace(/\D/g, "").length === 11 || form.client_document?.replace(/\D/g, "").length === 14
    if (!docOk) {
      toast.error("CPF/CNPJ do cliente é obrigatório e deve ter 11 ou 14 dígitos.")
      return
    }
    if (!form.client_name?.trim()) {
      toast.error("Nome do cliente é obrigatório.")
      return
    }

    setIssuing(true)

    try {
      const total = Number(form.total_value)

      const payload = {
        id: selectedDoc.id,
        client_id: form.client_id || null,
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
            complement: form.complement || undefined,
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
        complement: "",
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

  const handleBuscarCliente = async () => {
    let raw = form.client_document?.replace(/\D/g, "") ?? ""
    if (raw.length !== 11 && raw.length !== 14) {
      toast.error("Informe um CPF (11 dígitos) ou CNPJ (14 dígitos) válido.")
      return
    }
    const tentar = raw.length === 11 && raw.startsWith("0") ? [raw, raw.slice(1)] : [raw]
    let data: ClientRow | null = null
    for (const cpf of tentar) {
      const { data: res, error } = await supabase
        .from("clients")
        .select("id, name, email, cpf_cnpj, address, number, district, city, state, zip_code")
        .eq("cpf_cnpj", cpf)
        .maybeSingle()
      if (!error && res) {
        data = res as ClientRow
        break
      }
    }
    if (!data) {
      toast.error("Cliente não encontrado com este CPF/CNPJ.")
      return
    }
    const c = data
    let street = (c.address ?? "").toString()
    let number = (c.number ?? "").toString()
    let district = (c.district ?? "").toString()
    let city = (c.city ?? "").toString()
    let state = (c.state ?? "").toString().toUpperCase()
    let zip_code = (c.zip_code ?? "").toString()
    if (street && !city && !state && !zip_code) {
      const parts = street.split(",").map((p) => p.trim()).filter(Boolean)
      if (parts.length >= 2) {
        street = parts[0]
        number = number || parts[1] || ""
        district = district || (parts[2] ?? "")
        city = city || (parts[3] ?? "")
        state = (state || (parts[4] ?? "")).toUpperCase()
        zip_code = zip_code || (parts[5] ?? "")
      }
    }
    setForm((prev) => ({
      ...prev,
      client_id: c.id,
      client_name: c.name ?? prev.client_name,
      client_document: (c.cpf_cnpj ?? "").toString(),
      client_email: (c.email ?? "").toString(),
      street,
      number,
      district,
      city,
      state,
      zip_code,
    }))
    toast.success("Cliente carregado.")
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
                      R$ {(nfe.status === "pendente"
                        ? (contractValueByContractId[(nfe.provider_payload as { contract_id?: string } | null)?.contract_id ?? ""] ?? Number(nfe.total_value))
                        : Number(nfe.total_value)
                      ).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
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
        <DialogContent className="max-w-4xl w-[96vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nova NF-e</DialogTitle>
            <DialogDescription className="text-left">
              Preencha os dados exigidos por lei para emissão de nota fiscal eletrônica de serviço.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>CPF / CNPJ do cliente</Label>
              <div className="flex gap-2">
                <Input
                  value={form.client_document}
                  disabled={!!form.client_id}
                  onChange={(e) => setForm((prev) => ({ ...prev, client_document: e.target.value.replace(/\D/g, "") }))}
                  placeholder="Apenas números"
                  className="font-mono"
                />
                {!form.client_id && (
                  <Button type="button" variant="secondary" onClick={handleBuscarCliente}>
                    Buscar
                  </Button>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Cliente</Label>
              <Input
                value={form.client_name}
                disabled={!!form.client_id}
                onChange={(e) => !form.client_id && setForm((prev) => ({ ...prev, client_name: e.target.value }))}
                placeholder="Selecione o cliente ou busque pelo CPF/CNPJ"
              />
            </div>

            <div className="space-y-2">
              <Label>Natureza da operação</Label>
              <Input
                value={form.nature_operation}
                onChange={(e) => setForm((prev) => ({ ...prev, nature_operation: e.target.value }))}
                placeholder="Ex.: Prestação de serviços"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>CFOP</Label>
                <Input value={form.cfop} onChange={(e) => setForm((prev) => ({ ...prev, cfop: e.target.value }))} placeholder="5933" />
              </div>
              <div className="space-y-2">
                <Label>Valor total (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.total_value}
                  onChange={(e) => setForm((prev) => ({ ...prev, total_value: e.target.value }))}
                  placeholder="0,00"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Descrição dos serviços / produtos</Label>
              <Textarea
                rows={3}
                value={form.description}
                onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Discriminação dos serviços prestados"
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
                    maxLength={2}
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
                  placeholder="Logradouro"
                />
              </div>
              <div className="space-y-2">
                <Label>Número</Label>
                <Input value={form.number} onChange={(e) => setForm((prev) => ({ ...prev, number: e.target.value }))} placeholder="Nº" />
              </div>
              <div className="space-y-2">
                <Label>Bairro</Label>
                <Input
                  value={form.district}
                  onChange={(e) => setForm((prev) => ({ ...prev, district: e.target.value }))}
                  placeholder="Bairro"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Complemento (opcional)</Label>
              <Input
                value={form.complement}
                onChange={(e) => setForm((prev) => ({ ...prev, complement: e.target.value }))}
                placeholder="Apto, sala, andar, etc."
              />
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

