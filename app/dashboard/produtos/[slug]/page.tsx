"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useParams } from "next/navigation"
import { Search, ArrowLeft, DollarSign, Calendar, User, Plus, Loader2, Pencil, CalendarDays, Trash2, AlertCircle } from "lucide-react"
import Link from "next/link"
import useSWR, { useSWRConfig } from "swr"
import type { Client, Contract, Product } from "@/lib/types"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"

const STATUS_MAP: Record<string, { label: string; class: string }> = {
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

const PAYMENT_MAP: Record<string, { label: string; class: string }> = {
  paid: { label: "Em dia", class: "text-emerald-400" },
  em_dia: { label: "Em dia", class: "text-emerald-400" },
  pending: { label: "Pendente", class: "text-amber-400" },
  pendente: { label: "Pendente", class: "text-amber-400" },
  overdue: { label: "Atrasado", class: "text-red-400" },
  atrasado: { label: "Atrasado", class: "text-red-400" },
  cancelado: { label: "Cancelado", class: "text-zinc-400" },
  cancelled: { label: "Cancelado", class: "text-zinc-400" },
  expirado: { label: "Expirado", class: "text-red-400" },
  expired: { label: "Expirado", class: "text-red-400" },
}

const addOneMonthSameDay = (dateStr: string) => {
  if (!dateStr) return ""
  const [y, m, d] = dateStr.split("-").map((v) => Number(v))
  if (!y || !m || !d) return ""
  const date = new Date(y, m - 1, d)
  date.setMonth(date.getMonth() + 1)
  const yy = date.getFullYear()
  const mm = String(date.getMonth() + 1).padStart(2, "0")
  const dd = String(date.getDate()).padStart(2, "0")
  return `${yy}-${mm}-${dd}`
}

const ORIGEM_CAPTACAO_OPCOES = [
  "Comercial - Lisete",
  "Website",
  "Comercial - Pamella",
  "Comercial - Roberto",
] as const

const STATUS_LEAD_OPCOES = [
  { id: "novo", label: "Novo" },
  { id: "contratando", label: "Contratando" },
  { id: "negociando", label: "Negociando" },
  { id: "ativo", label: "Ativo" },
  { id: "perdido", label: "Perdido" },
] as const

const getEtapaLead = (client: Client | null | undefined) => (client?.status_lead || "contratando") as string

export default function ProductDetailPage() {
  const params = useParams()
  const slug = params.slug as string
  const supabase = createClient()
  const { mutate: globalMutate } = useSWRConfig()
  const [search, setSearch] = useState("")
  const [filterStatus, setFilterStatus] = useState("all")
  const [filterMonth, setFilterMonth] = useState("")
  const [showNewContract, setShowNewContract] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [editingContract, setEditingContract] = useState<Contract | null>(null)
  const [editForm, setEditForm] = useState({
    // Cliente (igual Registrar assinatura)
    client_name: "",
    client_cpf_cnpj: "",
    client_email: "",
    client_phone: "",
    zip_code: "",
    address: "",
    number: "",
    district: "",
    city: "",
    state: "",
    origem_captacao: "",
    status_lead: "contratando",
    // Contrato
    plan: "confort",
    payment_day: 10,
    start_date: "",
    end_date: "",
    monthly_value: "",
    status: "ativa",
    payment_status: "em_dia",
    notes: "",
  })
  const [savingEdit, setSavingEdit] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
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
    origem_captacao: "",
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

  const { data: apiData, mutate: mutateApiContracts } = useSWR(
    slug ? `api-contracts-${slug}` : null,
    async () => {
      const res = await fetch(`/api/products/${slug}/contracts`)
      const data = await res.json()
      return data as { product: { id: string; name: string; description: string } | null; contracts: Contract[] }
    },
  )
  const contractsFromApi = apiData?.contracts ?? []
  const productFromApi = apiData?.product

  const { data: contractsFromClient, mutate: mutateContracts } = useSWR(product ? `contracts-${product.id}` : null, async () => {
    if (!product) return []
    const { data } = await supabase
      .from("contracts")
      .select("*, clients(*), products(*)")
      .eq("product_id", product.id)
      .order("created_at", { ascending: false })
    return (data || []) as Contract[]
  })

  const contracts = (contractsFromApi.length > 0 ? contractsFromApi : contractsFromClient) ?? []
  const productResolved = product || productFromApi

  const statusForFilter = (s: string) => (s === "ativa" ? "active" : s === "inativa" ? "inactive" : s === "aguardando_produto" ? "aguardando_produto" : s === "pendente" ? "suspended" : s === "cancelada" ? "cancelled" : s)
  const filtered = contracts?.filter((c) => {
    const matchesSearch =
      !search ||
      c.clients?.name?.toLowerCase().includes(search.toLowerCase()) ||
      c.clients?.cpf_cnpj?.includes(search) ||
      c.clients?.email?.toLowerCase().includes(search.toLowerCase())
    const matchesStatus =
      filterStatus === "all" ? true
      : filterStatus === "inactive" ? c.status !== "ativa" && c.status !== "aguardando_produto"
      : statusForFilter(c.status) === filterStatus || c.status === filterStatus
    const monthStr = c.start_date ? String(c.start_date).slice(0, 7) : ""
    const matchesMonth = !filterMonth || monthStr === filterMonth
    return matchesSearch && matchesStatus && matchesMonth
  })

  const monthOptions = (() => {
    const opts: { value: string; label: string }[] = []
    const start = new Date(2026, 2, 1)
    const now = new Date()
    const end = new Date(now.getFullYear(), now.getMonth(), 1)
    for (let d = new Date(start); d <= end; d.setMonth(d.getMonth() + 1)) {
      const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
      const label = d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })
      opts.push({ value, label: label.charAt(0).toUpperCase() + label.slice(1) })
    }
    return opts
  })()

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

  const handleEditCepBlur = async () => {
    const raw = (editForm.zip_code || "").replace(/\D/g, "")
    if (!raw) return
    try {
      const res = await fetch(`/api/geo/cep?value=${encodeURIComponent(raw)}`)
      const data = await res.json()
      if (!res.ok) return
      setEditForm((prev) => ({
        ...prev,
        zip_code: data.cep || prev.zip_code,
        city: data.city || prev.city,
        state: (data.state || prev.state || "").toUpperCase(),
        district: data.district || prev.district,
        address: data.street || prev.address,
      }))
    } catch {
      // ignora
    }
  }

  const handleEditGuessUF = async () => {
    if (!editForm.city || editForm.state) return
    try {
      const res = await fetch(`/api/geo/city-to-uf?name=${encodeURIComponent(editForm.city)}`)
      const data = await res.json()
      if (!res.ok || !data.uf) return
      setEditForm((prev) => ({ ...prev, state: String(data.uf).toUpperCase() }))
    } catch {
      // ignora
    }
  }

  const handleCreateContract = async () => {
    setFormError(null)
    if (!newContract.client_name?.trim()) {
      setFormError("Informe o nome do cliente.")
      return
    }
    const cpfCnpjRaw = (newContract.client_cpf_cnpj || "").replace(/\D/g, "")
    if (!cpfCnpjRaw || (cpfCnpjRaw.length !== 11 && cpfCnpjRaw.length !== 14)) {
      setFormError("Informe um CPF (11 dígitos) ou CNPJ (14 dígitos) válido.")
      return
    }
    const planValues: Record<string, number> = {
      basic: 500,
      confort: 800,
      premium: 1500,
    }

    const selectedValue = planValues[newContract.plan]
    if (!selectedValue) {
      setFormError("Selecione um plano para definir o valor mensal.")
      return
    }
    setSaving(true)
    setFormError(null)
    try {
      const res = await fetch("/api/contracts/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: product?.id || null,
          productSlug: slug,
          client_name: newContract.client_name.trim(),
          client_email: newContract.client_email || "",
          client_phone: newContract.client_phone || "",
          client_cpf_cnpj: newContract.client_cpf_cnpj || "",
          address: newContract.address || "",
          number: newContract.number || "",
          district: newContract.district || "",
          city: newContract.city || "",
          state: newContract.state || "",
          zip_code: newContract.zip_code || "",
          origem_captacao: newContract.origem_captacao || undefined,
          plan: newContract.plan,
          payment_day: newContract.payment_day,
          start_date: newContract.start_date,
          status: newContract.status,
          payment_status: newContract.payment_status,
        }),
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setFormError(data?.error || "Erro ao registrar. Tente novamente.")
        return
      }

      setShowNewContract(false)
      setFormError(null)
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
        origem_captacao: "",
        plan: "confort",
        payment_day: 10,
        start_date: new Date().toISOString().slice(0, 10),
        monthly_value: "",
        status: "active",
        payment_status: "paid",
      })
      await mutateContracts()
      if (data.productId) {
        await globalMutate(`contracts-${data.productId}`)
      }
      await mutateApiContracts()
      await globalMutate("clients-list")
      await globalMutate("contracts-by-client")
      if (data.existingClient && data.existingClientName) {
        toast.success(`Assinatura adicionada ao cliente existente "${data.existingClientName}". Para cadastrar outra pessoa, use outro CPF/CNPJ.`)
      } else {
        toast.success("Cliente cadastrado e assinatura registrada. Ele já aparece na lista de Clientes.")
      }
    } catch (err: any) {
      console.error("Erro inesperado ao registrar assinatura:", err)
      setFormError("Erro inesperado: " + (err?.message || String(err)))
    } finally {
      setSaving(false)
    }
  }

  const planValues: Record<string, number> = { basic: 500, confort: 800, premium: 1500 }
  const valueToPlan = (v: number) => (v === 1500 ? "premium" : v === 800 ? "confort" : "basic")

  const openEditContract = (contract: Contract) => {
    setEditingContract(contract)
    const c = contract.clients
    const monthly = Number(contract.monthly_value) || 800
    // Garante que endereço venha quebrado em campos separados quando possível
    let address = (c as any)?.address ?? ""
    let number = (c as any)?.number ?? ""
    let district = (c as any)?.district ?? ""
    let city = c?.city ?? ""
    let state = c?.state ?? ""
    let zip_code = c?.zip_code ?? ""
    if (address && !city && !state) {
      const parts = address
        .split(",")
        .map((p: string) => p.trim())
        .filter(Boolean)
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
    const startStr = contract.start_date ? String(contract.start_date).slice(0, 10) : ""
    const endStr = contract.end_date ? String(contract.end_date).slice(0, 10) : startStr ? addOneMonthSameDay(startStr) : ""

    setEditForm({
      client_name: c?.name ?? "",
      client_cpf_cnpj: c?.cpf_cnpj ?? "",
      client_email: c?.email ?? "",
      client_phone: c?.phone ?? "",
      zip_code,
      address,
      number,
      district,
      city,
      state,
      origem_captacao: c?.origem_captacao ?? "",
      status_lead: (c?.status_lead as string) || "contratando",
      plan: valueToPlan(monthly),
      payment_day: Number(contract.payment_day) || 10,
      start_date: startStr,
      end_date: endStr,
      monthly_value: String(contract.monthly_value ?? ""),
      status: contract.status || "ativa",
      payment_status: contract.payment_status || "em_dia",
      notes: contract.notes ?? "",
    })
  }

  const saveEditContract = async () => {
    if (!editingContract) return
    const s = String(editForm.monthly_value).replace(/\./g, "").replace(",", ".")
    const value = parseFloat(s) || planValues[editForm.plan] || Number(editingContract.monthly_value)
    const startDate = editForm.start_date?.trim() || editingContract.start_date?.toString().slice(0, 10) || new Date().toISOString().slice(0, 10)
    const endDate = editForm.end_date?.trim() || null
    const paymentDay = Math.min(31, Math.max(1, Number(editForm.payment_day) || 10))
    const addressParts = [editForm.address, editForm.number, editForm.district, editForm.city, editForm.state, editForm.zip_code].filter(Boolean)
    const fullAddress = addressParts.length ? addressParts.join(", ") : (editForm.address?.trim() || null)
    setSavingEdit(true)
    try {
      const cpfCnpjRaw = (editForm.client_cpf_cnpj || "").replace(/\D/g, "")
    const clientName = editForm.client_name?.trim() || editingContract.clients?.name || ""
    if (!clientName) {
      toast.error("Informe o nome do cliente.")
      setSavingEdit(false)
      return
    }
    await supabase
        .from("clients")
        .update({
          name: clientName,
          cpf_cnpj: cpfCnpjRaw || editingContract.clients?.cpf_cnpj || null,
          email: (editForm.client_email ?? "").trim() || null,
          phone: (editForm.client_phone ?? "").trim() || null,
          address: fullAddress,
          zip_code: editForm.zip_code?.trim() || null,
          number: editForm.number?.trim() || null,
          district: editForm.district?.trim() || null,
          city: editForm.city?.trim() || null,
          state: editForm.state?.trim() || null,
          origem_captacao: editForm.origem_captacao?.trim() || null,
          status_lead: editForm.payment_status === "cancelado" || editForm.payment_status === "expirado" || editForm.payment_status === "cancelled" || editForm.payment_status === "expired" ? "perdido" : editForm.status_lead,
        })
        .eq("id", editingContract.client_id)
      const { error } = await supabase
        .from("contracts")
        .update({
          status: editForm.status,
          payment_status: editForm.payment_status,
          monthly_value: value,
          start_date: startDate,
          end_date: endDate,
          payment_day: paymentDay,
          notes: editForm.notes?.trim() || null,
        })
        .eq("id", editingContract.id)
      if (error) throw error
      const pagamentoPerdido = editForm.payment_status === "cancelado" || editForm.payment_status === "expirado" || editForm.payment_status === "cancelled" || editForm.payment_status === "expired"
      if (pagamentoPerdido && editingContract.client_id) {
        await supabase.from("clients").update({ status_lead: "perdido" }).eq("id", editingContract.client_id)
      }
      // Sincroniza NF-e pendente vinculada a este contrato (valor e nome do cliente)
      const { data: nfePendentes } = await supabase
        .from("nfe_documents")
        .select("id")
        .eq("status", "pendente")
        .contains("provider_payload", { contract_id: editingContract.id })
      const clientNameNfe = editForm.client_name?.trim() || (editingContract.clients as { name?: string } | null)?.name || ""
      if (nfePendentes?.length) {
        const nfeUpdate: { total_value: number; client_name?: string } = { total_value: value }
        if (clientNameNfe) nfeUpdate.client_name = clientNameNfe
        for (const nfe of nfePendentes) {
          await supabase.from("nfe_documents").update(nfeUpdate).eq("id", nfe.id)
        }
      }
      toast.success("Contrato e cliente atualizados.")
      setEditingContract(null)
      await mutateContracts()
      await mutateApiContracts()
    } catch (err: any) {
      console.error("Erro ao atualizar contrato:", err)
      const msg = err?.message || (typeof err === "string" ? err : "Erro ao atualizar contrato.")
      toast.error(msg)
    } finally {
      setSavingEdit(false)
    }
  }

  const handleDeleteContract = async (contract: Contract) => {
    if (!confirm("Excluir este contrato? O cliente permanece cadastrado; apenas a assinatura será removida.")) return
    setDeletingId(contract.id)
    try {
      const { error } = await supabase.from("contracts").delete().eq("id", contract.id)
      if (error) throw error
      toast.success("Contrato excluído. O cliente continua na lista de Clientes.")
      await mutateContracts()
      await mutateApiContracts()
      await globalMutate("clients-list")
      await globalMutate("contracts-by-client")
    } catch (err: any) {
      console.error("Erro ao excluir contrato:", err)
      toast.error(err?.message || "Erro ao excluir contrato.")
    } finally {
      setDeletingId(null)
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
            {productResolved?.name || "Software de Gestão"}
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {productResolved?.description || "Apólice de Seguro - Modalidade Garantias"}
          </p>
        </div>
        <button
          onClick={() => { setShowNewContract(true); setFormError(null) }}
          className="ml-auto flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Registrar compra manual
        </button>
      </div>

      {/* Search + Filtro por mês */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar por nome, CPF/CNPJ ou email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-10 w-full rounded-lg border border-border bg-secondary pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-colors"
          />
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <CalendarDays className="h-4 w-4 text-muted-foreground" />
          <select
            value={filterMonth}
            onChange={(e) => setFilterMonth(e.target.value)}
            className="h-10 min-w-[180px] rounded-lg border border-border bg-secondary px-3 text-sm font-medium text-foreground focus:border-primary focus:outline-none"
            title="Filtrar por mês de início"
          >
            <option value="">Todos os meses</option>
            {monthOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Stats: total geral (lista abaixo é filtrada por mês) */}
      <p className="text-xs text-muted-foreground mb-1">Total geral</p>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
        {[
          { label: "Total", value: contracts?.length || 0, color: "text-foreground", filter: "all" as const },
          { label: "Aguardando produto", value: contracts?.filter(c => c.status === "aguardando_produto").length || 0, color: "text-amber-400", filter: "aguardando_produto" as const },
          { label: "Ativas", value: contracts?.filter(c => c.status === "ativa").length || 0, color: "text-emerald-400", filter: "active" as const },
          { label: "Inativas", value: contracts?.filter(c => c.status !== "ativa" && c.status !== "aguardando_produto").length || 0, color: "text-red-400", filter: "inactive" as const },
          { label: "Receita Mensal", value: (() => {
            const paymentOk = (c: Contract) => {
              const p = (c.payment_status ?? "").toString().toLowerCase()
              return p === "em_dia" || p === "paid"
            }
            const noMes = (c: Contract) => {
              if (!filterMonth) return true
              const start = c.start_date ? String(c.start_date).slice(0, 7) : ""
              if (!start) return false
              return start <= filterMonth
            }
            const total = contracts?.filter(c => paymentOk(c) && noMes(c)).reduce((s, c) => s + Number(c.monthly_value ?? 0), 0) ?? 0
            return `R$ ${total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`
          })(), color: "text-primary", filter: null },
        ].map((stat) => (
          <button
            key={stat.label}
            type="button"
            onClick={() => stat.filter != null && setFilterStatus(stat.filter)}
            className={cn(
              "glass rounded-xl p-4 text-left transition-all",
              stat.filter != null && "hover:ring-2 hover:ring-primary/50",
              stat.filter != null && filterStatus === stat.filter && "ring-2 ring-primary bg-primary/5"
            )}
          >
            <p className="text-xs text-muted-foreground">{stat.label}</p>
            <p className={cn("text-xl font-bold mt-1", stat.color)}>{stat.value}</p>
          </button>
        ))}
      </div>

      {/* Lista: filtrada por mês quando selecionado */}
      <p className="text-xs text-muted-foreground mb-1">{filterMonth ? "Lista do mês selecionado" : "Todos os contratos"}</p>
      <div className="glass rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-secondary/30">
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Cliente</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">CPF/CNPJ</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Origem</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Contato</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Pagamento</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Valor</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Inicio</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wide">Acoes</th>
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
                    <td className="px-4 py-3 text-xs text-muted-foreground">{contract.clients?.origem_captacao || "—"}</td>
                    <td className="px-4 py-3">
                      {(() => {
                        const etapa = getEtapaLead(contract.clients)
                        const t = STATUS_LEAD_OPCOES.find((x) => x.id === etapa)
                        const label = t ? t.label : etapa
                        const color = etapa === "novo" ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/30" : etapa === "contratando" ? "bg-amber-500/10 text-amber-400 border-amber-500/30" : etapa === "negociando" ? "bg-violet-500/10 text-violet-400 border-violet-500/30" : etapa === "ativo" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" : etapa === "perdido" ? "bg-red-500/10 text-red-400 border-red-500/30" : "bg-secondary text-muted-foreground border-border"
                        return <span className={cn("inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium", color)}>{label}</span>
                      })()}
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn("rounded-full border px-2.5 py-0.5 text-xs font-medium", STATUS_MAP[contract.status]?.class ?? "bg-secondary text-muted-foreground border-border")}>
                        {STATUS_MAP[contract.status]?.label ?? contract.status}
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
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => openEditContract(contract)}
                          className="rounded-lg p-2 text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors"
                          title="Editar contrato"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteContract(contract)}
                          disabled={deletingId === contract.id}
                          className="rounded-lg p-2 text-muted-foreground hover:bg-red-500/10 hover:text-red-400 transition-colors disabled:opacity-50"
                          title="Excluir contrato (o cliente permanece cadastrado)"
                        >
                          {deletingId === contract.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-sm text-muted-foreground">
                    {search ? "Nenhuma contratacao encontrada para esta busca." : "Nenhuma contratacao registrada para este produto."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {editingContract && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4 overflow-y-auto">
          <div className="w-full max-w-4xl rounded-2xl bg-background border border-border p-6 shadow-xl my-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-foreground">Editar contrato e cliente</h3>
                <p className="text-xs text-muted-foreground">Vincule um cliente a este produto com valor e data de início.</p>
              </div>
              <button type="button" onClick={() => setEditingContract(null)} className="rounded-full border border-border px-2 py-1 text-xs text-muted-foreground hover:bg-secondary">Fechar</button>
            </div>
            <div className="space-y-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Dados do cliente (NF-e)</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Nome completo</p>
                  <input className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:border-primary focus:outline-none" value={editForm.client_name} onChange={(e) => setEditForm((p) => ({ ...p, client_name: e.target.value }))} />
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">CPF/CNPJ</p>
                  <input className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:border-primary focus:outline-none font-mono" value={editForm.client_cpf_cnpj} onChange={(e) => setEditForm((p) => ({ ...p, client_cpf_cnpj: formatCpfCnpj(e.target.value) }))} placeholder="CPF ou CNPJ" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Email</p>
                  <input type="email" className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:border-primary focus:outline-none" value={editForm.client_email} onChange={(e) => setEditForm((p) => ({ ...p, client_email: e.target.value }))} />
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Telefone / Celular</p>
                  <input className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:border-primary focus:outline-none" value={editForm.client_phone} onChange={(e) => setEditForm((p) => ({ ...p, client_phone: formatPhone(e.target.value) }))} />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">CEP</p>
                  <input className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:border-primary focus:outline-none" value={editForm.zip_code} onChange={(e) => setEditForm((p) => ({ ...p, zip_code: e.target.value }))} onBlur={handleEditCepBlur} />
                </div>
                <div className="col-span-2">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Endereço (rua)</p>
                  <input className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:border-primary focus:outline-none" value={editForm.address} onChange={(e) => setEditForm((p) => ({ ...p, address: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Número</p>
                  <input className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:border-primary focus:outline-none" value={editForm.number} onChange={(e) => setEditForm((p) => ({ ...p, number: e.target.value }))} />
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Bairro</p>
                  <input className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:border-primary focus:outline-none" value={editForm.district} onChange={(e) => setEditForm((p) => ({ ...p, district: e.target.value }))} />
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Cidade / UF</p>
                  <div className="flex gap-2">
                    <input className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:border-primary focus:outline-none" placeholder="Cidade" value={editForm.city} onChange={(e) => setEditForm((p) => ({ ...p, city: e.target.value }))} onBlur={handleEditGuessUF} />
                    <input className="w-20 h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:border-primary focus:outline-none" placeholder="UF" value={editForm.state} onChange={(e) => setEditForm((p) => ({ ...p, state: e.target.value.toUpperCase() }))} />
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Plano contratado</p>
                  <select className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:border-primary focus:outline-none" value={editForm.plan} onChange={(e) => { const planId = e.target.value; const val = planValues[planId] || 0; setEditForm((p) => ({ ...p, plan: planId, monthly_value: val ? String(val) : p.monthly_value })) }}>
                    <option value="basic">Básico+ — R$ 500,00/mês</option>
                    <option value="confort">Confort+ — R$ 800,00/mês</option>
                    <option value="premium">Premium++ — R$ 1.500,00/mês</option>
                  </select>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Dia de pagamento</p>
                  <input type="number" min={1} max={31} className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:border-primary focus:outline-none" value={editForm.payment_day} onChange={(e) => setEditForm((p) => ({ ...p, payment_day: e.target.value === "" ? 10 : Number(e.target.value) }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Início do contrato</p>
                  <input
                    type="date"
                    className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:border-primary focus:outline-none"
                    value={editForm.start_date}
                    onChange={(e) => {
                      const value = e.target.value
                      setEditForm((p) => ({
                        ...p,
                        start_date: value,
                        end_date: value ? addOneMonthSameDay(value) : p.end_date,
                      }))
                    }}
                  />
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Data de término (opcional)</p>
                  <input type="date" className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:border-primary focus:outline-none" value={editForm.end_date} onChange={(e) => setEditForm((p) => ({ ...p, end_date: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Status</p>
                  <select className="w-full h-9 rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:border-primary focus:outline-none" value={editForm.status} onChange={(e) => setEditForm((p) => ({ ...p, status: e.target.value }))}>
                    <option value="aguardando_produto">Aguardando produto</option>
                    <option value="ativa">Ativa</option>
                    <option value="inativa">Inativa</option>
                    <option value="pendente">Suspensa</option>
                    <option value="cancelada">Cancelada</option>
                  </select>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Situação do pagamento</p>
                  <select className="w-full h-9 rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:border-primary focus:outline-none" value={editForm.payment_status} onChange={(e) => setEditForm((p) => ({ ...p, payment_status: e.target.value }))}>
                    <option value="em_dia">Em dia</option>
                    <option value="pendente">Pendente</option>
                    <option value="atrasado">Atrasado</option>
                    <option value="cancelado">Cancelado</option>
                    <option value="expirado">Expirado</option>
                  </select>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Origem de captação</p>
                  <select className="w-full h-9 rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:border-primary focus:outline-none" value={editForm.origem_captacao} onChange={(e) => setEditForm((p) => ({ ...p, origem_captacao: e.target.value }))}>
                    <option value="">—</option>
                    {ORIGEM_CAPTACAO_OPCOES.map((opt) => (<option key={opt} value={opt}>{opt}</option>))}
                  </select>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Contato</p>
                  <select className="w-full h-9 rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:border-primary focus:outline-none" value={editForm.status_lead} onChange={(e) => setEditForm((p) => ({ ...p, status_lead: e.target.value }))}>
                    {STATUS_LEAD_OPCOES.map((opt) => (<option key={opt.id} value={opt.id}>{opt.label}</option>))}
                  </select>
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Observações</p>
                <textarea rows={2} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none resize-none" value={editForm.notes} onChange={(e) => setEditForm((p) => ({ ...p, notes: e.target.value }))} placeholder="Notas do contrato" />
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={saveEditContract} disabled={savingEdit} className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60">
                  {savingEdit ? <Loader2 className="h-4 w-4 animate-spin" /> : <Pencil className="h-4 w-4" />}
                  Salvar
                </button>
                <button type="button" onClick={() => setEditingContract(null)} className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-secondary">Cancelar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showNewContract && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60">
          <div className="w-full max-w-4xl rounded-2xl bg-background border border-border p-6 shadow-xl">
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
              {formError && (
                <div className="rounded-lg bg-red-500/10 border border-red-500/30 px-3 py-2 text-sm text-red-400">
                  {formError}
                </div>
              )}
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
                  <p className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1.5">
                    CPF/CNPJ
                    <span
                      className="inline-flex text-amber-400 cursor-help"
                      title="Um CPF/CNPJ = uma pessoa. Mesmo CPF vincula ao mesmo cliente (uma pessoa pode ter várias assinaturas)."
                    >
                      <AlertCircle className="h-3.5 w-3.5" />
                    </span>
                  </p>
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
                  <option value="cancelled">Cancelado</option>
                  <option value="expired">Expirado</option>
                </select>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Origem de captação</p>
                <select
                  className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:border-primary focus:outline-none"
                  value={newContract.origem_captacao}
                  onChange={(e) =>
                    setNewContract((prev) => ({ ...prev, origem_captacao: e.target.value }))
                  }
                >
                  <option value="">—</option>
                  {ORIGEM_CAPTACAO_OPCOES.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
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
