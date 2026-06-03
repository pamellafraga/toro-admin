"use client"
import React, { useState, useRef, useEffect } from "react"
import { useAuth } from "@/lib/auth-context"
import {
  Search, Plus, Minus, X, Save, Users, MapPin, Mail, Phone,
  LayoutGrid, List, Pencil, Building2, Trash2, Upload, Loader2,
  CheckCircle, XCircle, User, ShoppingCart,
} from "lucide-react"
import useSWR, { useSWRConfig } from "swr"
import type { Client } from "@/lib/types"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"

import { ClientRegisterModal, type NewClientFormState } from "@/components/dashboard/client-register-modal"
import { LiticaProRegisterModal } from "@/components/dashboard/liticapro-register-modal"
import { ClientTypeAvatar } from "@/components/dashboard/client-type-avatar"
import { ClientsMobileCardList } from "@/components/dashboard/clients-mobile-card-list"
import {
  ClientsStatusFilterSheet,
  ClientsStatusFilterSummary,
} from "@/components/dashboard/clients-status-filter-sheet"
import { ClientStatusBadge } from "@/components/dashboard/client-status-badge"
import { STATUS_LEAD_FILTER_TABS, normalizeStatusLead } from "@/lib/clients/status-lead"
import { origemCaptacaoForComercial } from "@/lib/constants/origem-captacao"
import {
  canComercialMutateClient,
  comercialMutateDeniedMessage,
  getOrigemCaptacaoFormOptions,
} from "@/lib/clients/comercial-client-guard"
import { resolveProductStatusDisplay } from "@/lib/contracts/product-status-display"
import {
  resolveClientCustomerType,
  type ClientCustomerType,
} from "@/lib/clients/customer-type"
import {
  formatCpfCnpjForDisplay,
  formatCpfCnpjForDisplayOrDash,
  normalizeCpfCnpjForSave,
} from "@/lib/clients/cpf-cnpj-display"

type PrimaryContract = {
  status: string
  payment_status: string | null
  product_name: string
  product_slug: string
}

type ClientListItem = Client & { primary_contract: PrimaryContract | null }

function RegisterManualPurchaseButton({
  client,
  onClick,
}: {
  client: Client
  onClick: (c: Client) => void
}) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        onClick(client)
      }}
      className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-emerald-600/40 bg-emerald-500/15 px-2 py-1 text-[10px] font-semibold text-emerald-800 shadow-sm hover:bg-emerald-500/25 dark:text-emerald-300"
      title="Registrar compra manual — LiticaPro"
    >
      <ShoppingCart className="h-3.5 w-3.5 shrink-0" aria-hidden />
      <span className="whitespace-nowrap">Compra manual</span>
    </button>
  )
}

function ProductStatusBadge({ contract }: { contract: PrimaryContract | null | undefined }) {
  if (!contract?.status) {
    return <span className="text-muted-foreground text-xs">—</span>
  }
  const info = resolveProductStatusDisplay(contract.status)
  const Icon = info.Icon
  const title = contract.product_name ? `${contract.product_name} — ${info.label}` : info.label
  return (
    <span
      title={title}
      className={cn(
        "inline-flex items-center justify-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        info.class,
      )}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" />
    </span>
  )
}

const EMPTY_NEW_CLIENT: NewClientFormState = {
  customer_type: "",
  name: "",
  email: "",
  phone: "",
  cpf_cnpj: "",
  company_name: "",
  address: "",
  number: "",
  district: "",
  city: "",
  state: "",
  zip_code: "",
  notes: "",
  origem_captacao: "",
  status_lead: "",
}

/** Opções de origem no formulário: admin vê todas; comercial só o próprio nome */
function getOpcoesOrigem(
  isComercial: boolean,
  comercialDisplayName: string | null,
  currentOrigem?: string | null,
) {
  return getOrigemCaptacaoFormOptions(isComercial, comercialDisplayName, currentOrigem)
}

type AdminClientesTab = "geral" | "Stefanie" | "xpress-solutions"

const ADMIN_TAB_COUNT_VIEW: Record<AdminClientesTab, string> = {
  geral: "geral-todos",
  Stefanie: "stefanie",
  "xpress-solutions": "xpress-solutions",
}

export default function ClientesPage() {
  const { isAdmin, isComercial, comercialDisplayName } = useAuth()
  const [search, setSearch] = useState("")
  const [showAdd, setShowAdd] = useState(false)
  const [savingNewClient, setSavingNewClient] = useState(false)
  const [view, setView] = useState<"grid" | "list">("list")
  const [filterTab, setFilterTab] = useState<string>("all")
  /** Admin: abas por origem de captação */
  const [adminClientesTab, setAdminClientesTab] = useState<AdminClientesTab>("geral")
  /** Comercial: só "geral" (lista toda) ou "meu" (painel dele — clientes com origem dele) */
  const [comercialClientesTab, setComercialClientesTab] = useState<"geral" | "meu">("geral")
  const [showImport, setShowImport] = useState(false)
  const [importText, setImportText] = useState("")
  const [importing, setImporting] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [statusUpdatingId, setStatusUpdatingId] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [editForm, setEditForm] = useState<Partial<Client> & { customer_type?: ClientCustomerType }>({})
  const [newClient, setNewClient] = useState<NewClientFormState>(EMPTY_NEW_CLIENT)
  const [registerPurchaseOpen, setRegisterPurchaseOpen] = useState(false)
  const [registerPurchaseClient, setRegisterPurchaseClient] = useState<Client | null>(null)

  const openRegisterPurchase = (client: Client) => {
    if (
      isComercial &&
      comercialDisplayName &&
      !canComercialMutateClient(comercialDisplayName, client.origem_captacao)
    ) {
      toast.error(comercialMutateDeniedMessage())
      return
    }
    setRegisterPurchaseClient(client)
    setRegisterPurchaseOpen(true)
  }

  const canEditClient = (client: Client) =>
    !isComercial ||
    !comercialDisplayName ||
    canComercialMutateClient(comercialDisplayName, client.origem_captacao)

  const formatCpfCnpj = (value: string) => {
    const digits = value.replace(/\D/g, "")
    if (digits.length <= 11) {
      // CPF: 000.000.000-00
      return digits
        .replace(/(\d{3})(\d)/, "$1.$2")
        .replace(/(\d{3})(\d)/, "$1.$2")
        .replace(/(\d{3})(\d{1,2})$/, "$1-$2")
    }
    // CNPJ: 00.000.000/0000-00
    return digits
      .replace(/^(\d{2})(\d)/, "$1.$2")
      .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
      .replace(/\.(\d{3})(\d)/, ".$1/$2")
      .replace(/(\d{4})(\d{1,2})$/, "$1-$2")
  }

  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, "")
    if (digits.length <= 10) {
      // Fixo: (00) 0000-0000
      return digits
        .replace(/(\d{2})(\d)/, "($1) $2")
        .replace(/(\d{4})(\d)/, "$1-$2")
    }
    // Celular: (00) 00000-0000
    return digits
      .replace(/(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{5})(\d)/, "$1-$2")
  }

  /** Comercial: "geral" = sem origem; "meu" = origem dele. Admin: "geral" = website/xpress/compra manual; Stefanie = só dela */
  const clientesView =
    isComercial && comercialDisplayName
      ? comercialClientesTab === "meu"
        ? "comercial-meu"
        : "comercial-geral"
      : isAdmin && adminClientesTab === "Stefanie"
        ? "stefanie"
        : isAdmin && adminClientesTab === "xpress-solutions"
          ? "xpress-solutions"
          : isAdmin && adminClientesTab === "geral"
            ? "geral-todos"
            : "geral"

  const clientesListKey = `clients-list-${clientesView}`

  const { mutate: globalMutate } = useSWRConfig()
  const { data: clients, error: clientsError, mutate } = useSWR(
    clientesListKey,
    async () => {
      const res = await fetch(`/api/clients?view=${encodeURIComponent(clientesView)}`, {
        credentials: "include",
        cache: "no-store",
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error((err as { error?: string }).error || "Erro ao carregar contatos")
      }
      const json = (await res.json()) as { clients: ClientListItem[] }
      return json.clients ?? []
    },
    { revalidateOnFocus: true, dedupingInterval: 5000 },
  )

  const { data: tabCounts } = useSWR(
    isAdmin ? "clients-admin-tab-counts" : null,
    async () => {
      const views = ["geral-todos", "stefanie", "xpress-solutions"] as const
      const counts: Record<string, number> = {}
      await Promise.all(
        views.map(async (v) => {
          const res = await fetch(`/api/clients?view=${encodeURIComponent(v)}`, {
            credentials: "include",
            cache: "no-store",
          })
          if (!res.ok) {
            counts[v] = 0
            return
          }
          const json = (await res.json()) as { clients: unknown[] }
          counts[v] = json.clients?.length ?? 0
        }),
      )
      return counts
    },
    { revalidateOnFocus: true, dedupingInterval: 10000 },
  )

  useEffect(() => {
    if (clientsError) {
      toast.error(clientsError.message)
    }
  }, [clientsError])

  const getStatusLead = (c: Client) => normalizeStatusLead(c.status_lead as string | null)
  const countByTab = (id: string) => {
    if (!clients) return 0
    if (id === "all") return clients.length
    return clients.filter((c) => getStatusLead(c) === id).length
  }

  const filtered = clients?.filter((c) => {
    const matchSearch = !search ||
      (c.name || "").toLowerCase().includes(search.toLowerCase()) ||
      (c.cpf_cnpj || "").includes(search) ||
      (c.email || "").toLowerCase().includes(search.toLowerCase()) ||
      (c.phone || "").includes(search)
    // Status "em branco" = não designado; não é filtro — só aparece na lista quando "Todos"
    const matchTab =
      (isComercial && comercialClientesTab === "geral") ||
      filterTab === "all" ||
      getStatusLead(c) === filterTab
    return matchSearch && matchTab
  })

  const handleAdd = async () => {
    if (!newClient.customer_type) {
      toast.error("Selecione Empresa ou Profissional Liberal")
      return
    }
    if (!newClient.name.trim()) {
      toast.error(newClient.customer_type === "empresa" ? "Razão social obrigatória" : "Nome completo obrigatório")
      return
    }
    const phoneDigits = (newClient.phone || "").replace(/\D/g, "")
    const emailTrim = newClient.email.trim()
    const docDigits = (newClient.cpf_cnpj || "").replace(/\D/g, "")
    const hasDoc =
      (newClient.customer_type === "empresa" && docDigits.length === 14) ||
      (newClient.customer_type === "profissional_liberal" && docDigits.length === 11)
    if (!hasDoc && phoneDigits.length < 10 && (!emailTrim || !emailTrim.includes("@"))) {
      toast.error("Informe CPF/CNPJ, telefone ou e-mail para evitar contatos duplicados.")
      return
    }
    if (newClient.customer_type === "empresa" && docDigits.length > 0 && docDigits.length !== 14) {
      toast.error("CNPJ inválido")
      return
    }
    const cpfCnpjPayload =
      newClient.customer_type === "profissional_liberal"
        ? docDigits.length === 11
          ? docDigits
          : null
        : docDigits.length === 14
          ? docDigits
          : docDigits || null
    setSavingNewClient(true)
    try {
      const addressParts = newClient.customer_type === "empresa"
        ? [newClient.address, newClient.number, newClient.district, newClient.city, newClient.state, newClient.zip_code].filter(Boolean)
        : []
      const addressFull = addressParts.length ? addressParts.join(", ") : null
      const payload: Record<string, unknown> = {
        customer_type: newClient.customer_type,
        name: newClient.name.trim(),
        email: newClient.email.trim() || "",
        phone: newClient.phone.trim() || null,
        cpf_cnpj: cpfCnpjPayload,
        company: newClient.customer_type === "empresa" ? newClient.company_name.trim() || null : null,
        address: addressFull,
        number: newClient.customer_type === "empresa" ? newClient.number.trim() || null : null,
        district: newClient.customer_type === "empresa" ? newClient.district.trim() || null : null,
        city: newClient.customer_type === "empresa" ? newClient.city.trim() || null : null,
        state: newClient.customer_type === "empresa" ? newClient.state.trim() || null : null,
        zip_code: newClient.customer_type === "empresa" ? newClient.zip_code.replace(/\D/g, "") || null : null,
        notes: newClient.notes.trim() || null,
        origem_captacao: newClient.origem_captacao || null,
        status_lead: newClient.status_lead || null,
      }
      const res = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        const msg = (err as { error?: string }).error || res.statusText
        toast.error(res.status === 409 ? msg : `Erro ao salvar: ${msg}`)
        return
      }
      try {
        await fetch("/api/activity/log", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ action: `Adicionou o contato ${newClient.name}`, entity_type: "client" }),
        })
        globalMutate("recent-activity")
        globalMutate("all-activities")
      } catch {}
      toast.success("Cliente salvo com sucesso")
      setShowAdd(false)
      setNewClient(EMPTY_NEW_CLIENT)
      mutate()
      globalMutate(clientesListKey)
    } catch {
      toast.error("Erro inesperado ao salvar cliente")
    } finally {
      setSavingNewClient(false)
    }
  }

  const parseImportRows = (text: string): { name: string; email: string; phone: string; cpf_cnpj: string; company_name: string }[] => {
    const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
    const rows: { name: string; email: string; phone: string; cpf_cnpj: string; company_name: string }[] = []
    const sep = text.includes(";") ? ";" : ","
    let start = 0
    if (lines.length > 0) {
      const first = lines[0].toLowerCase()
      if (first.includes("nome") || first.includes("name") || first.includes("email") || first === "nome" || first === "name") start = 1
    }
    for (let i = start; i < lines.length; i++) {
      const parts = lines[i].split(sep).map((p) => p.trim().replace(/^["']|["']$/g, ""))
      const name = parts[0] || ""
      if (!name) continue
      const email = parts[1] ?? ""
      const phone = parts[2] ?? ""
      const cpf_cnpj = (parts[3] ?? "").replace(/\D/g, "")
      const company_name = parts[4] ?? ""
      rows.push({ name, email, phone, cpf_cnpj, company_name })
    }
    return rows
  }

  const handleImport = async () => {
    const rows = parseImportRows(importText)
    if (rows.length === 0) {
      toast.error("Cole ou importe um arquivo com pelo menos uma linha (nome obrigatório). Colunas: Nome; Email; Telefone; CPF/CNPJ; Empresa")
      return
    }
    setImporting(true)
    let ok = 0
    let err = 0
    const ts = Date.now()
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i]
      const cpfCnpj = r.cpf_cnpj && (r.cpf_cnpj.length === 11 || r.cpf_cnpj.length === 14) ? r.cpf_cnpj : `import-${ts}-${i}`
      const payload: Record<string, unknown> = {
        customer_type: "empresa",
        name: r.name,
        email: r.email || "",
        phone: r.phone || null,
        cpf_cnpj: cpfCnpj,
        company: r.company_name || null,
        address: null,
        origem_captacao: null,
        status_lead: null,
      }
      const { error } = await (async () => {
        const res = await fetch("/api/clients", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(payload),
        })
        if (!res.ok) {
          const err = await res.json().catch(() => ({}))
          return { error: { message: (err as { error?: string }).error || res.statusText } }
        }
        return { error: null }
      })()
      if (error) {
        err++
        if (err <= 2) toast.error(`Linha ${i + 1}: ${error.message}`)
      } else ok++
    }
    setImporting(false)
    setShowImport(false)
    setImportText("")
    mutate()
    if (ok) {
      try {
        await fetch("/api/activity/log", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ action: `Importou ${ok} contato(s)`, entity_type: "client", details: { count: ok, errors: err } }),
        })
        globalMutate("recent-activity")
        globalMutate("all-activities")
      } catch {}
      toast.success(`${ok} contato(s) importado(s).${err ? ` ${err} falha(s).` : ""}`)
    }
  }

  const startEdit = (client: Client) => {
    if (!canEditClient(client)) {
      toast.error(comercialMutateDeniedMessage())
      return
    }
    setEditingId(client.id)
    let address = client.address || ""
    let number = client.number || ""
    let district = client.district || ""
    let city = client.city || ""
    let state = client.state || ""
    let zip_code = client.zip_code || ""
    if (address && !city && !state) {
      const parts = address.split(",").map((p) => p.trim()).filter(Boolean)
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
    let origemCaptacao = client.origem_captacao || ""
    if (isComercial && comercialDisplayName && !origemCaptacao.trim()) {
      origemCaptacao = origemCaptacaoForComercial(comercialDisplayName)
    }
    setEditForm({
      name: client.name, email: client.email || "", phone: client.phone || "",
      cpf_cnpj: formatCpfCnpjForDisplay(client.cpf_cnpj),
      company_name: client.company_name || "",
      address, city, state, zip_code, number, district,
      notes: client.notes || "", is_active: client.is_active !== false,
      origem_captacao: origemCaptacao,
      status_lead: (client.status_lead as string) ?? "",
      customer_type: resolveClientCustomerType(client.liticapro_data, client.cpf_cnpj),
    })
  }

  const saveEdit = async () => {
    if (!editForm.customer_type) {
      toast.error("Selecione Empresa ou Profissional Liberal")
      return
    }
    const isEmpresa = editForm.customer_type === "empresa"
    const parts = isEmpresa
      ? [editForm.address, editForm.number, editForm.district, editForm.city, editForm.state, editForm.zip_code].filter(Boolean)
      : []
    const addressFull = parts.length ? parts.join(", ") : null
    const payload: Record<string, unknown> = {
      name: editForm.name,
      email: editForm.email ?? "",
      phone: editForm.phone ?? "",
      ...(normalizeCpfCnpjForSave(editForm.cpf_cnpj)
        ? { cpf_cnpj: normalizeCpfCnpjForSave(editForm.cpf_cnpj) }
        : {}),
      company: isEmpresa ? (editForm.company_name ?? editForm.company ?? null) : null,
      address: addressFull,
      number: isEmpresa ? editForm.number ?? null : null,
      district: isEmpresa ? editForm.district ?? null : null,
      city: isEmpresa ? editForm.city ?? null : null,
      state: isEmpresa ? editForm.state ?? null : null,
      zip_code: isEmpresa ? editForm.zip_code ?? null : null,
      origem_captacao: (editForm.origem_captacao as string) || null,
      status_lead: (editForm.status_lead as string) || null,
      customer_type: editForm.customer_type,
    }
    const { error } = await (async () => {
      const res = await fetch(`/api/clients/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        return {
          error: {
            message: (err as { error?: string }).error || res.statusText,
            status: res.status,
          },
        }
      }
      return { error: null }
    })()
    if (error) {
      toast.error(error.status === 409 ? error.message : `Erro ao atualizar: ${error.message}`)
      return
    }
    try {
      await fetch("/api/activity/log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action: `Atualizou o contato ${editForm.name}`, entity_type: "client", entity_id: editingId }),
      })
      globalMutate("recent-activity")
      globalMutate("all-activities")
    } catch {}
    setEditingId(null)
    mutate()
  }

  const quickUpdateClientStatus = async (client: Client, statusId: string) => {
    if (!canEditClient(client)) {
      toast.error(comercialMutateDeniedMessage())
      return
    }
    setStatusUpdatingId(client.id)
    try {
      const res = await fetch(`/api/clients/${client.id}/status`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status_lead: statusId || null }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error((data as { error?: string }).error || "Erro ao atualizar status")
      toast.success("Status atualizado.")
      await mutate()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao atualizar status.")
      throw err
    } finally {
      setStatusUpdatingId(null)
    }
  }

  const toggleActive = async (client: Client) => {
    toast.success(client.is_active ? "Cliente desativado" : "Cliente ativado")
    mutate()
  }

  const handleDelete = async (client: Client) => {
    if (!canEditClient(client)) {
      toast.error(comercialMutateDeniedMessage())
      return
    }
    if (!confirm(`Tem certeza que deseja excluir o cliente "${client.name}"? Contratos e NF-e vinculados também serão removidos.`)) return
    const { error } = await (async () => {
      const res = await fetch(`/api/clients/${client.id}`, {
        method: "DELETE",
        credentials: "include",
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        return { error: { message: (err as { error?: string }).error || res.statusText } }
      }
      return { error: null }
    })()
    if (error) {
      toast.error("Erro ao excluir: " + error.message)
      return
    }
    try {
      await fetch("/api/activity/log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action: `Excluiu o cliente ${client.name}`, entity_type: "client", entity_id: client.id }),
      })
      globalMutate("recent-activity")
      globalMutate("all-activities")
    } catch {}
    toast.success("Cliente excluído.")
    mutate()
  }

  const isClientActive = (c: Client) => c.is_active !== false
  const showStatusFilter = !isComercial || comercialClientesTab === "meu"
  const showMobileCards = !isComercial || comercialClientesTab === "meu"

  return (
    <div className="flex flex-col gap-4 lg:gap-6">
      <div>
        <h1 className="text-xl font-bold text-foreground tracking-tight mb-1.5 lg:text-3xl lg:mb-2">Contatos</h1>
        {isComercial ? (
          <>
            <p className="text-sm text-foreground/90 mb-0.5">Aba Geral: Contatos sem origem. Coloque sua origem no contato para ele ir para sua lista.</p>
            <p className="text-sm text-foreground/90 mb-3">Sua Lista: Contatos que já possuem sua origem.</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setComercialClientesTab("geral")}
                className={cn(
                  "rounded-lg px-4 py-2.5 text-sm font-medium border-2 transition-colors",
                  comercialClientesTab === "geral"
                    ? "bg-primary border-primary text-white shadow-sm"
                    : "bg-white border-gray-300 text-gray-800 hover:bg-gray-50 hover:border-gray-400"
                )}
              >
                Aba Geral
              </button>
              <button
                type="button"
                onClick={() => setComercialClientesTab("meu")}
                className={cn(
                  "rounded-lg px-4 py-2.5 text-sm font-medium border-2 transition-colors",
                  comercialClientesTab === "meu"
                    ? "bg-primary border-primary text-white shadow-sm"
                    : "bg-white border-gray-300 text-gray-800 hover:bg-gray-50 hover:border-gray-400"
                )}
              >
                Sua Lista
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="text-xs text-muted-foreground mb-2 lg:text-sm">
              Aba Geral: todos os contatos. Aba Stefanie: somente contatos dela. Xpress Solutions: origem Xpress.
            </p>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              {(
                [
                  { id: "geral" as const, label: "Aba Geral" },
                  { id: "Stefanie" as const, label: "Stefanie" },
                  { id: "xpress-solutions" as const, label: "Xpress Solutions" },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setAdminClientesTab(tab.id)
                    setFilterTab("all")
                    mutate()
                  }}
                  className={cn(
                    "rounded-lg px-4 py-2.5 text-sm font-medium border-2 transition-colors",
                    adminClientesTab === tab.id
                      ? "bg-primary border-primary text-white shadow-sm"
                      : "bg-white border-gray-300 text-gray-800 hover:bg-gray-50 hover:border-gray-400",
                  )}
                >
                  {tab.label}
                  {tabCounts && (
                    <span className="ml-1.5 tabular-nums opacity-90">
                      ({tabCounts[ADMIN_TAB_COUNT_VIEW[tab.id]] ?? 0})
                    </span>
                  )}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <div className="relative min-w-0 flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              placeholder="Buscar por nome ou CNPJ..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-10 w-full rounded-lg border border-border bg-secondary pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
            />
          </div>
          {showStatusFilter && (
            <ClientsStatusFilterSheet
              filterTab={filterTab}
              onSelect={setFilterTab}
              countByTab={countByTab}
              className="lg:hidden"
            />
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className="hidden rounded-lg border border-border overflow-hidden lg:flex">
            <button title="Lista" onClick={() => setView("list")} className={cn("px-3 py-2 transition-colors", view === "list" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-secondary")}>
              <List className="h-4 w-4" />
            </button>
            <button title="Grade" onClick={() => setView("grid")} className={cn("px-3 py-2 transition-colors", view === "grid" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-secondary")}>
              <LayoutGrid className="h-4 w-4" />
            </button>
          </div>
          {!isComercial && (
            <button onClick={() => setShowImport(true)} className="hidden items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-foreground hover:bg-secondary transition-colors sm:flex">
              <Upload className="h-4 w-4" /> <span className="hidden sm:inline">Importar</span>
            </button>
          )}
          <button onClick={() => setShowAdd(true)} className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors sm:gap-2 sm:px-4 sm:py-2.5">
            <Plus className="h-4 w-4" /> <span className="hidden xs:inline sm:inline">Novo</span>
          </button>
        </div>
      </div>

      {/* Desktop: filtros por status em linha */}
      {showStatusFilter && (
        <div className="hidden flex-wrap gap-2 lg:flex">
          {STATUS_LEAD_FILTER_TABS.map((tab) => (
            <button
              key={tab.id || "all"}
              type="button"
              onClick={() => setFilterTab(tab.id)}
              className={cn(
                "rounded-lg px-4 py-2 text-xs font-medium transition-all",
                filterTab === tab.id ? tab.btn + " ring-2 ring-offset-2 ring-offset-background ring-white/30" : tab.inactive,
              )}
            >
              {tab.label}{" "}
              <span className="ml-0.5 font-bold tabular-nums">({countByTab(tab.id)})</span>
            </button>
          ))}
        </div>
      )}

      {showStatusFilter && (
        <ClientsStatusFilterSummary filterTab={filterTab} countByTab={countByTab} />
      )}

      <ClientRegisterModal
        open={showAdd}
        onClose={() => {
          setShowAdd(false)
          setNewClient(EMPTY_NEW_CLIENT)
        }}
        onSubmit={handleAdd}
        saving={savingNewClient}
        form={newClient}
        setForm={setNewClient}
        formatCpfCnpj={formatCpfCnpj}
        formatPhone={formatPhone}
        isComercial={isComercial}
        comercialDisplayName={comercialDisplayName}
      />

      {showImport && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60">
          <div className="w-full max-w-xl rounded-2xl bg-background border border-border p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-foreground">Importar contatos</h3>
              <button onClick={() => { setShowImport(false); setImportText("") }} className="rounded-full border border-border px-2 py-1 text-xs text-muted-foreground hover:bg-secondary">Fechar</button>
            </div>
            <p className="text-sm text-muted-foreground mb-2">
              Cole as linhas abaixo ou use o botão para enviar um arquivo. Colunas: <strong>Nome</strong>; Email; Telefone; CPF/CNPJ; Empresa (separador vírgula ou ponto-e-vírgula). A primeira linha pode ser o cabeçalho.
            </p>
            <input type="file" ref={fileInputRef} accept=".csv,.txt" className="hidden" onChange={(e) => {
              const f = e.target.files?.[0]
              if (!f) return
              const r = new FileReader()
              r.onload = () => setImportText(String(r.result ?? ""))
              r.readAsText(f, "UTF-8")
              e.target.value = ""
            }} />
            <button type="button" onClick={() => fileInputRef.current?.click()} className="mb-3 flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm text-foreground hover:bg-secondary">
              <Upload className="h-4 w-4" /> Escolher arquivo CSV/TXT
            </button>
            <textarea placeholder="Nome; Email; Telefone; CPF/CNPJ; Empresa&#10;João Silva; joao@email.com; (11) 99999-9999; 12345678901; Empresa X" value={importText} onChange={(e) => setImportText(e.target.value)}
              className="h-40 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none resize-y" />
            <div className="mt-4 flex gap-2">
              <button onClick={handleImport} disabled={importing} className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60">
                {importing ? <><Loader2 className="h-4 w-4 animate-spin" /> Importando...</> : <><Upload className="h-4 w-4" /> Importar</>}
              </button>
              <button onClick={() => { setShowImport(false); setImportText("") }} className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-secondary">Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile: lista em cards */}
      <div className="lg:hidden">
        {showMobileCards ? (
          <ClientsMobileCardList
            clients={(filtered ?? []) as ClientListItem[]}
            getStatusLead={getStatusLead}
            onEdit={startEdit}
            onDelete={handleDelete}
            onRegisterPurchase={openRegisterPurchase}
            onStatusChange={quickUpdateClientStatus}
            statusUpdatingId={statusUpdatingId}
            emptyMessage={search ? "Nenhum contato encontrado." : "Nenhum contato cadastrado."}
          />
        ) : (
          <div className="flex flex-col gap-2">
            {(filtered ?? []).map((client) => (
              <div key={client.id} className="glass rounded-lg border border-border/50 p-3">
                <div className="flex items-start gap-2">
                  <ClientTypeAvatar
                    customerType={client.customer_type}
                    cpfCnpj={client.cpf_cnpj}
                    liticaproData={client.liticapro_data}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm text-foreground">{client.name}</p>
                    {client.phone && <p className="text-xs text-muted-foreground">{client.phone}</p>}
                  </div>
                  <div className="flex shrink-0 gap-0.5">
                    <RegisterManualPurchaseButton client={client} onClick={openRegisterPurchase} />
                    <button type="button" onClick={() => startEdit(client)} className="p-1.5 text-primary" title="Editar">
                      <Pencil className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {!filtered?.length && (
              <p className="py-8 text-center text-sm text-muted-foreground">Nenhum contato sem origem.</p>
            )}
          </div>
        )}
      </div>

      {editingId && (
        <div className="lg:hidden fixed inset-0 z-[70] flex flex-col bg-background pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
          <div className="flex shrink-0 items-center justify-between border-b border-border px-3 py-3">
            <span className="font-semibold text-foreground">Editar contato</span>
            <button type="button" onClick={() => setEditingId(null)} className="rounded-lg p-2 text-muted-foreground hover:bg-secondary">
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-3">
            <p className="mb-3 text-sm font-medium text-foreground truncate">{editForm.name}</p>
            <p className="mb-3 text-xs text-muted-foreground">Use os campos abaixo e salve.</p>
            <div className="space-y-3 rounded-lg border border-border p-3">
              <input
                value={editForm.name ?? ""}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm"
                placeholder="Nome"
              />
              <input
                value={editForm.phone ?? ""}
                onChange={(e) => setEditForm({ ...editForm, phone: formatPhone(e.target.value) })}
                className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm"
                placeholder="Telefone"
              />
              <select
                value={editForm.origem_captacao ?? ""}
                onChange={(e) => setEditForm({ ...editForm, origem_captacao: e.target.value })}
                disabled={getOpcoesOrigem(isComercial, comercialDisplayName ?? null, editForm.origem_captacao).some((o) => o.readOnly)}
                className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm disabled:opacity-70"
              >
                {getOpcoesOrigem(isComercial, comercialDisplayName ?? null, editForm.origem_captacao).map((opt) => (
                  <option key={opt.value || "blank"} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              <select
                value={editForm.status_lead ?? ""}
                onChange={(e) => setEditForm({ ...editForm, status_lead: e.target.value })}
                className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm"
              >
                {STATUS_LEAD_FILTER_TABS.filter((o) => o.id !== "all").map((opt) => (
                  <option key={opt.id || "blank"} value={opt.id}>{opt.label}</option>
                ))}
              </select>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={saveEdit} className="flex-1 rounded-lg bg-primary py-2.5 text-sm font-medium text-primary-foreground">
                  Salvar
                </button>
                <button type="button" onClick={() => setEditingId(null)} className="rounded-lg border border-border px-4 py-2.5 text-sm">
                  Cancelar
                </button>
              </div>
            </div>
            <p className="mt-3 text-center text-xs text-muted-foreground">
              Toque no status no card para mudar só a etapa, sem abrir a edição completa.
            </p>
          </div>
        </div>
      )}

      {view === "list" && (
        <div className="hidden lg:block glass rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-secondary/30">
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Cliente</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Contato</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Origem</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Contato</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Produto</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Data de cadastro</th>
                  <th className="min-w-[12.5rem] px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wide">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered && filtered.length > 0 ? filtered.map((client) => (
                  <React.Fragment key={client.id}>
                  <tr className="border-b border-border/30 hover:bg-secondary/20 transition-colors">
                    {editingId === client.id ? (
                      <td colSpan={7} className="px-4 py-2">
                        <div className="rounded-lg border border-border/60 bg-muted/5 p-2 space-y-2">
                          <div className="flex flex-wrap gap-2 pb-1 border-b border-border/40">
                            <span className="text-[10px] text-muted-foreground/70 w-full">Tipo de contato</span>
                            <button
                              type="button"
                              onClick={() => setEditForm({ ...editForm, customer_type: "empresa" })}
                              className={cn(
                                "flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors",
                                editForm.customer_type === "empresa"
                                  ? "border-primary bg-primary text-primary-foreground"
                                  : "border-border bg-background text-muted-foreground hover:border-primary/50",
                              )}
                            >
                              <Building2 className="h-3.5 w-3.5" />
                              Empresa
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditForm({ ...editForm, customer_type: "profissional_liberal" })}
                              className={cn(
                                "flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors",
                                editForm.customer_type === "profissional_liberal"
                                  ? "border-primary bg-primary text-primary-foreground"
                                  : "border-border bg-background text-muted-foreground hover:border-primary/50",
                              )}
                            >
                              <User className="h-3.5 w-3.5" />
                              Profissional Liberal
                            </button>
                          </div>
                          <div className="grid grid-cols-2 min-[500px]:grid-cols-3 sm:grid-cols-5 gap-x-2 gap-y-1.5">
                            <div>
                              <label className="block text-[10px] text-muted-foreground/70 mb-0.5">
                                {editForm.customer_type === "profissional_liberal" ? "Nome completo *" : "Razão social *"}
                              </label>
                              <input value={editForm.name ?? ""} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} className="h-7 w-full rounded border border-border/80 bg-background px-2 text-xs text-foreground focus:border-primary focus:outline-none" placeholder={editForm.customer_type === "profissional_liberal" ? "Nome completo" : "Razão social"} />
                            </div>
                            {editForm.customer_type === "empresa" && (
                              <div>
                                <label className="block text-[10px] text-muted-foreground/70 mb-0.5">Nome fantasia</label>
                                <input value={editForm.company_name ?? ""} onChange={(e) => setEditForm({ ...editForm, company_name: e.target.value })} className="h-7 w-full rounded border border-border/80 bg-background px-2 text-xs text-foreground focus:border-primary focus:outline-none" placeholder="Nome fantasia" />
                              </div>
                            )}
                            <div>
                              <label className="block text-[10px] text-muted-foreground/70 mb-0.5">
                                {editForm.customer_type === "profissional_liberal" ? "CPF (opcional)" : "CNPJ"}
                              </label>
                              <input
                                value={editForm.cpf_cnpj ?? ""}
                                onChange={(e) => setEditForm({ ...editForm, cpf_cnpj: formatCpfCnpj(e.target.value) })}
                                className="h-7 w-full rounded border border-border/80 bg-background px-2 text-xs font-mono text-foreground focus:border-primary focus:outline-none"
                                placeholder={editForm.customer_type === "profissional_liberal" ? "000.000.000-00" : "00.000.000/0000-00"}
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] text-muted-foreground/70 mb-0.5">
                                E-mail{editForm.customer_type === "profissional_liberal" ? " (opcional)" : ""}
                              </label>
                              <input
                                type={editForm.customer_type === "profissional_liberal" ? "text" : "email"}
                                value={editForm.email ?? ""}
                                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                                className="h-7 w-full rounded border border-border/80 bg-background px-2 text-xs text-foreground focus:border-primary focus:outline-none"
                                placeholder="E-mail"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] text-muted-foreground/70 mb-0.5">Telefone</label>
                              <input value={editForm.phone ?? ""} onChange={(e) => setEditForm({ ...editForm, phone: formatPhone(e.target.value) })} className="h-7 w-full rounded border border-border/80 bg-background px-2 text-xs text-foreground focus:border-primary focus:outline-none" placeholder="Telefone" />
                            </div>
                          </div>
                          {editForm.customer_type === "empresa" && (
                          <div className="flex flex-wrap items-end gap-x-2 gap-y-1.5">
                            <div className="w-[7.5rem] shrink-0">
                              <label className="block text-[10px] text-muted-foreground/70 mb-0.5">CEP</label>
                              <input value={editForm.zip_code ?? ""} onChange={(e) => setEditForm({ ...editForm, zip_code: e.target.value })} className="h-7 w-full rounded border border-border/80 bg-background px-2 text-xs text-foreground font-mono focus:border-primary focus:outline-none" placeholder="00000-000" maxLength={9} />
                            </div>
                            <div className="min-w-0 flex-1 basis-20">
                              <label className="block text-[10px] text-muted-foreground/70 mb-0.5">Rua</label>
                              <input value={editForm.address ?? ""} onChange={(e) => setEditForm({ ...editForm, address: e.target.value })} className="h-7 w-full rounded border border-border/80 bg-background px-2 text-xs text-foreground focus:border-primary focus:outline-none" placeholder="Rua" />
                            </div>
                            <div className="w-12 shrink-0">
                              <label className="block text-[10px] text-muted-foreground/70 mb-0.5">Nº</label>
                              <input value={editForm.number ?? ""} onChange={(e) => setEditForm({ ...editForm, number: e.target.value })} className="h-7 w-full rounded border border-border/80 bg-background px-1.5 text-xs text-foreground focus:border-primary focus:outline-none" placeholder="Nº" />
                            </div>
                            <div className="min-w-0 flex-1 basis-20">
                              <label className="block text-[10px] text-muted-foreground/70 mb-0.5">Bairro</label>
                              <input value={editForm.district ?? ""} onChange={(e) => setEditForm({ ...editForm, district: e.target.value })} className="h-7 w-full rounded border border-border/80 bg-background px-2 text-xs text-foreground focus:border-primary focus:outline-none" placeholder="Bairro" />
                            </div>
                            <div className="min-w-0 flex-1 basis-20">
                              <label className="block text-[10px] text-muted-foreground/70 mb-0.5">Cidade</label>
                              <input value={editForm.city ?? ""} onChange={(e) => setEditForm({ ...editForm, city: e.target.value })} className="h-7 w-full rounded border border-border/80 bg-background px-2 text-xs text-foreground focus:border-primary focus:outline-none" placeholder="Cidade" />
                            </div>
                            <div className="w-10 shrink-0">
                              <label className="block text-[10px] text-muted-foreground/70 mb-0.5">UF</label>
                              <input value={editForm.state ?? ""} onChange={(e) => setEditForm({ ...editForm, state: e.target.value.toUpperCase().slice(0, 2) })} className="h-7 w-full rounded border border-border/80 bg-background px-1 text-xs text-foreground text-center uppercase focus:border-primary focus:outline-none" placeholder="RS" maxLength={2} />
                            </div>
                          </div>
                          )}
                          <div className="flex flex-wrap items-end gap-x-2 gap-y-1.5 pt-1.5 border-t border-border/40">
                            <div className="min-w-[11.5rem] w-auto max-w-[16rem] shrink-0">
                              <label className="block text-[10px] text-muted-foreground/70 mb-0.5">Origem</label>
                              <select
                                value={editForm.origem_captacao ?? ""}
                                onChange={(e) => setEditForm({ ...editForm, origem_captacao: e.target.value })}
                                disabled={getOpcoesOrigem(isComercial, comercialDisplayName ?? null, editForm.origem_captacao).some((o) => o.readOnly)}
                                className="h-7 w-full min-w-[11.5rem] rounded border border-border/80 bg-background pl-2 pr-7 text-xs text-foreground focus:border-primary focus:outline-none disabled:opacity-70"
                              >
                                {getOpcoesOrigem(isComercial, comercialDisplayName ?? null, editForm.origem_captacao).map((opt) => (
                                  <option key={opt.value || "blank"} value={opt.value}>{opt.label}</option>
                                ))}
                              </select>
                            </div>
                            <div className="w-36">
                              <label className="block text-[10px] text-muted-foreground/70 mb-0.5">Contato</label>
                              <select value={editForm.status_lead ?? ""} onChange={(e) => setEditForm({ ...editForm, status_lead: e.target.value })} className="h-7 w-full rounded border border-border/80 bg-background px-2 text-xs text-foreground focus:border-primary focus:outline-none">
                                {STATUS_LEAD_FILTER_TABS.filter((o) => o.id !== "all").map((opt) => (
                                  <option key={opt.id || "blank"} value={opt.id}>{opt.label}</option>
                                ))}
                              </select>
                            </div>
                            <button type="button" onClick={() => setEditForm({ ...editForm, is_active: !editForm.is_active })} className={cn("h-7 rounded border px-2 text-xs font-medium flex items-center gap-1 transition-colors", editForm.is_active ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-red-500/10 text-red-400 border-red-500/20")}>
                              {editForm.is_active ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                              {editForm.is_active ? "Ativo" : "Inativo"}
                            </button>
                            <div className="flex-1 min-w-2" />
                            <RegisterManualPurchaseButton
                              client={client}
                              onClick={openRegisterPurchase}
                            />
                            <button onClick={saveEdit} className="flex items-center gap-1 h-7 rounded bg-primary px-2.5 text-xs font-medium text-primary-foreground hover:bg-primary/90">
                              <Save className="h-3 w-3" /> Salvar
                            </button>
                            <button type="button" onClick={() => setEditingId(null)} className="h-7 rounded border border-border px-2.5 text-xs font-medium text-muted-foreground hover:bg-secondary">Cancelar</button>
                          </div>
                        </div>
                      </td>
                    ) : (
                      <>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <ClientTypeAvatar
                              customerType={client.customer_type}
                              cpfCnpj={client.cpf_cnpj}
                              liticaproData={client.liticapro_data}
                            />
                            <div>
                              <p className="text-sm font-medium text-foreground">{client.name}</p>
                              {client.company_name && <p className="text-xs text-muted-foreground flex items-center gap-1"><Building2 className="h-3 w-3" />{client.company_name}</p>}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col gap-0.5 text-xs text-muted-foreground">
                            {client.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{client.email}</span>}
                            {client.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{client.phone}</span>}
                            {!client.email && !client.phone && <span className="text-muted-foreground/40">—</span>}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">{client.origem_captacao || "—"}</td>
                        <td className="px-4 py-3">
                          <ClientStatusBadge
                            statusId={getStatusLead(client)}
                            saving={statusUpdatingId === client.id}
                            onSelect={(id) => quickUpdateClientStatus(client, id)}
                          />
                        </td>
                        <td className="px-4 py-3">
                          <ProductStatusBadge contract={(client as ClientListItem).primary_contract} />
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">{format(new Date(client.created_at), "dd/MM/yyyy", { locale: ptBR })}</td>
                        <td className="px-4 py-3">
                          <div className="flex flex-nowrap items-center justify-end gap-1">
                            {canEditClient(client) && (
                              <>
                            <RegisterManualPurchaseButton client={client} onClick={openRegisterPurchase} />
                            <button onClick={() => setExpandedId((id) => (id === client.id ? null : client.id))} className="rounded-lg p-1.5 text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors" title={expandedId === client.id ? "Recolher" : "Ver mais"}>
                              {expandedId === client.id ? <Minus className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                            </button>
                            <button onClick={() => startEdit(client)} className="rounded-lg p-1.5 text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors" title="Editar"><Pencil className="h-3.5 w-3.5" /></button>
                            <button onClick={() => handleDelete(client)} className="rounded-lg p-1.5 text-muted-foreground hover:bg-red-500/10 hover:text-red-400 transition-colors" title="Excluir"><Trash2 className="h-3.5 w-3.5" /></button>
                              </>
                            )}
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                  {expandedId === client.id && editingId !== client.id && (
                    <tr className="border-b border-border/30 bg-secondary/10">
                      <td colSpan={7} className="px-4 py-3">
                        <div className="flex flex-wrap gap-6 text-sm">
                          <div>
                            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">CPF/CNPJ</span>
                            <p className="font-mono text-foreground/90 mt-0.5">{formatCpfCnpjForDisplayOrDash(client.cpf_cnpj)}</p>
                          </div>
                          <div className="min-w-0 max-w-[400px]">
                            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Localização</span>
                            <p className="text-foreground/90 mt-0.5">
                              {client.address || client.number || client.district || client.city || client.state || client.zip_code
                                ? [client.address, client.number, client.district, [client.city, client.state].filter(Boolean).join(" — "), client.zip_code].filter(Boolean).join(", ")
                                : "—"}
                            </p>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                  </React.Fragment>
                )) : (
                  <tr><td colSpan={7} className="px-4 py-16 text-center"><Users className="h-10 w-10 text-muted-foreground/20 mx-auto mb-3" /><p className="text-sm text-muted-foreground">{search ? "Nenhum contato encontrado." : adminClientesTab === "xpress-solutions" ? "Nenhum contato com origem Xpress Solutions." : adminClientesTab === "Stefanie" ? "Nenhum contato da Stefanie." : "Nenhum contato cadastrado."}</p></td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {view === "grid" && (
        <>
          <div className="hidden lg:grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filtered?.map((client) => (
              <div key={client.id} className={cn("glass rounded-xl p-5 hover:glow-blue-sm transition-all", !isClientActive(client) && "opacity-60")}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <ClientTypeAvatar
                      size="md"
                      customerType={client.customer_type}
                      cpfCnpj={client.cpf_cnpj}
                      liticaproData={client.liticapro_data}
                    />
                    <div>
                      <p className="font-medium text-foreground">{client.name}</p>
                      {client.company_name && <p className="text-xs text-muted-foreground">{client.company_name}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <RegisterManualPurchaseButton client={client} onClick={openRegisterPurchase} />
                    <button title="Editar" onClick={() => startEdit(client)} className="rounded p-1 text-muted-foreground hover:text-primary transition-colors"><Pencil className="h-3.5 w-3.5" /></button>
                    <button title="Excluir" onClick={() => handleDelete(client)} className="rounded p-1 text-muted-foreground hover:text-red-400 transition-colors"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                </div>
                <div className="flex flex-col gap-1.5 text-sm text-muted-foreground">
                  {formatCpfCnpjForDisplay(client.cpf_cnpj) && (
                    <p className="font-mono text-xs text-foreground/60">{formatCpfCnpjForDisplay(client.cpf_cnpj)}</p>
                  )}
                  {client.email && <div className="flex items-center gap-1.5"><Mail className="h-3 w-3" />{client.email}</div>}
                  {client.phone && <div className="flex items-center gap-1.5"><Phone className="h-3 w-3" />{client.phone}</div>}
                  {(client.address || client.city || client.state) && <div className="flex items-center gap-1.5"><MapPin className="h-3 w-3 shrink-0" />{client.address || [client.city, client.state].filter(Boolean).join(", ")}</div>}
                  <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-border/50 pt-2 text-xs">
                    <span className="text-muted-foreground">Contato:</span>
                    <ClientStatusBadge
                      statusId={getStatusLead(client)}
                      saving={statusUpdatingId === client.id}
                      onSelect={(id) => quickUpdateClientStatus(client, id)}
                    />
                    <span className="text-muted-foreground/50">|</span>
                    <span className="text-muted-foreground">Origem:</span>
                    <span className="font-medium">{client.origem_captacao || "—"}</span>
                    <span className="text-muted-foreground/50">|</span>
                    <span className="text-muted-foreground">Produto:</span>
                    <ProductStatusBadge contract={(client as ClientListItem).primary_contract} />
                  </div>
                </div>
                <p className="mt-3 text-xs text-muted-foreground/50">Cadastrado em {format(new Date(client.created_at), "dd/MM/yyyy", { locale: ptBR })}</p>
              </div>
            ))}
          </div>
          {filtered?.length === 0 && <div className="flex flex-col items-center justify-center py-16"><Users className="h-12 w-12 text-muted-foreground/20 mb-3" /><p className="text-muted-foreground">{search ? "Nenhum cliente encontrado" : "Nenhum cliente cadastrado"}</p></div>}
        </>
      )}

      <LiticaProRegisterModal
        open={registerPurchaseOpen}
        initialClient={registerPurchaseClient}
        onClose={() => {
          setRegisterPurchaseOpen(false)
          setRegisterPurchaseClient(null)
        }}
        onSuccess={async () => {
          await mutate()
          await globalMutate(
            (key) => typeof key === "string" && key.startsWith("clients-list-"),
            undefined,
            { revalidate: true },
          )
        }}
      />
    </div>
  )
}
