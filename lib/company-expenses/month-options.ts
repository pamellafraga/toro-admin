/** Gastos da empresa — histórico a partir de fevereiro/2026 */
export const COMPANY_EXPENSES_START_YEAR = 2026
export const COMPANY_EXPENSES_START_MONTH = 2 // fevereiro (1-based)

export function buildExpenseMonthOptions(now = new Date()): { value: string; label: string }[] {
  const opts: { value: string; label: string }[] = []
  const start = new Date(COMPANY_EXPENSES_START_YEAR, COMPANY_EXPENSES_START_MONTH - 1, 1)
  const end = new Date(now.getFullYear(), now.getMonth(), 1)
  for (let d = new Date(start); d <= end; d.setMonth(d.getMonth() + 1)) {
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
    const label = d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })
    opts.push({ value, label: label.charAt(0).toUpperCase() + label.slice(1) })
  }
  return opts
}
