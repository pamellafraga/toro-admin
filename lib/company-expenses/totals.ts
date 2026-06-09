import type { CompanyExpense } from "@/lib/company-expenses/map-expense"
import { convertUsdToBrl } from "@/lib/exchange/usd-brl"
import { COMPANY_EXPENSES_START_MONTH, COMPANY_EXPENSES_START_YEAR } from "@/lib/company-expenses/month-options"

export type FeeCurrency = "usd" | "brl"

export type YearMonth = { year: number; month: number }

export function parseYearMonth(value: string): YearMonth | null {
  const [y, m] = value.split("-").map((v) => Number(v))
  if (!y || !m || m < 1 || m > 12) return null
  return { year: y, month: m }
}

function isMonthOnOrAfter(target: YearMonth, start: YearMonth): boolean {
  return target.year > start.year || (target.year === start.year && target.month >= start.month)
}

function getExpenseStartYearMonth(fee: CompanyExpense): YearMonth {
  if (fee.createdAt) {
    const d = new Date(fee.createdAt)
    if (!Number.isNaN(d.getTime())) {
      return { year: d.getFullYear(), month: d.getMonth() + 1 }
    }
  }
  return { year: COMPANY_EXPENSES_START_YEAR, month: COMPANY_EXPENSES_START_MONTH }
}

/** Gasto entra no total do mês selecionado (mensal todo mês; anual no mês de vencimento; vitalício só no cadastro). */
export function expenseAppliesToMonth(fee: CompanyExpense, filter: YearMonth): boolean {
  const start = getExpenseStartYearMonth(fee)
  if (!isMonthOnOrAfter(filter, start)) return false

  switch (fee.billingPeriod) {
    case "mensal":
      return true
    case "anual":
      return (fee.dueMonth ?? 1) === filter.month
    case "vitalicio":
      return start.year === filter.year && start.month === filter.month
    default:
      return false
  }
}

function monthSpendUsd(fee: CompanyExpense, rate: number): number {
  if (resolveFeeCurrency(fee) === "usd") return Number(fee.valueUsd) || 0
  const brl = Number(fee.valueBrl) || 0
  return rate > 0 ? brl / rate : 0
}

function resolveFeeCurrency(fee: CompanyExpense): FeeCurrency {
  if (fee.currency) return fee.currency
  return Number(fee.valueUsd) > 0 ? "usd" : "brl"
}

/** Valor em BRL para exibição (prioriza BRL salvo; senão converte USD na cotação). */
export function getEffectiveBrl(fee: CompanyExpense, rate: number): number {
  if (resolveFeeCurrency(fee) === "brl") {
    return Number(fee.valueBrl) || 0
  }
  const storedBrl = Number(fee.valueBrl)
  if (storedBrl > 0) return storedBrl
  const usd = Number(fee.valueUsd)
  if (usd > 0) return convertUsdToBrl(usd, rate)
  return 0
}

/** Equivalente mensal em BRL (anual ÷ 12; vitalício não entra no recorrente). */
export function monthlyEquivalentBrl(fee: CompanyExpense, rate: number): number {
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

/** Equivalente mensal em USD — inclui gastos em BRL convertidos. */
export function monthlyEquivalentUsd(fee: CompanyExpense, rate: number): number {
  if (rate <= 0) return 0
  return monthlyEquivalentBrl(fee, rate) / rate
}

export function sumMonthlyTotals(fees: CompanyExpense[], rate: number) {
  const totalBrl = fees.reduce((sum, fee) => sum + monthlyEquivalentBrl(fee, rate), 0)
  const totalUsd = fees.reduce((sum, fee) => sum + monthlyEquivalentUsd(fee, rate), 0)
  return { totalBrl, totalUsd }
}

/** Total efetivamente pago no mês (não equivalente — valor real da fatura naquele mês). */
export function sumMonthSpend(fees: CompanyExpense[], yearMonth: string, rate: number) {
  const filter = parseYearMonth(yearMonth)
  if (!filter) return { totalBrl: 0, totalUsd: 0, items: [] as CompanyExpense[] }

  const items = fees.filter((fee) => expenseAppliesToMonth(fee, filter))
  const totalBrl = items.reduce((sum, fee) => sum + getEffectiveBrl(fee, rate), 0)
  const totalUsd = items.reduce((sum, fee) => sum + monthSpendUsd(fee, rate), 0)
  return { totalBrl, totalUsd, items }
}

export function sumOneTimeTotals(fees: CompanyExpense[], rate: number) {
  const vitalicio = fees.filter((f) => f.billingPeriod === "vitalicio")
  const oneTimeBrl = vitalicio.reduce((sum, fee) => sum + getEffectiveBrl(fee, rate), 0)
  const oneTimeUsd = vitalicio.reduce((sum, fee) => {
    if (resolveFeeCurrency(fee) === "usd") return sum + (Number(fee.valueUsd) || 0)
    const brl = Number(fee.valueBrl) || 0
    return sum + (rate > 0 ? brl / rate : 0)
  }, 0)
  return { oneTimeBrl, oneTimeUsd }
}

export { resolveFeeCurrency }
