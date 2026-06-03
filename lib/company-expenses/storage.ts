import type { CompanyExpenseRow } from "@/lib/db/repositories/company-expenses.repository"

export const COMPANY_EXPENSES_STORAGE_KEY = "xpress_company_expenses_v1"

export function readCompanyExpensesFromStorage(): CompanyExpenseRow[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(COMPANY_EXPENSES_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as CompanyExpenseRow[]
    return Array.isArray(parsed) ? parsed : []
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
