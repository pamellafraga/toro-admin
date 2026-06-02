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
