import type { CompanyExpenseRow } from "@/lib/db/repositories/company-expenses.repository"

export const COMPANY_EXPENSES_STORAGE_KEY = "xpress_company_expenses_v1"

type LegacyCamelExpense = {
  id?: string
  name?: string
  category?: string
  currency?: string
  valueUsd?: number
  valueBrl?: number
  dueDate?: number
  dueMonth?: number
  billingPeriod?: string
  notes?: string
}

function normalizeLegacyRow(raw: unknown): CompanyExpenseRow | null {
  if (!raw || typeof raw !== "object") return null
  const row = raw as Record<string, unknown>

  if (typeof row.name === "string" && typeof row.category === "string") {
    if ("value_usd" in row || "value_brl" in row) {
      return raw as CompanyExpenseRow
    }

    const legacy = raw as LegacyCamelExpense
    return {
      id: String(legacy.id ?? ""),
      name: legacy.name ?? "",
      category: legacy.category ?? "FERRAMENTAS DE CRIAÇÃO",
      currency: legacy.currency === "brl" ? "brl" : "usd",
      value_usd: Number(legacy.valueUsd) || 0,
      value_brl: Number(legacy.valueBrl) || 0,
      due_date: Number(legacy.dueDate) || 1,
      due_month:
        legacy.billingPeriod === "anual" && legacy.dueMonth
          ? Number(legacy.dueMonth)
          : null,
      billing_period:
        legacy.billingPeriod === "anual" || legacy.billingPeriod === "vitalicio"
          ? legacy.billingPeriod
          : "mensal",
      notes: legacy.notes ?? null,
    }
  }

  return null
}

export function readCompanyExpensesFromStorage(): CompanyExpenseRow[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(COMPANY_EXPENSES_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed
      .map(normalizeLegacyRow)
      .filter((row): row is CompanyExpenseRow => row !== null && Boolean(row.name))
  } catch {
    return []
  }
}

export function writeCompanyExpensesToStorage(rows: CompanyExpenseRow[]): void {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(COMPANY_EXPENSES_STORAGE_KEY, JSON.stringify(rows))
  } catch {
    // ignore quota errors
  }
}
