"use client"

import { useState, useMemo, useCallback, useEffect } from "react"
import useSWR from "swr"
import { useAuth } from "@/lib/auth-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Plus, Trash2, Edit2, RefreshCw, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import {
  convertUsdToBrl,
  USD_BRL_FALLBACK_RATE,
  type UsdBrlQuote,
} from "@/lib/exchange/usd-brl"
import {
  mapExpenseRow,
  mapExpenseToRow,
  type CompanyExpense,
  type BillingPeriod,
  type FeeCurrency,
} from "@/lib/company-expenses/map-expense"
import {
  readCompanyExpensesFromStorage,
  writeCompanyExpensesToStorage,
} from "@/lib/company-expenses/storage"
import type { CompanyExpenseRow } from "@/lib/db/repositories/company-expenses.repository"

const EXPENSES_API = "/api/admin/company-expenses"

type FeeFormData = {
  name: string
  category: string
  currency: FeeCurrency
  valueUsd: number
  valueBrl: number
  dueDate: number
  dueMonth: number
  billingPeriod: BillingPeriod
  notes: string
}

const EMPTY_FORM: FeeFormData = {
  name: "",
  category: "FERRAMENTAS DE CRIAÇÃO",
  currency: "usd",
  valueUsd: 0,
  valueBrl: 0,
  dueDate: 1,
  dueMonth: 1,
  billingPeriod: "mensal",
  notes: "",
}

const BILLING_LABELS: Record<BillingPeriod, string> = {
  mensal: "Mensal",
  anual: "Anual",
  vitalicio: "Vitalício (1x)",
}

const CURRENCY_LABELS: Record<FeeCurrency, string> = {
  usd: "Dólar (USD)",
  brl: "Real (BRL)",
}

const MONTH_OPTIONS = [
  { value: 1, label: "Janeiro" },
  { value: 2, label: "Fevereiro" },
  { value: 3, label: "Março" },
  { value: 4, label: "Abril" },
  { value: 5, label: "Maio" },
  { value: 6, label: "Junho" },
  { value: 7, label: "Julho" },
  { value: 8, label: "Agosto" },
  { value: 9, label: "Setembro" },
  { value: 10, label: "Outubro" },
  { value: 11, label: "Novembro" },
  { value: 12, label: "Dezembro" },
] as const

function monthLabel(month: number | undefined): string {
  return MONTH_OPTIONS.find((m) => m.value === month)?.label ?? "—"
}

function formatDueLabel(fee: CompanyExpense): string {
  if (fee.billingPeriod === "vitalicio") return "—"
  if (fee.billingPeriod === "anual") {
    return `${monthLabel(fee.dueMonth)}, dia ${fee.dueDate}`
  }
  return `Dia ${fee.dueDate}`
}

const INITIAL_FEES: CompanyExpense[] = []

function resolveFeeCurrency(fee: CompanyExpense): FeeCurrency {
  if (fee.currency) return fee.currency
  return Number(fee.valueUsd) > 0 ? "usd" : "brl"
}

function getEffectiveBrl(fee: CompanyExpense, rate: number): number {
  if (resolveFeeCurrency(fee) === "brl") {
    return Number(fee.valueBrl) || 0
  }
  const usd = Number(fee.valueUsd)
  if (usd > 0) return convertUsdToBrl(usd, rate)
  return Number(fee.valueBrl) || 0
}

/** Valor equivalente mensal para totais recorrentes (anual ÷ 12; vitalício não entra). */
function monthlyEquivalentUsd(fee: CompanyExpense): number {
  if (resolveFeeCurrency(fee) !== "usd") return 0
  const usd = Number(fee.valueUsd)
  if (!Number.isFinite(usd) || usd <= 0) return 0
  switch (fee.billingPeriod) {
    case "anual":
      return usd / 12
    case "vitalicio":
      return 0
    default:
      return usd
  }
}

function monthlyEquivalentBrl(fee: CompanyExpense, rate: number): number {
  const brl = getEffectiveBrl(fee, rate)
  if (brl <= 0) return 0
  switch (fee.billingPeriod) {
    case "anual":
      return brl / 12
    case "vitalicio":
      return 0
    default:
      return brl
  }
}

function formatQuoteTime(iso: string | null | undefined): string | null {
  if (!iso) return null
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return null
  return date.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })
}

async function fetchCompanyExpenses(): Promise<CompanyExpense[]> {
  try {
    const res = await fetch(EXPENSES_API, { credentials: "include", cache: "no-store" })
    if (res.ok) {
      const rows = (await res.json()) as CompanyExpenseRow[]
      writeCompanyExpensesToStorage(rows)
      return rows.map(mapExpenseRow)
    }
  } catch {
    // fallback abaixo
  }
  return readCompanyExpensesFromStorage().map(mapExpenseRow)
}

function persistExpensesLocally(expenses: CompanyExpense[]) {
  writeCompanyExpensesToStorage(expenses.map(mapExpenseToRow))
}

export default function GastoEmpresaPage() {
  const { isAdmin } = useAuth()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState<FeeFormData>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  const {
    data: fees = INITIAL_FEES,
    mutate,
    isLoading: feesLoading,
  } = useSWR<CompanyExpense[]>(isAdmin ? EXPENSES_API : null, fetchCompanyExpenses, {
    revalidateOnFocus: true,
    dedupingInterval: 3000,
  })

  const {
    data: quote,
    isLoading: quoteLoading,
    mutate: refreshQuote,
  } = useSWR<UsdBrlQuote>(
    "usd-brl-rate",
    async () => {
      const res = await fetch("/api/exchange/usd-brl", { credentials: "include", cache: "no-store" })
      if (!res.ok) throw new Error("Cotação indisponível")
      return res.json() as Promise<UsdBrlQuote>
    },
    { refreshInterval: 15 * 60 * 1000, revalidateOnFocus: true },
  )

  const usdRate = quote?.rate ?? USD_BRL_FALLBACK_RATE

  const categories = ["FERRAMENTAS DE CRIAÇÃO", "DOMÍNIOS E HOSPEDAGENS"]

  useEffect(() => {
    if (formData.currency !== "usd" || formData.valueUsd <= 0) return
    const converted = convertUsdToBrl(formData.valueUsd, usdRate)
    setFormData((prev) => (prev.valueBrl === converted ? prev : { ...prev, valueBrl: converted }))
  }, [usdRate, formData.valueUsd, formData.currency])

  const resetForm = useCallback(() => {
    setFormData(EMPTY_FORM)
    setEditingId(null)
  }, [])

  const openAddDialog = () => {
    resetForm()
    setIsDialogOpen(true)
  }

  const openEditDialog = (fee: CompanyExpense) => {
    const currency = resolveFeeCurrency(fee)
    setEditingId(fee.id)
    setFormData({
      name: fee.name,
      category: fee.category,
      currency,
      valueUsd: currency === "usd" ? fee.valueUsd : 0,
      valueBrl: currency === "brl" ? fee.valueBrl : getEffectiveBrl(fee, usdRate),
      dueDate: fee.dueDate,
      dueMonth: fee.dueMonth ?? 1,
      billingPeriod: fee.billingPeriod ?? "mensal",
      notes: fee.notes ?? "",
    })
    setIsDialogOpen(true)
  }

  const handleDialogChange = (open: boolean) => {
    setIsDialogOpen(open)
    if (!open) resetForm()
  }

  const handleSaveFee = async () => {
    if (!formData.name) {
      alert("Por favor, preencha o nome da ferramenta/serviço")
      return
    }
    if (formData.currency === "usd" && formData.valueUsd <= 0) {
      alert("Por favor, informe o valor em USD")
      return
    }
    if (formData.currency === "brl" && formData.valueBrl <= 0) {
      alert("Por favor, informe o valor em BRL")
      return
    }
    if (formData.billingPeriod === "anual" && (formData.dueMonth < 1 || formData.dueMonth > 12)) {
      alert("Selecione o mês de vencimento")
      return
    }

    const isUsd = formData.currency === "usd"
    const valueUsd = isUsd ? formData.valueUsd : 0
    const valueBrl = isUsd ? convertUsdToBrl(formData.valueUsd, usdRate) : formData.valueBrl

    const expense: CompanyExpense = {
      id: editingId ?? "",
      name: formData.name,
      category: formData.category,
      currency: formData.currency,
      valueUsd,
      valueBrl,
      dueDate: formData.billingPeriod === "vitalicio" ? 0 : formData.dueDate,
      dueMonth: formData.billingPeriod === "anual" ? formData.dueMonth : undefined,
      billingPeriod: formData.billingPeriod,
      notes: formData.notes,
    }

    setSaving(true)
    try {
      const res = await fetch(EXPENSES_API, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingId || undefined,
          name: expense.name,
          category: expense.category,
          currency: expense.currency,
          value_usd: expense.valueUsd,
          value_brl: expense.valueBrl,
          due_date: expense.dueDate,
          due_month: expense.dueMonth ?? null,
          billing_period: expense.billingPeriod,
          notes: expense.notes ?? null,
        }),
      })
      const json = (await res.json().catch(() => ({}))) as CompanyExpenseRow & { error?: string }
      if (!res.ok) throw new Error(json.error || "Erro ao salvar gasto")

      const saved = mapExpenseRow(json)
      await mutate(
        (prev) => {
          const list = prev ?? []
          const next = editingId
            ? list.map((f) => (f.id === editingId ? saved : f))
            : [...list, saved]
          persistExpensesLocally(next)
          return next
        },
        { revalidate: false },
      )
      toast.success(editingId ? "Gasto atualizado" : "Gasto salvo")
      resetForm()
      setIsDialogOpen(false)
    } catch (err) {
      const fallbackId = editingId ?? crypto.randomUUID()
      const saved: CompanyExpense = { ...expense, id: fallbackId }
      await mutate(
        (prev) => {
          const list = prev ?? []
          const next = editingId
            ? list.map((f) => (f.id === editingId ? saved : f))
            : [...list, saved]
          persistExpensesLocally(next)
          return next
        },
        { revalidate: false },
      )
      toast.warning(
        err instanceof Error ? err.message : "Salvo localmente — banco indisponível no momento.",
      )
      resetForm()
      setIsDialogOpen(false)
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteFee = async (id: string) => {
    if (!confirm("Remover este gasto?")) return

    try {
      const res = await fetch(`${EXPENSES_API}?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
        credentials: "include",
      })
      if (!res.ok) {
        const json = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(json.error || "Erro ao remover")
      }
      await mutate(
        (prev) => {
          const next = (prev ?? []).filter((fee) => fee.id !== id)
          persistExpensesLocally(next)
          return next
        },
        { revalidate: false },
      )
      toast.success("Gasto removido")
    } catch (err) {
      await mutate(
        (prev) => {
          const next = (prev ?? []).filter((fee) => fee.id !== id)
          persistExpensesLocally(next)
          return next
        },
        { revalidate: false },
      )
      toast.warning(err instanceof Error ? err.message : "Removido localmente")
    }
  }

  const feesForDisplay = useMemo(
    () =>
      fees.map((f) => ({
        ...f,
        currency: resolveFeeCurrency(f),
        valueBrl: getEffectiveBrl(f, usdRate),
        billingPeriod: f.billingPeriod ?? "mensal",
      })),
    [fees, usdRate],
  )

  const totalUsd = feesForDisplay.reduce((sum, fee) => sum + monthlyEquivalentUsd(fee), 0)
  const totalBrl = feesForDisplay.reduce((sum, fee) => sum + monthlyEquivalentBrl(fee, usdRate), 0)
  const oneTimeUsd = feesForDisplay
    .filter((f) => f.billingPeriod === "vitalicio" && f.currency === "usd")
    .reduce((sum, fee) => sum + fee.valueUsd, 0)
  const oneTimeBrl = feesForDisplay
    .filter((f) => f.billingPeriod === "vitalicio")
    .reduce((sum, fee) => sum + fee.valueBrl, 0)

  const groupedFees = categories.map((cat) => ({
    category: cat,
    items: feesForDisplay.filter((f) => f.category === cat),
  }))

  if (!isAdmin) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-lg text-muted-foreground">Acesso restrito a administradores</p>
      </div>
    )
  }

  return (
    <div className="space-y-4 p-4 sm:space-y-6 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Gastos da Empresa</h1>
          <p className="mt-1 text-sm text-muted-foreground sm:mt-2">
            Gerencie os custos de ferramentas, domínios e hospedagens
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={handleDialogChange}>
          <DialogTrigger asChild>
            <Button className="w-full gap-2 sm:w-auto" onClick={openAddDialog}>
              <Plus className="h-4 w-4" />
              Adicionar Gasto
            </Button>
          </DialogTrigger>
          <DialogContent className="flex max-h-[min(96dvh,720px)] flex-col overflow-hidden p-0 sm:max-w-lg">
            <DialogHeader className="shrink-0 border-b border-border px-4 py-3 sm:px-6">
              <DialogTitle>{editingId ? "Editar Gasto" : "Adicionar Novo Gasto"}</DialogTitle>
              <DialogDescription>
                {editingId ? "Atualize os dados do gasto" : "Preencha os dados do gasto"}
              </DialogDescription>
            </DialogHeader>
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6">
              <div>
                <Label htmlFor="name">Nome da Ferramenta/Serviço</Label>
                <Input
                  id="name"
                  placeholder="Ex: v0 by Vercel"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="category">Categoria</Label>
                <select
                  id="category"
                  title="Categoria do gasto"
                  aria-label="Categoria do gasto"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-foreground"
                >
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="billingPeriod">Periodicidade do pagamento</Label>
                <select
                  id="billingPeriod"
                  title="Periodicidade do pagamento"
                  aria-label="Periodicidade do pagamento"
                  value={formData.billingPeriod}
                  onChange={(e) =>
                    setFormData({ ...formData, billingPeriod: e.target.value as BillingPeriod })
                  }
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-foreground"
                >
                  {(Object.keys(BILLING_LABELS) as BillingPeriod[]).map((key) => (
                    <option key={key} value={key}>
                      {BILLING_LABELS[key]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="currency">Moeda do valor</Label>
                <select
                  id="currency"
                  title="Moeda do valor"
                  aria-label="Moeda do valor"
                  value={formData.currency}
                  onChange={(e) => {
                    const currency = e.target.value as FeeCurrency
                    setFormData({
                      ...formData,
                      currency,
                      valueUsd: currency === "usd" ? formData.valueUsd : 0,
                      valueBrl: currency === "brl" ? formData.valueBrl : 0,
                    })
                  }}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-foreground"
                >
                  {(Object.keys(CURRENCY_LABELS) as FeeCurrency[]).map((key) => (
                    <option key={key} value={key}>
                      {CURRENCY_LABELS[key]}
                    </option>
                  ))}
                </select>
              </div>
              {formData.currency === "usd" ? (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="valueUsd">Valor (USD)</Label>
                    <Input
                      id="valueUsd"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={formData.valueUsd || ""}
                      onChange={(e) => {
                        const usd = parseFloat(e.target.value) || 0
                        setFormData({
                          ...formData,
                          valueUsd: usd,
                          valueBrl: convertUsdToBrl(usd, usdRate),
                        })
                      }}
                    />
                  </div>
                  <div>
                    <Label htmlFor="valueBrl">Valor (BRL) — cotação ao vivo</Label>
                    <Input
                      id="valueBrl"
                      type="number"
                      step="0.01"
                      readOnly
                      tabIndex={-1}
                      className="cursor-default bg-muted/40"
                      value={formData.valueBrl || ""}
                    />
                    <p className="mt-1 text-[10px] text-muted-foreground">
                      1 USD = R$ {usdRate.toFixed(4)}
                      {quoteLoading ? " · atualizando..." : ""}
                    </p>
                  </div>
                </div>
              ) : (
                <div>
                  <Label htmlFor="valueBrlOnly">Valor (BRL)</Label>
                  <Input
                    id="valueBrlOnly"
                    type="number"
                    step="0.01"
                    placeholder="0,00"
                    value={formData.valueBrl || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, valueBrl: parseFloat(e.target.value) || 0 })
                    }
                  />
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    Gasto cobrado diretamente em reais, sem conversão de dólar.
                  </p>
                </div>
              )}
              {formData.billingPeriod !== "vitalicio" && (
                formData.billingPeriod === "anual" ? (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="dueMonth">Mês do vencimento</Label>
                      <select
                        id="dueMonth"
                        title="Mês do vencimento"
                        aria-label="Mês do vencimento"
                        value={formData.dueMonth}
                        onChange={(e) =>
                          setFormData({ ...formData, dueMonth: parseInt(e.target.value, 10) || 1 })
                        }
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-foreground"
                      >
                        {MONTH_OPTIONS.map((month) => (
                          <option key={month.value} value={month.value}>
                            {month.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <Label htmlFor="dueDate">Dia do vencimento</Label>
                      <Input
                        id="dueDate"
                        type="number"
                        min="1"
                        max="31"
                        placeholder="15"
                        value={formData.dueDate}
                        onChange={(e) =>
                          setFormData({ ...formData, dueDate: parseInt(e.target.value, 10) || 1 })
                        }
                      />
                    </div>
                  </div>
                ) : (
                  <div>
                    <Label htmlFor="dueDate">Dia do Vencimento</Label>
                    <Input
                      id="dueDate"
                      type="number"
                      min="1"
                      max="31"
                      placeholder="25"
                      value={formData.dueDate}
                      onChange={(e) => setFormData({ ...formData, dueDate: parseInt(e.target.value, 10) || 1 })}
                    />
                  </div>
                )
              )}
              <div>
                <Label htmlFor="notes">Notas (Opcional)</Label>
                <Input
                  id="notes"
                  placeholder="Observações adicionais"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                />
              </div>
            </div>
            <div className="shrink-0 border-t border-border px-4 py-3 sm:px-6">
              <Button onClick={handleSaveFee} disabled={saving} className="w-full">
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : editingId ? (
                  "Salvar alterações"
                ) : (
                  "Adicionar Gasto"
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Resumo compacto */}
      <div className="grid grid-cols-2 gap-2 sm:gap-3">
        <div className="rounded-lg border border-primary/20 bg-card px-3 py-2">
          <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Total USD</p>
          <p className="text-lg font-bold leading-tight text-primary sm:text-xl">US ${totalUsd.toFixed(2)}</p>
          <p className="text-[10px] text-muted-foreground">Equiv. mensal</p>
        </div>
        <div className="rounded-lg border border-primary/20 bg-card px-3 py-2">
          <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Total BRL</p>
          <p className="text-lg font-bold leading-tight text-primary sm:text-xl">R$ {totalBrl.toFixed(2)}</p>
          <p className="text-[10px] text-muted-foreground">Equiv. mensal</p>
        </div>
      </div>
      {(oneTimeUsd > 0 || oneTimeBrl > 0) && (
        <p className="text-xs text-muted-foreground">
          Pagamentos únicos (vitalício): US ${oneTimeUsd.toFixed(2)} · R$ {oneTimeBrl.toFixed(2)}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span>
          Cotação USD/BRL: <strong className="text-foreground">R$ {usdRate.toFixed(4)}</strong>
          {quote?.source && quote.source !== "fallback" ? ` · ${quote.source}` : quote?.source === "fallback" ? " · estimativa" : ""}
          {formatQuoteTime(quote?.updatedAt) ? ` · ${formatQuoteTime(quote?.updatedAt)}` : ""}
        </span>
        <button
          type="button"
          onClick={() => refreshQuote()}
          className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-0.5 text-[11px] hover:bg-secondary"
          title="Atualizar cotação"
        >
          <RefreshCw className={cn("h-3 w-3", quoteLoading && "animate-spin")} />
          Atualizar
        </button>
      </div>

      {/* Cards por Categoria */}
      <div className="space-y-5 sm:space-y-6">
        {feesLoading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            Carregando gastos...
          </div>
        ) : (
        groupedFees.map((group) => (
          <div key={group.category}>
            <h2 className="mb-3 text-lg font-semibold sm:mb-4 sm:text-xl">🛠️ {group.category}</h2>
            {group.items.length === 0 ? (
              <Card>
                <CardContent className="pt-6 text-center text-muted-foreground">
                  Nenhum gasto cadastrado nesta categoria
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3 md:gap-4">
                {group.items.map((fee) => (
                  <Card key={fee.id} className="overflow-hidden transition-shadow hover:shadow-lg">
                    <CardHeader className="pb-2 pt-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <CardTitle className="text-base leading-snug">{fee.name}</CardTitle>
                          {fee.notes && <CardDescription className="mt-1 text-xs">{fee.notes}</CardDescription>}
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                          <button
                            type="button"
                            onClick={() => openEditDialog(fee)}
                            className="rounded-md p-1.5 text-primary hover:bg-primary/10"
                            title="Editar gasto"
                            aria-label="Editar gasto"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteFee(fee.id)}
                            className="rounded-md p-1.5 text-destructive hover:bg-destructive/10"
                            title="Deletar gasto"
                            aria-label="Deletar gasto"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2 pb-4">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Pagamento:</span>
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 text-xs font-medium",
                            fee.billingPeriod === "mensal" && "bg-primary/10 text-primary",
                            fee.billingPeriod === "anual" && "bg-amber-500/10 text-amber-700 dark:text-amber-400",
                            fee.billingPeriod === "vitalicio" && "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
                          )}
                        >
                          {BILLING_LABELS[fee.billingPeriod]}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Moeda:</span>
                        <span className="text-xs font-medium">{CURRENCY_LABELS[fee.currency]}</span>
                      </div>
                      {fee.currency === "usd" && (
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Valor USD:</span>
                          <span className="font-semibold">US ${Number(fee.valueUsd).toFixed(2)}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Valor BRL:</span>
                        <span className="font-semibold">R$ {fee.valueBrl.toFixed(2)}</span>
                      </div>
                      {fee.billingPeriod === "anual" && (
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Equiv. mensal:</span>
                          <span>
                            {fee.currency === "usd" ? `US $${monthlyEquivalentUsd(fee).toFixed(2)} · ` : ""}
                            R$ {monthlyEquivalentBrl(fee, usdRate).toFixed(2)}
                          </span>
                        </div>
                      )}
                      {fee.billingPeriod !== "vitalicio" && (
                        <div className="flex justify-between border-t pt-2 text-sm">
                          <span className="text-muted-foreground">Vencimento:</span>
                          <span className="font-semibold text-right">{formatDueLabel(fee)}</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        ))
        )}
      </div>
    </div>
  )
}
