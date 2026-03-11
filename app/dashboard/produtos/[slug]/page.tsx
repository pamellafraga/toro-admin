"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useParams } from "next/navigation"
import { Search, ArrowLeft, DollarSign, Calendar, User, Plus, Loader2 } from "lucide-react"
import Link from "next/link"
import useSWR from "swr"
import type { Client, Contract, Product } from "@/lib/types"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"

const STATUS_MAP: Record<string, { label: string; class: string }> = {
  active: { label: "Ativa", class: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" },
  ativa: { label: "Ativa", class: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" },
  inactive: { label: "Inativa", class: "bg-gray-500/10 text-gray-400 border-gray-500/30" },
  inativa: { label: "Inativa", class: "bg-gray-500/10 text-gray-400 border-gray-500/30" },
  suspended: { label: "Suspensa", class: "bg-amber-500/10 text-amber-400 border-amber-500/30" },
  pendente: { label: "Pendente", class: "bg-amber-500/10 text-amber-400 border-amber-500/30" },
  cancelled: { label: "Cancelada", class: "bg-red-500/10 text-red-400 border-red-500/30" },
  cancelada: { label: "Cancelada", class: "bg-red-500/10 text-red-400 border-red-500/30" },
}

const PAYMENT_MAP: Record<string, { label: string; class: string }> = {
  paid: { label: "Em dia", class: "text-emerald-400" },
  em_dia: { label: "Em dia", class: "text-emerald-400" },
  pending: { label: "Pendente", class: "text-amber-400" },
  pendente: { label: "Pendente", class: "text-amber-400" },
  overdue: { label: "Atrasado", class: "text-red-400" },
  atrasado: { label: "Atrasado", class: "text-red-400" },
  cancelado: { label: "Cancelado", class: "text-zinc-400" },
  cancelled: { label: "Cancelado", class: "text-zinc-400" },
}

export default function ProductDetailPage() {
  const params = useParams()
  const slug = params.slug as string
  const supabase = createClient()
  const [search, setSearch] = useState("")
  const [filterStatus, setFilterStatus] = useState("all")
  const [showNewContract, setShowNewContract] = useState(false)
  const [saving, setSaving] = useState(false)
  const [newContract, setNewContract] = useState({
    // dados do cliente
    client_name: "",
    client_email: "",
    client_phone: "",
    client_cpf_cnpj: "",
    zip_code: "",
    address: "",
    number: "",
    district: "",
    city: "",
    state: "",
    plan: "confort",
    // dados do contrato
    payment_day: 10,
    start_date: new Date().toISOString().slice(0, 10),
    monthly_value: "",
    status: "active",
    payment_status: "paid",
  })

  const { data: product } = useSWR(`product-${slug}`, async () => {
    // Tenta buscar o produto pelo slug; se não existir, cria automaticamente
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("slug", slug)
      .maybeSingle()

    if (error) {
      console.error("Erro ao carregar produto:", error)
    }

    if (data) {
      return data as Product
    }

    const { data: created, error: createError } = await supabase
      .from("products")
      .insert({
        name: "Software de Gestão",
        slug,
        description: "Apólice de Seguro - Modalidade Garantias",
        icon: "monitor",
        monthly_price: 800,
        is_active: true,
      })
      .select()
      .single()

    if (createError) {
      console.error("Erro ao criar produto padrão:", createError)
      return null
    }

    return created as Product
  })

  const { data: contracts } = useSWR(product ? `contracts-${product.id}` : null, async () => {
    if (!product) return []
    const { data } = await supabase
      .from("contracts")
      .select("*, clients(*), products(*)")
      .eq("product_id", product.id)
      .order("created_at", { ascending: false })
    return (data || []) as Contract[]
  })

  const filtered = contracts?.filter((c) => {
    const matchesSearch =
      !search ||
      c.clients?.name?.toLowerCase().includes(search.toLowerCase()) ||
      c.clients?.cpf_cnpj?.includes(search) ||
      c.clients?.email?.toLowerCase().includes(search.toLowerCase())
    const matchesStatus = filterStatus === "all" || c.status === filterStatus
    return matchesSearch && matchesStatus
  })

  const formatCpfCnpj = (value: string) => {
    const digits = value.replace(/\D/g, "")
    if (digits.length <= 11) {
      return digits
        .replace(/(\d{3})(\d)/, "$1.$2")
        .replace(/(\d{3})(\d)/, "$1.$2")
        .replace(/(\d{3})(\d{1,2})$/, "$1-$2")
    }
    return digits
      .replace(/^(\d{2})(\d)/, "$1.$2")
      .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
      .replace(/\.(\d{3})(\d)/, ".$1/$2")
      .replace(/(\d{4})(\d{1,2})$/, "$1-$2")
  }

  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, "")
    if (digits.length <= 10) {
      return digits
        .replace(/(\d{2})(\d)/, "($1) $2")
        .replace(/(\d{4})(\d)/, "$1-$2")
    }
    return digits
      .replace(/(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{5})(\d)/, "$1-$2")
  }

  const handleCepBlur = async () => {
    const raw = newContract.zip_code.replace(/\D/g, "")
    if (!raw) return
    try {
      const res = await fetch(`/api/geo/cep?value=${encodeURIComponent(raw)}`)
      const data = await res.json()
      if (!res.ok) return
      setNewContract((prev) => ({
        ...prev,
        zip_code: data.cep || prev.zip_code,
        city: data.city || prev.city,
        state: (data.state || prev.state || "").toUpperCase(),
        district: data.district || prev.district,
        address: data.street || prev.address,
      }))
    } catch {
      // ignora erros de rede
    }
  }

  const handleGuessUF = async () => {
    if (!newContract.city || newContract.state) return
    try {
      const res = await fetch(`/api/geo/city-to-uf?name=${encodeURIComponent(newContract.city)}`)
      const data = await res.json()
      if (!res.ok || !data.uf) return
      setNewContract((prev) => ({ ...prev, state: String(data.uf).toUpperCase() }))
    } catch {
      // ignora
    }
  }

  const handleCreateContract = async () => {
    if (!product) return
    if (!newContract.client_name) {
      alert("Informe o nome do cliente.")
      return
    }
    const planValues: Record<string, number> = {
      basic: 500,
      confort: 800,
      premium: 1500,
    }

    const selectedValue = planValues[newContract.plan]
    if (!selectedValue) {
      alert("Selecione um plano para definir o valor mensal.")
      return
    }
    setSaving(true)
    try {
      // 1) criar cliente com dados completos
      const clientPayload: Partial<Client> = {
        name: newContract.client_name,
        email: newContract.client_email || null,
        phone: newContract.client_phone || null,
        cpf_cnpj: newContract.client_cpf_cnpj || null,
        address: newContract.address || null,
        number: newContract.number || null,
        district: newContract.district || null,
        city: newContract.city || null,
        state: newContract.state || null,
        zip_code: newContract.zip_code || null,
        notes: null,
      }

      const { data: createdClient, error: clientError } = await supabase
        .from("clients")
        .insert(clientPayload)
        .select()
        .single()

      if (clientError || !createdClient) {
        console.error(clientError)
        alert("Erro ao salvar dados do cliente.")
        return
      }

      // 2) criar contrato vinculado ao cliente
      const payload = {
        client_id: createdClient.id,
        product_id: product.id,
        status: newContract.status,
        payment_status: newContract.payment_status,
        payment_day: newContract.payment_day,
        start_date: newContract.start_date,
        monthly_value: selectedValue,
        notes: null,
      }
      const { data: createdContracts, error } = await supabase
        .from("contracts")
        .insert(payload)
        .select()
      if (error || !createdContracts || createdContracts.length === 0) {
        console.error(error)
        alert("Erro ao registrar assinatura: " + (error?.message || "tente novamente."))
        return
      }

      const contract = createdContracts[0] as Contract

      // Criar automaticamente uma NF-e pendente para este contrato,
      // para que o time administrativo possa emitir manualmente depois.
      const nfePayload = {
        client_id: contract.client_id,
        client_name: newContract.client_name,
        total_value: selectedValue,
        nature_operation: "Prestação de serviços de software (SaaS)",
        cfop: "5933", // ajustar conforme orientação do contador
        status: "pendente",
        number: null,
        series: null,
        provider_id: null,
        provider_payload: {
          contract_id: contract.id,
          product_id: contract.product_id,
          payment_day: contract.payment_day,
        },
        provider_response: null,
      }

      const { error: nfeError } = await supabase.from("nfe_documents").insert(nfePayload)
      if (nfeError) {
        console.error("Erro ao criar NF-e pendente:", nfeError)
        // não bloqueia o fluxo da assinatura; fica só registrado no log
      }
      setShowNewContract(false)
      setNewContract({
        client_name: "",
        client_email: "",
        client_phone: "",
        client_cpf_cnpj: "",
        zip_code: "",
        address: "",
        number: "",
        district: "",
        city: "",
        state: "",
        plan: "confort",
        payment_day: 10,
        start_date: new Date().toISOString().slice(0, 10),
        monthly_value: "",
        status: "active",
        payment_status: "paid",
      })
      // SWR vai recarregar na próxima renderização
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/produtos" className="flex h-9 w-9 items-center justify-center rounded-lg border border-border hover:bg-secondary transition-colors">
          <ArrowLeft className="h-4 w-4 text-muted-foreground" />
        </Link>
        <div>
          <h2 className="text-2xl font-bold text-foreground">
            {product?.name || "Software de Gestão"}
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {product?.description || "Apólice de Seguro - Modalidade Garantias"}
          </p>
        </div>
        <button
          onClick={() => setShowNewContract(true)}
          className="ml-auto flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Registrar compra manual
        </button>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar por nome, CPF/CNPJ ou email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-10 w-full rounded-lg border border-border bg-secondary pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-colors"
          />
        </div>
        <div className="flex gap-2">
          {["all", "active", "inactive", "suspended", "cancelled"].map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={cn(
                "rounded-lg px-3 py-2 text-xs font-medium border transition-colors",
                filterStatus === status
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:border-primary/30"
              )}
            >
              {status === "all" ? "Todas" : STATUS_MAP[status]?.label || status}
            </button>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: "Total", value: contracts?.length || 0, color: "text-foreground" },
          { label: "Ativas", value: contracts?.filter(c => c.status === "active").length || 0, color: "text-emerald-400" },
          { label: "Inativas", value: contracts?.filter(c => c.status !== "active").length || 0, color: "text-red-400" },
          { label: "Receita Mensal", value: `R$ ${(contracts?.filter(c => c.status === "active").reduce((s, c) => s + Number(c.monthly_value), 0) || 0).toLocaleString("pt-BR")}`, color: "text-primary" },
        ].map((stat) => (
          <div key={stat.label} className="glass rounded-xl p-4">
            <p className="text-xs text-muted-foreground">{stat.label}</p>
            <p className={cn("text-xl font-bold mt-1", stat.color)}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Contracts Table */}
      <div className="glass rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-secondary/30">
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Cliente</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">CPF/CNPJ</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Pagamento</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Valor</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Inicio</th>
              </tr>
            </thead>
            <tbody>
              {filtered && filtered.length > 0 ? (
                filtered.map((contract) => (
                  <tr key={contract.id} className="border-b border-border/50 hover:bg-secondary/20 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                          <User className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">{contract.clients?.name || "---"}</p>
                          <p className="text-xs text-muted-foreground">{contract.clients?.email || ""}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground font-mono">{contract.clients?.cpf_cnpj || "---"}</td>
                    <td className="px-4 py-3">
                      <span className={cn("rounded-full border px-2.5 py-0.5 text-xs font-medium", STATUS_MAP[contract.status]?.class)}>
                        {STATUS_MAP[contract.status]?.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <DollarSign className={cn("h-3.5 w-3.5", PAYMENT_MAP[contract.payment_status]?.class)} />
                        <span className={cn("text-sm font-medium", PAYMENT_MAP[contract.payment_status]?.class)}>
                          {PAYMENT_MAP[contract.payment_status]?.label}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-foreground">
                      R$ {Number(contract.monthly_value).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5" />
                        {contract.start_date ? format(new Date(contract.start_date), "dd/MM/yyyy", { locale: ptBR }) : "---"}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-sm text-muted-foreground">
                    {search ? "Nenhuma contratacao encontrada para esta busca." : "Nenhuma contratacao registrada para este produto."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showNewContract && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60">
          <div className="w-full max-w-2xl rounded-2xl bg-background border border-border p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-foreground">Registrar nova assinatura</h3>
                <p className="text-xs text-muted-foreground">
                  Vincule um cliente a este produto com valor e data de início.
                </p>
              </div>
              <button
                onClick={() => setShowNewContract(false)}
                className="rounded-full border border-border px-2 py-1 text-xs text-muted-foreground hover:bg-secondary"
              >
                Fechar
              </button>
            </div>
            <div className="space-y-4">
              <div className="space-y-1">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Dados do cliente (NF-e)
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Nome completo</p>
                  <input
                    className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:border-primary focus:outline-none"
                    value={newContract.client_name}
                    onChange={(e) =>
                      setNewContract((prev) => ({ ...prev, client_name: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">CPF/CNPJ</p>
                  <input
                    className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:border-primary focus:outline-none"
                    value={newContract.client_cpf_cnpj}
                    onChange={(e) =>
                      setNewContract((prev) => ({
                        ...prev,
                        client_cpf_cnpj: formatCpfCnpj(e.target.value),
                      }))
                    }
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Email</p>
                  <input
                    type="email"
                    className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:border-primary focus:outline-none"
                    value={newContract.client_email}
                    onChange={(e) =>
                      setNewContract((prev) => ({ ...prev, client_email: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Telefone / Celular</p>
                  <input
                    className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:border-primary focus:outline-none"
                    value={newContract.client_phone}
                    onChange={(e) =>
                      setNewContract((prev) => ({
                        ...prev,
                        client_phone: formatPhone(e.target.value),
                      }))
                    }
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">CEP</p>
                  <input
                    className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:border-primary focus:outline-none"
                    value={newContract.zip_code}
                    onChange={(e) =>
                      setNewContract((prev) => ({ ...prev, zip_code: e.target.value }))
                    }
                    onBlur={handleCepBlur}
                  />
                </div>
                <div className="col-span-2">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Endereço (rua)</p>
                  <input
                    className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:border-primary focus:outline-none"
                    value={newContract.address}
                    onChange={(e) =>
                      setNewContract((prev) => ({ ...prev, address: e.target.value }))
                    }
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Número</p>
                  <input
                    className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:border-primary focus:outline-none"
                    value={newContract.number}
                    onChange={(e) =>
                      setNewContract((prev) => ({ ...prev, number: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Bairro</p>
                  <input
                    className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:border-primary focus:outline-none"
                    value={newContract.district}
                    onChange={(e) =>
                      setNewContract((prev) => ({ ...prev, district: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Cidade / UF</p>
                  <div className="flex gap-2">
                    <input
                      className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:border-primary focus:outline-none"
                      placeholder="Cidade"
                      value={newContract.city}
                      onChange={(e) =>
                        setNewContract((prev) => ({ ...prev, city: e.target.value }))
                      }
                      onBlur={handleGuessUF}
                    />
                    <input
                      className="w-20 h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:border-primary focus:outline-none"
                      placeholder="UF"
                      value={newContract.state}
                      onChange={(e) =>
                        setNewContract((prev) => ({
                          ...prev,
                          state: e.target.value.toUpperCase(),
                        }))
                      }
                    />
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Plano contratado</p>
                  <select
                    className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:border-primary focus:outline-none"
                    value={newContract.plan}
                    onChange={(e) => {
                      const planId = e.target.value
                      const planValues: Record<string, number> = {
                        basic: 500,
                        confort: 800,
                        premium: 1500,
                      }
                      const value = planValues[planId] || 0
                      setNewContract((prev) => ({
                        ...prev,
                        plan: planId,
                        monthly_value: value ? String(value) : "",
                      }))
                    }}
                  >
                    <option value="basic">Básico+ — R$ 500,00/mês</option>
                    <option value="confort">Confort+ — R$ 800,00/mês</option>
                    <option value="premium">Premium++ — R$ 1.500,00/mês</option>
                  </select>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Dia de pagamento</p>
                  <input
                    type="number"
                    min={1}
                    max={31}
                    className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:border-primary focus:outline-none"
                    value={newContract.payment_day}
                    onChange={(e) =>
                      setNewContract((prev) => ({
                        ...prev,
                        payment_day: Number(e.target.value) || 1,
                      }))
                    }
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Início do contrato</p>
                  <input
                    type="date"
                    className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:border-primary focus:outline-none"
                    value={newContract.start_date}
                    onChange={(e) =>
                      setNewContract((prev) => ({ ...prev, start_date: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Status</p>
                  <select
                    className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:border-primary focus:outline-none"
                    value={newContract.status}
                    onChange={(e) =>
                      setNewContract((prev) => ({ ...prev, status: e.target.value }))
                    }
                  >
                    <option value="active">Ativa</option>
                    <option value="inactive">Inativa</option>
                    <option value="suspended">Suspensa</option>
                    <option value="cancelled">Cancelada</option>
                  </select>
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Situação do pagamento</p>
                <select
                  className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:border-primary focus:outline-none"
                  value={newContract.payment_status}
                  onChange={(e) =>
                    setNewContract((prev) => ({ ...prev, payment_status: e.target.value }))
                  }
                >
                  <option value="paid">Em dia</option>
                  <option value="pending">Pendente</option>
                  <option value="overdue">Atrasado</option>
                </select>
              </div>
              <button
                onClick={handleCreateContract}
                disabled={saving}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4" />
                    Registrar assinatura
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
