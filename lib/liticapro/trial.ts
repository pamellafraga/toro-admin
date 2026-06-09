import { LITICAPRO_TRIAL_DAYS } from "@/lib/liticapro/constants"

/** Operação comercial / filtros do dashboard a partir de junho/2026 */
export const DASHBOARD_START_YEAR = 2026
export const DASHBOARD_START_MONTH = 6 // junho (1-based)

export function addDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

/** Fim do teste grátis = data de cadastro + 7 dias */
export function computeTrialEndsAt(registrationDate: Date | string): Date {
  return addDays(new Date(registrationDate), LITICAPRO_TRIAL_DAYS)
}

export function getContractRegistrationDate(contract: {
  created_at?: string | null
  start_date?: string | null
}): Date | null {
  const raw = contract.created_at ?? contract.start_date
  if (!raw) return null
  const d = new Date(raw)
  return Number.isNaN(d.getTime()) ? null : d
}

export function resolveTrialEndsAt(contract: {
  trial_ends_at?: string | null
  created_at?: string | null
  start_date?: string | null
}): Date | null {
  if (contract.trial_ends_at) {
    const d = new Date(contract.trial_ends_at)
    if (!Number.isNaN(d.getTime())) return d
  }
  const registered = getContractRegistrationDate(contract)
  return registered ? computeTrialEndsAt(registered) : null
}

/** Adiciona dias à data de fim do teste (a partir do fim atual ou de hoje, se já expirou). */
export function extendTrialEndsAt(currentEnd: Date | null, extraDays: number): Date {
  const safeDays = Math.max(0, Math.floor(extraDays))
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const base = currentEnd && currentEnd >= today ? new Date(currentEnd) : new Date(today)
  return addDays(base, safeDays)
}

export function isTrialEndDateInFuture(trialEndsAt: Date | string): boolean {
  const end = new Date(trialEndsAt)
  if (Number.isNaN(end.getTime())) return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  end.setHours(0, 0, 0, 0)
  return end >= today
}

/** Contrato ainda em período de teste (data de fim hoje ou no futuro). */
export function isTrialStillActiveByDate(trialEndsAt: Date | string): boolean {
  return isTrialEndDateInFuture(trialEndsAt)
}

export function isTrialLifecycleContract(contract: {
  status?: string | null
  payment_status?: string | null
}): boolean {
  const s = String(contract.status ?? "").toLowerCase().trim()
  const p = String(contract.payment_status ?? "").toLowerCase().trim()
  return s === "trial" || s === "trial_encerrado" || p === "trial" || p === "trial_expirado"
}

/** Define produto e pagamento conforme a data de fim do teste. */
export function resolveTrialStatusesFromEndsAt(trialEndsAt: Date | string): {
  status: "trial" | "trial_encerrado"
  payment_status: "trial" | "trial_expirado"
} {
  if (isTrialStillActiveByDate(trialEndsAt)) {
    return { status: "trial", payment_status: "trial" }
  }
  return { status: "trial_encerrado", payment_status: "trial_expirado" }
}

/** Status exibido/sincronizado com base na data de fim (prioriza a data sobre o banco). */
export function resolveEffectiveTrialStatuses(contract: {
  payment_status?: string | null
  status?: string | null
  trial_ends_at?: string | null
  created_at?: string | null
  start_date?: string | null
}): { status: "trial" | "trial_encerrado"; payment_status: "trial" | "trial_expirado" } | null {
  if (!isTrialLifecycleContract(contract)) return null
  const ends = resolveTrialEndsAt(contract)
  if (!ends) return null
  return resolveTrialStatusesFromEndsAt(ends)
}

export function parseTrialEndsAtInput(value: string): string | null {
  const trimmed = value.trim()
  if (!trimmed) return null
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return new Date(`${trimmed}T12:00:00`).toISOString()
  }
  const d = new Date(trimmed)
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}

export function buildDashboardMonthOptions(now = new Date()): { value: string; label: string }[] {
  const opts: { value: string; label: string }[] = []
  const start = new Date(DASHBOARD_START_YEAR, DASHBOARD_START_MONTH - 1, 1)
  const end = new Date(now.getFullYear(), now.getMonth(), 1)
  for (let d = new Date(start); d <= end; d.setMonth(d.getMonth() + 1)) {
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
    const label = d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })
    opts.push({ value, label: label.charAt(0).toUpperCase() + label.slice(1) })
  }
  return opts
}
