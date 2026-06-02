"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { useParams } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { Search, ArrowLeft, DollarSign, Calendar, User, Plus, Loader2, Pencil, CalendarDays, Trash2, AlertCircle, CheckCircle, XCircle, Clock, PauseCircle, LayoutGrid, List } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import Link from "next/link"
import useSWR, { useSWRConfig } from "swr"
import type { Client, Contract, Product } from "@/lib/types"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { getProductBySlug } from "@/lib/products/catalog"
import { LiticaProRegisterModal } from "@/components/dashboard/liticapro-register-modal"
import { LiticaProDeveloperCredentialsBlock } from "@/components/dashboard/liticapro-developer-credentials-block"
import { LiticaProCnaeAndRamoSection } from "@/components/dashboard/liticapro-cnae-section"
import { LiticaProContractDetailView } from "@/components/dashboard/liticapro-contract-detail-view"
import { STATUS_LEAD_OPTIONS, STATUS_LEAD_COLOR_MAP, normalizeStatusLead, getStatusLeadLabel } from "@/lib/clients/status-lead"
import { LiticaProStatesSelector } from "@/components/dashboard/liticapro-states-selector"
import { ClickableStatusBadge } from "@/components/dashboard/clickable-status-badge"
import { ORIGEM_CAPTACAO_OPCOES, origemCaptacaoForComercial } from "@/lib/constants/origem-captacao"
import { formatCpfCnpj, formatPhone } from "@/lib/format/br"
import type { CnpjGovData } from "@/lib/liticapro/types"
import { buildDashboardMonthOptions, resolveTrialEndsAt } from "@/lib/liticapro/trial"

function formatContractDate(value: string | null | undefined): string {
  if (!value) return "—"
  try {
    return format(new Date(value), "dd/MM/yyyy", { locale: ptBR })
  } catch {
    return "—"
  }
}

function displayCpfCnpj(value: string | null | undefined): string {
  if (!value) return "---"
  const raw = String(value)
  if (raw.startsWith("import-") || raw.startsWith("sem-cpf-")) return raw
  const digits = raw.replace(/\D/g, "")
  if (!digits) return "---"
  return formatCpfCnpj(digits)
}

/** Agrupa status do contrato nos 4 buckets de produto exibidos no dashboard. */
type ProductStatusBucket = "aguardando_produto" | "contratado" | "trial" | "inativo"

function getProductStatusBucket(status: string | null | undefined): ProductStatusBucket {
  const t = (status ?? "").toLowerCase().trim()
  if (t === "trial") return "trial"
  if (t === "aguardando_produto") return "aguardando_produto"
  if (t === "ativa" || t === "active") return "contratado"
  return "inativo"
}

/** Produto (contratação): ícone na exibição (estilo foto 3); texto só em cadastro/edição */
function normalizeProductStatus(s: string | null): string {
  if (!s) return ""
  const t = (s || "").toLowerCase().trim()
  if (t === "trial") return "trial"
  if (t === "active" || t === "ativa") return "ativa"
  if (t === "inactive" || t === "inativa") return "inativa"
  if (t === "cancelled" || t === "cancelada") return "cancelada"
  if (t === "suspended" || t === "pendente") return "pendente"
  return t || s
}
const STATUS_MAP: Record<string, { label: string; Icon: LucideIcon; class: string }> = {
  active: { label: "Produto contratado", Icon: CheckCircle, class: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" },
  ativa: { label: "Produto contratado", Icon: CheckCircle, class: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" },
  contratado: { label: "Produto contratado", Icon: CheckCircle, class: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" },
  trial: { label: "Teste grátis", Icon: Clock, class: "bg-sky-500/10 text-sky-400 border-sky-500/30" },
  aguardando_produto: { label: "Aguardando produto", Icon: Clock, class: "bg-amber-500/10 text-amber-400 border-amber-500/30" },
  inactive: { label: "Produto inativo", Icon: PauseCircle, class: "bg-gray-500/10 text-gray-400 border-gray-500/30" },
  inativa: { label: "Produto inativo", Icon: PauseCircle, class: "bg-gray-500/10 text-gray-400 border-gray-500/30" },
  inativo: { label: "Produto inativo", Icon: PauseCircle, class: "bg-gray-500/10 text-gray-400 border-gray-500/30" },
  suspended: { label: "Produto vencido", Icon: AlertCircle, class: "bg-amber-500/10 text-amber-400 border-amber-500/30" },
  pendente: { label: "Produto vencido", Icon: AlertCircle, class: "bg-amber-500/10 text-amber-400 border-amber-500/30" },
  cancelled: { label: "Produto cancelado", Icon: XCircle, class: "bg-red-500/10 text-red-400 border-red-500/30" },
  cancelada: { label: "Produto cancelado", Icon: XCircle, class: "bg-red-500/10 text-red-400 border-red-500/30" },
}

const PAYMENT_MAP: Record<string, { label: string; class: string }> = {
  paid: { label: "Em dia", class: "text-emerald-400" },
  trial: { label: "Teste grátis (7 dias)", class: "text-sky-400" },
  trial_expirado: { label: "Teste expirado — contatar", class: "text-red-400" },
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

const PRODUCT_KANBAN_COLUMNS = [
  { id: "aguardando_produto", label: "Aguardando produto", class: "bg-amber-500/15 text-amber-400 border-amber-500/30", Icon: Clock },
  { id: "trial", label: "Teste grátis", class: "bg-sky-500/15 text-sky-400 border-sky-500/30", Icon: Clock },
  { id: "ativa", label: "Produto contratado", class: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30", Icon: CheckCircle },
  { id: "inativa", label: "Produto inativo", class: "bg-zinc-500/15 text-zinc-400 border-zinc-500/30", Icon: PauseCircle },
] as const

const PAYMENT_KANBAN_COLUMNS = [
  { id: "em_dia", label: "Em dia", class: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
  { id: "pendente", label: "Pendente", class: "bg-amber-500/15 text-amber-400 border-amber-500/30" },
  { id: "expirado", label: "Expirado", class: "bg-red-600/15 text-red-500 border-red-600/30" },
  { id: "cancelado", label: "Cancelado", class: "bg-zinc-500/15 text-zinc-400 border-zinc-500/30" },
] as const

function normalizePaymentForKanban(payment_status: string | null | undefined): string {
  const p = (payment_status ?? "").toString().toLowerCase().trim()
  if (p === "em_dia" || p === "paid") return "em_dia"
  if (p === "pendente" || p === "pending") return "pendente"
  if (p === "atrasado" || p === "overdue") return "expirado"
  if (p === "expirado" || p === "expired") return "expirado"
  if (p === "cancelado" || p === "cancelled") return "cancelado"
  return "pendente"
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

const STATUS_COMERCIAL_OPCOES = STATUS_LEAD_OPTIONS

const PRODUCT_STATUS_OPCOES = [
  { id: "aguardando_produto", label: "Aguardando produto" },
  { id: "ativa", label: "Produto contratado" },
  { id: "trial", label: "Teste grátis" },
  { id: "inativa", label: "Produto inativo" },
] as const

const ETAPA_LEAD_COLOR_MAP = STATUS_LEAD_COLOR_MAP

const getEtapaLead = (client: Client | null | undefined) =>
  normalizeStatusLead(client?.status_lead as string | null)
const getEtapaLeadLabel = (client: Client | null | undefined) =>
  getStatusLeadLabel(getEtapaLead(client))

/** Subtítulo na coluna Cliente: empresa LiticaPro → responsável; demais → e-mail */
const getClientListSubtitle = (client: Client | null | undefined, liticaproProduct: boolean) => {
  if (!client) return ""
  if (liticaproProduct) {
    const lp = (client as Client & { liticapro_data?: { customer_type?: string; responsible_name?: string } }).liticapro_data
    const isEmpresa = lp?.customer_type !== "profissional_liberal"
    const responsible = String(lp?.responsible_name ?? "").trim()
    if (isEmpresa && responsible) return responsible
  }
  return client.email || ""
}

export default function ProductDetailPage() {
  const params = useParams()
  const slug = params.slug as string
  const catalogProduct = getProductBySlug(slug)
  const isLiticaPro = catalogProduct?.slug === "liticapro"
  const supabase = createClient()
  const { mutate: globalMutate } = useSWRConfig()
  const { isComercial, comercialDisplayName, isAdmin } = useAuth()
  const [search, setSearch] = useState("")
  const [filterStatus, setFilterStatus] = useState("all")
  const [filterMonth, setFilterMonth] = useState("")
  const [filterOrigin, setFilterOrigin] = useState("")
  const [view, setView] = useState<"list" | "kanban">("list")
  const [showNewContract, setShowNewContract] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [editingContract, setEditingContract] = useState<Contract | null>(null)
  const [viewOnly, setViewOnly] = useState(false)
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
    status_lead: "tentando_contato",
    // Contrato
    plan: "confort",
    payment_day: 10,
    start_date: "",
    end_date: "",
    monthly_value: "",
    status: "ativa",
    payment_status: "em_dia",
    notes: "",
    dev_empresa: "",
    dev_usuario: "",
    dev_senha: "",
    customer_type: "empresa" as "empresa" | "profissional_liberal",
    business_segment: "",
    states_of_interest: [] as string[],
    responsible_name: "",
  })
  const [editCompanyGov, setEditCompanyGov] = useState<CnpjGovData | null>(null)
  const [loadingEditCnpj, setLoadingEditCnpj] = useState(false)
  const [savingEdit, setSavingEdit] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [statusUpdatingId, setStatusUpdatingId] = useState<string | null>(null)
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

  useEffect(() => {
    if (showNewContract && isComercial && comercialDisplayName) {
      setNewContract((prev) => ({ ...prev, origem_captacao: origemCaptacaoForComercial(comercialDisplayName) }))
    }
  }, [showNewContract, isComercial, comercialDisplayName])

  useEffect(() => {
    if (isLiticaPro) {
      fetch("/api/liticapro/check-trials", { credentials: "include" }).catch(() => {})
    }
  }, [isLiticaPro])

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

    const catalog = getProductBySlug(slug)
    if (data) {
      return data as Product
    }

    if (!catalog) return null

    const { data: created, error: createError } = await supabase
      .from("products")
      .insert({
        name: catalog.name,
        slug: catalog.slug,
        description: catalog.description,
        icon: catalog.icon,
        monthly_price: catalog.slug === "segura" ? 800 : 0,
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
      const res = await fetch(`/api/products/${slug}/contracts`, { credentials: "include" })
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

  const getContractMonthKey = (c: Contract) =>
    isLiticaPro
      ? (c.created_at ? String(c.created_at).slice(0, 7) : "")
      : (c.start_date ? String(c.start_date).slice(0, 7) : "")

  // Comercial: só vê mês atual (todos) + meses anteriores (apenas aguardando produto). Sem filtro por mês.
  const currentMonthStr = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`
  const contractsVisible = isComercial
    ? contracts.filter((c) => {
        const monthStr = getContractMonthKey(c)
        return monthStr === currentMonthStr || c.status === "aguardando_produto"
      })
    : contracts

  // Admin: pode filtrar por origem (cliente.origem_captacao)
  const contractsVisibleByOrigin = !isComercial && filterOrigin
    ? contractsVisible.filter((c) => (c.clients?.origem_captacao || "") === filterOrigin)
    : contractsVisible

  const filtered = contractsVisibleByOrigin?.filter((c) => {
    const lp = (c.clients as Client & { liticapro_data?: { responsible_name?: string } } | null)?.liticapro_data
    const responsibleName = String(lp?.responsible_name ?? "").trim()
    const matchesSearch =
      !search ||
      c.clients?.name?.toLowerCase().includes(search.toLowerCase()) ||
      c.clients?.cpf_cnpj?.includes(search) ||
      (search.replace(/\D/g, "") && c.clients?.cpf_cnpj?.replace(/\D/g, "").includes(search.replace(/\D/g, ""))) ||
      c.clients?.email?.toLowerCase().includes(search.toLowerCase()) ||
      responsibleName.toLowerCase().includes(search.toLowerCase())
    const matchesStatus =
      filterStatus === "all" ? true : getProductStatusBucket(c.status) === filterStatus
    const monthStr = getContractMonthKey(c)
    const matchesMonth = isComercial ? true : !filterMonth || monthStr === filterMonth
    return matchesSearch && matchesStatus && matchesMonth
  })

  const monthOptions = buildDashboardMonthOptions()

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
        credentials: "include",
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

  const closeContractModal = () => {
    setEditingContract(null)
    setEditCompanyGov(null)
    setViewOnly(false)
  }

  const populateEditFormFromContract = (contract: Contract) => {
    const c = contract.clients
    const monthly = Number(contract.monthly_value) || 800
    let address = (c as { address?: string })?.address ?? ""
    let number = (c as { number?: string })?.number ?? ""
    let district = (c as { district?: string })?.district ?? ""
    let city = c?.city ?? ""
    let state = c?.state ?? ""
    let zip_code = c?.zip_code ?? ""
    if (address && !city && !state) {
      const parts = address.split(",").map((p: string) => p.trim()).filter(Boolean)
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
    const dev = (c as { liticapro_data?: { dados_desenvolvedor?: { empresa?: string; usuario?: string; senha?: string }; customer_type?: string; business_segment?: string; states_of_interest?: string[]; responsible_name?: string; company_gov?: CnpjGovData } })?.liticapro_data
    const meta = (contract as { liticapro_meta?: { states_of_interest?: string[]; customer_type?: string } }).liticapro_meta
    const lpStates = dev?.states_of_interest ?? meta?.states_of_interest ?? []
    setEditCompanyGov(dev?.company_gov ?? null)
    setEditForm({
      client_name: c?.name ?? "",
      client_cpf_cnpj: formatCpfCnpj(c?.cpf_cnpj ?? ""),
      client_email: c?.email ?? "",
      client_phone: c?.phone ?? "",
      zip_code,
      address,
      number,
      district,
      city,
      state,
      origem_captacao: c?.origem_captacao ?? "",
      status_lead: (c?.status_lead as string) ?? "",
      plan: valueToPlan(monthly),
      payment_day: Number(contract.payment_day) || 10,
      start_date: startStr,
      end_date: endStr,
      monthly_value: String(contract.monthly_value ?? ""),
      status: contract.status || "ativa",
      payment_status: contract.payment_status || "em_dia",
      notes: contract.notes ?? "",
      dev_empresa: dev?.dados_desenvolvedor?.empresa ?? "",
      dev_usuario: dev?.dados_desenvolvedor?.usuario ?? "",
      dev_senha: dev?.dados_desenvolvedor?.senha ?? "",
      customer_type: (dev?.customer_type === "profissional_liberal" ? "profissional_liberal" : "empresa") as "empresa" | "profissional_liberal",
      business_segment: dev?.business_segment ?? "",
      states_of_interest: Array.isArray(lpStates) ? lpStates.map(String) : [],
      responsible_name: dev?.responsible_name ?? "",
    })
  }

  const openViewContract = (contract: Contract) => {
    populateEditFormFromContract(contract)
    setEditingContract(contract)
    setViewOnly(true)
  }

  const openEditContract = (contract: Contract) => {
    populateEditFormFromContract(contract)
    setEditingContract(contract)
    setViewOnly(false)
  }

  const toggleEditState = (uf: string) => {
    setEditForm((p) => ({
      ...p,
      states_of_interest: p.states_of_interest.includes(uf)
        ? p.states_of_interest.filter((s) => s !== uf)
        : [...p.states_of_interest, uf],
    }))
  }

  const handleEditCnpjConsult = async () => {
    const digits = (editForm.client_cpf_cnpj || "").replace(/\D/g, "")
    if (digits.length !== 14) {
      toast.error("Informe um CNPJ válido (14 dígitos).")
      return
    }
    setLoadingEditCnpj(true)
    try {
      const res = await fetch(`/api/geo/cnpj?value=${encodeURIComponent(digits)}`)
      const data = await res.json()
      if (!res.ok || !data?.razao_social) throw new Error(data.error || "CNPJ não encontrado")
      setEditCompanyGov(data as CnpjGovData)
      toast.success("CNAEs atualizados pela Receita Federal.")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao consultar CNPJ.")
    } finally {
      setLoadingEditCnpj(false)
    }
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

      const res = await fetch(`/api/contracts/${editingContract.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_name: clientName,
          client_cpf_cnpj: cpfCnpjRaw || editingContract.clients?.cpf_cnpj || null,
          client_email: editForm.client_email,
          client_phone: editForm.client_phone,
          address: fullAddress,
          number: editForm.number,
          district: editForm.district,
          city: editForm.city,
          state: editForm.state,
          zip_code: editForm.zip_code,
          origem_captacao: editForm.origem_captacao,
          status_lead: editForm.status_lead,
          status: isAdmin ? editForm.status : editingContract.status,
          payment_status: editForm.payment_status,
          monthly_value: isLiticaPro ? Number(editingContract.monthly_value ?? 0) : value,
          start_date: startDate,
          end_date: endDate,
          ...(isLiticaPro ? {} : { payment_day: paymentDay, plan: editForm.plan }),
          notes: editForm.notes,
          ...(isLiticaPro ? {
            liticapro_data: {
              customer_type: editForm.customer_type,
              business_segment: editForm.business_segment.trim(),
              states_of_interest: editForm.states_of_interest,
              responsible_name: editForm.responsible_name.trim(),
              company_gov: editCompanyGov,
            },
            liticapro_meta: {
              customer_type: editForm.customer_type,
              states_of_interest: editForm.states_of_interest,
            },
          } : {}),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Erro ao atualizar contrato")

      if (isLiticaPro && isAdmin && editingContract.client_id && (editForm.dev_empresa || editForm.dev_usuario || editForm.dev_senha)) {
        const devRes = await fetch(`/api/clients/${editingContract.client_id}/liticapro-developer`, {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            empresa: editForm.dev_empresa,
            usuario: editForm.dev_usuario,
            senha: editForm.dev_senha,
          }),
        })
        if (!devRes.ok) {
          const devData = await devRes.json()
          throw new Error(devData.error || "Erro ao salvar credenciais do desenvolvedor.")
        }
      }

      toast.success("Contrato e cliente atualizados.")
      closeContractModal()
      await mutateContracts()
      await mutateApiContracts()
    } catch (err: unknown) {
      console.error("Erro ao atualizar contrato:", err)
      const msg = err instanceof Error ? err.message : "Erro ao atualizar contrato."
      toast.error(msg)
    } finally {
      setSavingEdit(false)
    }
  }

  const handleDeleteContract = async (contract: Contract) => {
    if (!confirm("Tem certeza que deseja excluir este contrato? O cliente permanece cadastrado; apenas a assinatura será removida.")) return
    setDeletingId(contract.id)
    const clientName = (contract.clients as { name?: string } | null)?.name ?? "cliente"
    try {
      const res = await fetch(`/api/contracts/${contract.id}`, {
        method: "DELETE",
        credentials: "include",
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Erro ao excluir contrato")

      toast.success("Contrato excluído. O cliente continua na lista de Clientes.")
      await mutateContracts()
      await mutateApiContracts()
      await globalMutate("clients-list")
      await globalMutate("contracts-by-client")
    } catch (err: unknown) {
      console.error("Erro ao excluir contrato:", err)
      toast.error(err instanceof Error ? err.message : "Erro ao excluir contrato.")
    } finally {
      setDeletingId(null)
    }
  }

  const quickUpdateStatus = async (
    contract: Contract,
    payload: { status_lead?: string; product_status?: string },
  ) => {
    setStatusUpdatingId(contract.id)
    try {
      const res = await fetch(`/api/contracts/${contract.id}/quick-status`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Erro ao atualizar status")
      toast.success("Status atualizado.")
      await mutateContracts()
      await mutateApiContracts()
      await globalMutate("clients-list")
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao atualizar status.")
      throw err
    } finally {
      setStatusUpdatingId(null)
    }
  }

  const getProductStatusPickerValue = (status: string | null | undefined) => {
    const bucket = getProductStatusBucket(status)
    if (bucket === "contratado") return "ativa"
    if (bucket === "trial") return "trial"
    if (bucket === "aguardando_produto") return "aguardando_produto"
    return "inativa"
  }

  const kanbanColumns = isLiticaPro ? PRODUCT_KANBAN_COLUMNS : PAYMENT_KANBAN_COLUMNS

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/produtos" className="flex h-9 w-9 items-center justify-center rounded-lg border border-border hover:bg-secondary transition-colors">
          <ArrowLeft className="h-4 w-4 text-muted-foreground" />
        </Link>
        <div>
          <h2 className="text-2xl font-bold text-foreground">
            {productResolved?.name || getProductBySlug(slug)?.name || slug}
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {productResolved?.description || getProductBySlug(slug)?.description || ""}
          </p>
          {isComercial && (
            <p className="text-xs text-amber-400/90 mt-1">Seus contratos — apenas vendas registradas por você.</p>
          )}
        </div>
        <button
          onClick={() => { setShowNewContract(true); setFormError(null) }}
          className="ml-auto flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          {isLiticaPro ? "Registrar compra manual" : "Registrar compra manual"}
        </button>
      </div>

      {/* Search + Filtro por mês (só admin; comercial não filtra por mês) */}
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
        {!isComercial && (
          <>
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
            <div className="flex items-center gap-2 shrink-0">
              <select
                value={filterOrigin}
                onChange={(e) => setFilterOrigin(e.target.value)}
                className="h-10 min-w-[180px] rounded-lg border border-border bg-secondary px-3 text-sm font-medium text-foreground focus:border-primary focus:outline-none"
                title="Filtrar por origem"
              >
                <option value="">Todas as origens</option>
                {ORIGEM_CAPTACAO_OPCOES.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>
          </>
        )}
      </div>

      {/* Stats: total geral ou "Seu total" para comercial (comercial vê só lista do mês + aguardando) */}
      <p className="text-xs text-muted-foreground mb-1">{isComercial ? "Seu total" : "Total geral"}</p>
      <div className={cn("grid gap-4", isComercial ? "grid-cols-2 sm:grid-cols-3 lg:grid-cols-5" : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-6")}>
        {[
          { label: "Total", value: contractsVisibleByOrigin?.length || 0, color: "text-foreground", filter: "all" as const },
          {
            label: "Aguardando produto",
            value: contractsVisibleByOrigin?.filter((c) => getProductStatusBucket(c.status) === "aguardando_produto").length || 0,
            color: "text-amber-400",
            filter: "aguardando_produto" as const,
          },
          {
            label: "Produto contratado",
            value: contractsVisibleByOrigin?.filter((c) => getProductStatusBucket(c.status) === "contratado").length || 0,
            color: "text-emerald-400",
            filter: "contratado" as const,
          },
          {
            label: "Teste grátis",
            value: contractsVisibleByOrigin?.filter((c) => getProductStatusBucket(c.status) === "trial").length || 0,
            color: "text-sky-400",
            filter: "trial" as const,
          },
          {
            label: "Produto inativo",
            value: contractsVisibleByOrigin?.filter((c) => getProductStatusBucket(c.status) === "inativo").length || 0,
            color: "text-red-400",
            filter: "inativo" as const,
          },
          ...(isComercial ? [] : [{ label: "Receita Mensal", value: (() => {
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
            const total = contractsVisibleByOrigin?.filter(c => paymentOk(c) && noMes(c)).reduce((s, c) => s + Number(c.monthly_value ?? 0), 0) ?? 0
            return `R$ ${total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`
          })(), color: "text-primary", filter: null }]),
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

      {/* Lista ou Kanban */}
      <div className="flex items-center justify-between gap-4 mb-2">
        <p className="text-xs text-muted-foreground">
          {view === "kanban" && isLiticaPro
            ? "Kanban por status do produto"
            : view === "kanban"
              ? "Kanban por status de pagamento"
              : isComercial
                ? "Contratos do mês atual e aguardando produto"
                : [filterMonth && "mês selecionado", filterOrigin && "origem selecionada"].filter(Boolean).length
                  ? "Lista filtrada"
                  : "Todos os contratos"}
        </p>
        <div className="flex rounded-lg border border-border overflow-hidden shrink-0">
          <button
            type="button"
            title="Listagem"
            onClick={() => setView("list")}
            className={cn("flex items-center gap-2 px-3 py-2 text-sm", view === "list" ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:bg-secondary")}
          >
            <List className="h-4 w-4" /> Listagem
          </button>
          <button
            type="button"
            title={isLiticaPro ? "Kanban (por status do produto)" : "Kanban (por status de pagamento)"}
            onClick={() => setView("kanban")}
            className={cn("flex items-center gap-2 px-3 py-2 text-sm", view === "kanban" ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:bg-secondary")}
          >
            <LayoutGrid className="h-4 w-4" /> Kanban
          </button>
        </div>
      </div>

      {view === "kanban" ? (
        <div className={cn("grid grid-cols-1 md:grid-cols-2 gap-4 overflow-x-auto pb-4", isLiticaPro ? "lg:grid-cols-4" : "lg:grid-cols-5")}>
          {kanbanColumns.map((col) => {
            const colContracts = (filtered || []).filter((c) =>
              isLiticaPro
                ? getProductStatusPickerValue(c.status) === col.id
                : normalizePaymentForKanban(c.payment_status) === col.id,
            )
            const ColIcon = "Icon" in col ? col.Icon : null
            return (
              <div key={col.id} className="flex flex-col min-w-[220px] rounded-xl border border-border bg-card/50 overflow-hidden">
                <div className={cn("flex items-center justify-between px-3 py-2.5 border-b border-border", col.class)}>
                  <span className="flex items-center gap-2 text-sm font-semibold">
                    {ColIcon ? <ColIcon className="h-4 w-4 shrink-0" /> : null}
                    {col.label}
                  </span>
                  <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-background/80 text-xs font-bold">{colContracts.length}</span>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-2 max-h-[calc(100vh-380px)]">
                  {colContracts.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-4 text-center">Nenhum contrato</p>
                  ) : (
                    colContracts.map((contract) => (
                      <div
                        key={contract.id}
                        className="rounded-lg border border-border bg-background p-3 shadow-sm hover:shadow transition-shadow"
                      >
                        <button
                          type="button"
                          onClick={() => openViewContract(contract)}
                          className="text-left w-full rounded-md hover:bg-primary/5 -m-1 p-1 transition-colors"
                          title="Ver detalhes do cliente"
                        >
                          <p className="font-medium text-foreground truncate">{contract.clients?.name || "—"}</p>
                          <p className="text-xs text-muted-foreground truncate mt-0.5">{getClientListSubtitle(contract.clients, isLiticaPro) || displayCpfCnpj(contract.clients?.cpf_cnpj)}</p>
                        </button>
                        <p className="text-xs text-muted-foreground mt-1">{contract.clients?.origem_captacao || "—"}</p>
                        {isLiticaPro ? (
                          <>
                            <p className="text-[11px] text-muted-foreground mt-2">
                              Contato: {getEtapaLeadLabel(contract.clients)}
                            </p>
                            {(contract.payment_status === "trial" || contract.status === "trial") && (
                              <p className="text-[11px] text-sky-400/90 mt-1 flex items-center gap-1">
                                <Clock className="h-3 w-3 shrink-0" />
                                Teste até {formatContractDate(resolveTrialEndsAt(contract as Contract & { trial_ends_at?: string | null })?.toISOString())}
                              </p>
                            )}
                          </>
                        ) : (
                          <p className="text-sm font-semibold text-primary mt-2">
                            R$ {Number(contract.monthly_value).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                          </p>
                        )}
                        <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
                          <Calendar className="h-3 w-3 shrink-0" />
                          Cadastro {formatContractDate(isLiticaPro ? contract.created_at : contract.start_date)}
                        </p>
                        {!isLiticaPro && (contract.payment_status === "trial" || contract.status === "trial") && (
                          <p className="text-[11px] text-sky-400/90 mt-0.5 flex items-center gap-1">
                            <Clock className="h-3 w-3 shrink-0" />
                            Teste até {formatContractDate(resolveTrialEndsAt(contract as Contract & { trial_ends_at?: string | null })?.toISOString())}
                          </p>
                        )}
                        <div className="flex gap-1 mt-2">
                          <button
                            type="button"
                            onClick={() => openEditContract(contract)}
                            className="rounded p-1.5 text-muted-foreground hover:bg-primary/10 hover:text-primary"
                            title="Editar"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteContract(contract)}
                            disabled={deletingId === contract.id}
                            className="rounded p-1.5 text-muted-foreground hover:bg-red-500/10 hover:text-red-400 disabled:opacity-50"
                            title="Excluir"
                          >
                            {deletingId === contract.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
      <div className="glass rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-secondary/30">
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Cliente</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">CPF/CNPJ</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Origem</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">{isLiticaPro ? "Cadastro" : "Inicio"}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Valor</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Pagamento</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Produto</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Contato</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wide">Acoes</th>
              </tr>
            </thead>
            <tbody>
              {filtered && filtered.length > 0 ? (
                filtered.map((contract) => (
                  <tr key={contract.id} className="border-b border-border/50 hover:bg-secondary/20 transition-colors">
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => openViewContract(contract)}
                        className="flex items-center gap-3 text-left w-full rounded-lg hover:bg-primary/5 transition-colors -m-1 p-1"
                        title="Ver detalhes do cliente"
                      >
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 shrink-0">
                          <User className="h-4 w-4 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{contract.clients?.name || "---"}</p>
                          <p className="text-xs text-muted-foreground truncate">{getClientListSubtitle(contract.clients, isLiticaPro) || "—"}</p>
                        </div>
                      </button>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground font-mono">{displayCpfCnpj(contract.clients?.cpf_cnpj)}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{contract.clients?.origem_captacao || "—"}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 shrink-0" />
                        {formatContractDate(isLiticaPro ? (contract.created_at ?? contract.start_date) : contract.start_date)}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-foreground">
                      R$ {Number(contract.monthly_value).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <DollarSign className={cn("h-3.5 w-3.5 shrink-0", PAYMENT_MAP[contract.payment_status]?.class)} />
                        <div>
                          <span className={cn("text-sm font-medium", PAYMENT_MAP[contract.payment_status]?.class)}>
                            {PAYMENT_MAP[contract.payment_status]?.label}
                          </span>
                          {isLiticaPro && (contract.payment_status === "trial" || contract.status === "trial") && (
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                              Expira {formatContractDate(resolveTrialEndsAt(contract as Contract & { trial_ends_at?: string | null })?.toISOString())}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {(() => {
                        const pickerValue = getProductStatusPickerValue(contract.status)
                        const status = normalizeProductStatus(contract.status)
                        const info = STATUS_MAP[status] ?? STATUS_MAP[pickerValue] ?? { label: contract.status, Icon: PauseCircle, class: "bg-secondary text-muted-foreground border-border" }
                        const Icon = info.Icon
                        return (
                          <ClickableStatusBadge
                            options={[...PRODUCT_STATUS_OPCOES]}
                            value={pickerValue}
                            className={info.class}
                            disabled={!isAdmin}
                            saving={statusUpdatingId === contract.id}
                            title={isAdmin ? "Clique para alterar o status do produto" : "Somente administradores podem alterar"}
                            onSelect={(id) => quickUpdateStatus(contract, { product_status: id })}
                          >
                            <Icon className="h-3.5 w-3.5 shrink-0" />
                          </ClickableStatusBadge>
                        )
                      })()}
                    </td>
                    <td className="px-4 py-3">
                      {(() => {
                        const etapa = getEtapaLead(contract.clients)
                        const label = getEtapaLeadLabel(contract.clients)
                        const color = ETAPA_LEAD_COLOR_MAP[etapa] ?? "bg-secondary text-muted-foreground border-border"
                        return (
                          <ClickableStatusBadge
                            options={[...STATUS_COMERCIAL_OPCOES]}
                            value={etapa}
                            className={color}
                            saving={statusUpdatingId === contract.id}
                            title="Clique para alterar o status de contato"
                            onSelect={(id) => quickUpdateStatus(contract, { status_lead: id })}
                          >
                            {label}
                          </ClickableStatusBadge>
                        )
                      })()}
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
                  <td colSpan={9} className="px-4 py-12 text-center text-sm text-muted-foreground">
                    {search ? "Nenhuma contratacao encontrada para esta busca." : "Nenhuma contratacao registrada para este produto."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      )}

      {editingContract && (() => {
        const ro = viewOnly
        const inputCls = cn(
          "w-full h-8 rounded-lg border border-border px-2.5 text-sm text-foreground",
          ro ? "bg-muted/40 cursor-default" : "bg-background focus:border-primary focus:outline-none",
        )
        const selectCls = cn(inputCls, ro && "pointer-events-none opacity-90")
        const areaCls = cn(
          "w-full rounded-lg border border-border px-2.5 py-1.5 text-sm text-foreground resize-none",
          ro ? "bg-muted/40 cursor-default" : "bg-background focus:border-primary focus:outline-none",
        )
        const productStatusLabel = STATUS_MAP[normalizeProductStatus(editForm.status)]?.label ?? editForm.status
        const paymentLabel = PAYMENT_MAP[editForm.payment_status]?.label ?? editForm.payment_status
        const contatoLabel = getEtapaLeadLabel({ status_lead: editForm.status_lead } as Client)
        const trialEndLabel = formatContractDate(
          resolveTrialEndsAt(editingContract as Contract & { trial_ends_at?: string | null })?.toISOString(),
        )
        const cadastroLabel = formatContractDate(editingContract.created_at)

        if (ro && isLiticaPro) {
          return (
            <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4">
              <div className="w-full max-w-[min(96vw,1280px)] rounded-2xl bg-background border border-border p-5 shadow-xl">
                <LiticaProContractDetailView
                  clientName={editForm.client_name}
                  cpfCnpj={editForm.client_cpf_cnpj}
                  customerType={editForm.customer_type}
                  responsibleName={editForm.responsible_name}
                  email={editForm.client_email}
                  phone={editForm.client_phone}
                  zipCode={editForm.zip_code}
                  address={editForm.address}
                  number={editForm.number}
                  district={editForm.district}
                  city={editForm.city}
                  state={editForm.state}
                  businessSegment={editForm.business_segment}
                  statesOfInterest={editForm.states_of_interest}
                  gov={editCompanyGov}
                  cadastroLabel={cadastroLabel}
                  trialEndLabel={trialEndLabel}
                  productStatusLabel={productStatusLabel}
                  paymentLabel={paymentLabel}
                  origemCaptacao={editForm.origem_captacao}
                  contatoLabel={contatoLabel}
                  notes={editForm.notes}
                  devEmpresa={editForm.dev_empresa}
                  devUsuario={editForm.dev_usuario}
                  devSenha={editForm.dev_senha}
                  showDev={isAdmin}
                  onEdit={() => setViewOnly(false)}
                  onClose={closeContractModal}
                />
              </div>
            </div>
          )
        }

        return (
        <div className={cn("fixed inset-0 z-40 flex bg-black/60 p-3", isLiticaPro ? "items-center justify-center" : "items-start justify-center overflow-y-auto")}>
          <div className={cn("w-full rounded-2xl bg-background border border-border p-4 shadow-xl", isLiticaPro ? "max-w-[min(96vw,1280px)]" : "max-w-4xl my-2")}>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-lg font-semibold text-foreground">
                  {ro ? "Detalhes do contrato" : "Editar contrato e cliente"}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {ro
                    ? "Visualização completa dos dados — use Editar para alterar."
                    : isLiticaPro
                      ? "Dados LiticaPro — sem plano ou dia de pagamento nesta etapa."
                      : "Vincule um cliente a este produto com valor e data de início."}
                </p>
              </div>
              <button type="button" onClick={closeContractModal} className="rounded-full border border-border px-2 py-1 text-xs text-muted-foreground hover:bg-secondary">Fechar</button>
            </div>
            <div className="space-y-3">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Dados do cliente</p>
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
                <div>
                  <p className="text-[11px] font-medium text-muted-foreground mb-0.5">Nome completo</p>
                  <input readOnly={ro} className={inputCls} value={editForm.client_name} onChange={(e) => setEditForm((p) => ({ ...p, client_name: e.target.value }))} />
                </div>
                <div>
                  <p className="text-[11px] font-medium text-muted-foreground mb-0.5">CPF/CNPJ</p>
                  <div className="flex gap-1.5">
                    <input readOnly={ro} className={cn(inputCls, "font-mono")} value={editForm.client_cpf_cnpj} onChange={(e) => setEditForm((p) => ({ ...p, client_cpf_cnpj: formatCpfCnpj(e.target.value) }))} placeholder="CPF ou CNPJ" />
                    {isLiticaPro && !ro && (
                      <button type="button" onClick={handleEditCnpjConsult} disabled={loadingEditCnpj} className="shrink-0 rounded-lg border border-primary px-2 text-[11px] text-primary hover:bg-primary/10 disabled:opacity-50" title="Atualizar CNAEs">
                        {loadingEditCnpj ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "CNPJ"}
                      </button>
                    )}
                  </div>
                </div>
                {isLiticaPro && (
                  <div>
                    <p className="text-[11px] font-medium text-muted-foreground mb-0.5">Modalidade</p>
                    {ro ? (
                      <input readOnly className={inputCls} value={editForm.customer_type === "profissional_liberal" ? "Profissional Liberal" : "Empresa"} />
                    ) : (
                      <select className={selectCls} value={editForm.customer_type} onChange={(e) => setEditForm((p) => ({ ...p, customer_type: e.target.value as "empresa" | "profissional_liberal" }))}>
                        <option value="empresa">Empresa</option>
                        <option value="profissional_liberal">Profissional Liberal</option>
                      </select>
                    )}
                  </div>
                )}
                <div>
                  <p className="text-[11px] font-medium text-muted-foreground mb-0.5">Email</p>
                  <input readOnly={ro} type="email" className={inputCls} value={editForm.client_email} onChange={(e) => setEditForm((p) => ({ ...p, client_email: e.target.value }))} />
                </div>
                <div>
                  <p className="text-[11px] font-medium text-muted-foreground mb-0.5">Telefone / Celular</p>
                  <input readOnly={ro} className={inputCls} value={editForm.client_phone} onChange={(e) => setEditForm((p) => ({ ...p, client_phone: formatPhone(e.target.value) }))} />
                </div>
                {isLiticaPro && editForm.customer_type === "empresa" && (
                  <div>
                    <p className="text-[11px] font-medium text-muted-foreground mb-0.5">Responsável pelo cadastro</p>
                    <input readOnly={ro} className={inputCls} value={editForm.responsible_name} onChange={(e) => setEditForm((p) => ({ ...p, responsible_name: e.target.value }))} />
                  </div>
                )}
                <div>
                  <p className="text-[11px] font-medium text-muted-foreground mb-0.5">CEP</p>
                  <input readOnly={ro} className={inputCls} value={editForm.zip_code} onChange={(e) => setEditForm((p) => ({ ...p, zip_code: e.target.value }))} onBlur={ro ? undefined : handleEditCepBlur} />
                </div>
                <div className="lg:col-span-2">
                  <p className="text-[11px] font-medium text-muted-foreground mb-0.5">Endereço (rua)</p>
                  <input readOnly={ro} className={inputCls} value={editForm.address} onChange={(e) => setEditForm((p) => ({ ...p, address: e.target.value }))} />
                </div>
                <div>
                  <p className="text-[11px] font-medium text-muted-foreground mb-0.5">Número</p>
                  <input readOnly={ro} className={inputCls} value={editForm.number} onChange={(e) => setEditForm((p) => ({ ...p, number: e.target.value }))} />
                </div>
                <div>
                  <p className="text-[11px] font-medium text-muted-foreground mb-0.5">Bairro</p>
                  <input readOnly={ro} className={inputCls} value={editForm.district} onChange={(e) => setEditForm((p) => ({ ...p, district: e.target.value }))} />
                </div>
                <div>
                  <p className="text-[11px] font-medium text-muted-foreground mb-0.5">Cidade / UF</p>
                  <div className="flex gap-2">
                    <input readOnly={ro} className={inputCls} placeholder="Cidade" value={editForm.city} onChange={(e) => setEditForm((p) => ({ ...p, city: e.target.value }))} onBlur={ro ? undefined : handleEditGuessUF} />
                    <input readOnly={ro} className={cn(inputCls, "w-16")} placeholder="UF" value={editForm.state} onChange={(e) => setEditForm((p) => ({ ...p, state: e.target.value.toUpperCase() }))} />
                  </div>
                </div>
              </div>

              {isLiticaPro && (
                <>
                  <LiticaProCnaeAndRamoSection
                    gov={editCompanyGov}
                    ramo={editForm.business_segment}
                    setRamo={(v) => setEditForm((p) => ({ ...p, business_segment: v }))}
                    ramoRequired={false}
                    inline
                    readOnly={ro}
                  />
                  {ro ? (
                    <div className="space-y-1">
                      <p className="text-[11px] font-semibold text-primary uppercase tracking-wide">Estados contratados / de interesse</p>
                      <p className={inputCls}>{editForm.states_of_interest.length ? editForm.states_of_interest.join(", ") : "—"}</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-[11px] font-semibold text-primary uppercase tracking-wide">Estados contratados / de interesse</p>
                      <LiticaProStatesSelector selected={editForm.states_of_interest} onToggle={toggleEditState} compact />
                    </div>
                  )}
                </>
              )}

              {!isLiticaPro && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-[11px] font-medium text-muted-foreground mb-0.5">Plano contratado</p>
                    <select className="w-full h-8 rounded-lg border border-border bg-background px-2.5 text-sm text-foreground focus:border-primary focus:outline-none" value={editForm.plan} onChange={(e) => { const planId = e.target.value; const val = planValues[planId] || 0; setEditForm((p) => ({ ...p, plan: planId, monthly_value: val ? String(val) : p.monthly_value })) }}>
                      <option value="basic">Básico+ — R$ 500,00/mês</option>
                      <option value="confort">Confort+ — R$ 800,00/mês</option>
                      <option value="premium">Premium++ — R$ 1.500,00/mês</option>
                    </select>
                  </div>
                  <div>
                    <p className="text-[11px] font-medium text-muted-foreground mb-0.5">Dia de pagamento</p>
                    <input type="number" min={1} max={31} className="w-full h-8 rounded-lg border border-border bg-background px-2.5 text-sm text-foreground focus:border-primary focus:outline-none" value={editForm.payment_day} onChange={(e) => setEditForm((p) => ({ ...p, payment_day: e.target.value === "" ? 10 : Number(e.target.value) }))} />
                  </div>
                </div>
              )}

              {isLiticaPro && editingContract && (
                <div className="grid grid-cols-2 gap-2 rounded-lg border border-sky-500/30 bg-sky-500/5 p-3">
                  <div>
                    <p className="text-[11px] font-medium text-muted-foreground mb-0.5">Data de cadastro</p>
                    <p className="text-sm font-semibold text-foreground">{formatContractDate(editingContract.created_at)}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-medium text-muted-foreground mb-0.5">Teste grátis expira em (7 dias)</p>
                    <p className="text-sm font-semibold text-sky-400">
                      {formatContractDate(
                        resolveTrialEndsAt(editingContract as Contract & { trial_ends_at?: string | null })?.toISOString(),
                      )}
                    </p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
                {!isLiticaPro && (
                <div>
                  <p className="text-[11px] font-medium text-muted-foreground mb-0.5">Início do contrato</p>
                  <input
                    type="date"
                    className="w-full h-8 rounded-lg border border-border bg-background px-2.5 text-sm text-foreground focus:border-primary focus:outline-none"
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
                )}
                {!isLiticaPro && (
                <div>
                  <p className="text-[11px] font-medium text-muted-foreground mb-0.5">Data de término (opcional)</p>
                  <input type="date" className="w-full h-8 rounded-lg border border-border bg-background px-2.5 text-sm text-foreground focus:border-primary focus:outline-none" value={editForm.end_date} onChange={(e) => setEditForm((p) => ({ ...p, end_date: e.target.value }))} />
                </div>
                )}
                <div>
                  <p className="text-[11px] font-medium text-muted-foreground mb-0.5">Produto</p>
                  {ro || !isAdmin ? (
                    <input readOnly className={inputCls} value={productStatusLabel} />
                  ) : (
                    <select className={selectCls} value={editForm.status} onChange={(e) => setEditForm((p) => ({ ...p, status: e.target.value }))}>
                      {isLiticaPro ? (
                        <>
                          <option value="trial">Teste grátis</option>
                          <option value="aguardando_produto">Aguardando produto</option>
                          <option value="ativa">Produto contratado</option>
                          <option value="inativa">Produto inativo</option>
                          <option value="cancelada">Produto cancelado</option>
                        </>
                      ) : (
                        <>
                          <option value="aguardando_produto">Aguardando produto</option>
                          <option value="ativa">Produto contratado</option>
                          <option value="inativa">Produto inativo</option>
                          <option value="pendente">Produto vencido</option>
                          <option value="cancelada">Produto cancelado</option>
                        </>
                      )}
                    </select>
                  )}
                </div>
                <div>
                  <p className="text-[11px] font-medium text-muted-foreground mb-0.5">Situação do pagamento</p>
                  {ro ? (
                    <input readOnly className={inputCls} value={paymentLabel} />
                  ) : (
                    <select className={selectCls} value={editForm.payment_status} onChange={(e) => setEditForm((p) => ({ ...p, payment_status: e.target.value }))}>
                      {isLiticaPro && <option value="trial">Teste grátis (7 dias)</option>}
                      {isLiticaPro && <option value="trial_expirado">Teste expirado</option>}
                      <option value="em_dia">Em dia</option>
                      <option value="pendente">Pendente</option>
                      <option value="atrasado">Atrasado</option>
                      <option value="cancelado">Cancelado</option>
                      <option value="expirado">Expirado</option>
                    </select>
                  )}
                </div>
                <div>
                  <p className="text-[11px] font-medium text-muted-foreground mb-0.5">Origem de captação</p>
                  {ro ? (
                    <input readOnly className={inputCls} value={editForm.origem_captacao || "—"} />
                  ) : (
                    <select className={selectCls} value={editForm.origem_captacao} onChange={(e) => setEditForm((p) => ({ ...p, origem_captacao: e.target.value }))}>
                      <option value="">—</option>
                      {ORIGEM_CAPTACAO_OPCOES.map((opt) => (<option key={opt} value={opt}>{opt}</option>))}
                    </select>
                  )}
                </div>
                <div>
                  <p className="text-[11px] font-medium text-muted-foreground mb-0.5">Contato</p>
                  {ro ? (
                    <input readOnly className={inputCls} value={contatoLabel} />
                  ) : (
                    <select className={selectCls} value={editForm.status_lead} onChange={(e) => setEditForm((p) => ({ ...p, status_lead: e.target.value }))}>
                      {STATUS_COMERCIAL_OPCOES.map((opt) => (<option key={opt.id} value={opt.id}>{opt.label}</option>))}
                    </select>
                  )}
                </div>
              </div>
              <div>
                <p className="text-[11px] font-medium text-muted-foreground mb-0.5">Observações</p>
                <textarea readOnly={ro} rows={2} className={areaCls} value={editForm.notes} onChange={(e) => setEditForm((p) => ({ ...p, notes: e.target.value }))} placeholder="Notas do contrato" />
              </div>
              {isLiticaPro && isAdmin && !ro && (
                <LiticaProDeveloperCredentialsBlock
                  customerType={editForm.customer_type}
                  empresa={editForm.dev_empresa}
                  setEmpresa={(v) => setEditForm((p) => ({ ...p, dev_empresa: v }))}
                  usuario={editForm.dev_usuario}
                  setUsuario={(v) => setEditForm((p) => ({ ...p, dev_usuario: v }))}
                  senha={editForm.dev_senha}
                  setSenha={(v) => setEditForm((p) => ({ ...p, dev_senha: v }))}
                />
              )}
              <div className="flex gap-2 pt-1">
                {ro ? (
                  <>
                    <button type="button" onClick={() => setViewOnly(false)} className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
                      <Pencil className="h-4 w-4" />
                      Editar
                    </button>
                    <button type="button" onClick={closeContractModal} className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-secondary">Fechar</button>
                  </>
                ) : (
                  <>
                    <button type="button" onClick={saveEditContract} disabled={savingEdit} className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60">
                      {savingEdit ? <Loader2 className="h-4 w-4 animate-spin" /> : <Pencil className="h-4 w-4" />}
                      Salvar
                    </button>
                    <button type="button" onClick={closeContractModal} className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-secondary">Cancelar</button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
        )
      })()}

      {isLiticaPro && (
        <LiticaProRegisterModal
          open={showNewContract}
          onClose={() => setShowNewContract(false)}
          onSuccess={async () => {
            await mutateContracts()
            await mutateApiContracts()
          }}
        />
      )}

      {showNewContract && !isLiticaPro && (
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
                  <p className="text-xs font-medium text-muted-foreground mb-1">Produto</p>
                  {isAdmin ? (
                    <select
                      className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:border-primary focus:outline-none"
                      value={newContract.status}
                      onChange={(e) =>
                        setNewContract((prev) => ({ ...prev, status: e.target.value }))
                      }
                    >
                      <option value="active">Produto contratado</option>
                      <option value="aguardando_produto">Aguardando produto</option>
                      <option value="inactive">Produto inativo</option>
                      <option value="suspended">Produto vencido</option>
                      <option value="cancelled">Produto cancelado</option>
                    </select>
                  ) : (
                    <div className="flex h-10 items-center rounded-lg border border-border bg-muted/30 px-3 text-sm text-muted-foreground">
                      Aguardando produto (apenas admin pode alterar)
                    </div>
                  )}
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
