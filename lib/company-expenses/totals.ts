import type { CompanyExpense } from "@/lib/company-expenses/map-expense"
import { convertUsdToBrl } from "@/lib/exchange/usd-brl"

export type FeeCurrency = "usd" | "brl"

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
