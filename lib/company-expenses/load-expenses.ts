import type { CompanyExpenseRow } from "@/lib/db/repositories/company-expenses.repository"
import {
  mapExpenseRow,
  mapExpenseToRow,
  type CompanyExpense,
} from "@/lib/company-expenses/map-expense"
import {
  readCompanyExpensesFromStorage,
  writeCompanyExpensesToStorage,
} from "@/lib/company-expenses/storage"

export const EXPENSES_API = "/api/admin/company-expenses"

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function isExpenseUuid(id: string): boolean {
  return UUID_RE.test(id)
}

function expenseToApiBody(expense: CompanyExpense, includeId: boolean) {
  return {
    id: includeId && isExpenseUuid(expense.id) ? expense.id : undefined,
    name: expense.name,
    category: expense.category,
    currency: expense.currency,
    value_usd: expense.valueUsd,
    value_brl: expense.valueBrl,
    due_date: expense.dueDate,
    due_month: expense.dueMonth ?? null,
    billing_period: expense.billingPeriod,
    notes: expense.notes ?? null,
  }
}

export async function syncExpensesToApi(expenses: CompanyExpense[]): Promise<CompanyExpense[]> {
  const synced: CompanyExpense[] = []

  for (const expense of expenses) {
    try {
      const res = await fetch(EXPENSES_API, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(expenseToApiBody(expense, true)),
      })
      if (!res.ok) continue
      const row = (await res.json()) as CompanyExpenseRow
      synced.push(mapExpenseRow(row))
    } catch {
      // continua com os próximos
    }
  }

  return synced
}

export type LoadExpensesResult = {
  expenses: CompanyExpense[]
  restoredFromDevice: boolean
  syncedToDatabase: boolean
}

/** Carrega gastos sem apagar backup local quando o banco está vazio. */
export async function loadCompanyExpenses(): Promise<LoadExpensesResult> {
  const local = readCompanyExpensesFromStorage().map(mapExpenseRow)

  try {
    const res = await fetch(EXPENSES_API, { credentials: "include", cache: "no-store" })
    if (!res.ok) {
      return { expenses: local, restoredFromDevice: local.length > 0, syncedToDatabase: false }
    }

    const rows = (await res.json()) as CompanyExpenseRow[]
    if (!Array.isArray(rows)) {
      return { expenses: local, restoredFromDevice: local.length > 0, syncedToDatabase: false }
    }

    const fromApi = rows.map(mapExpenseRow)

    if (fromApi.length > 0) {
      writeCompanyExpensesToStorage(rows)
      return { expenses: fromApi, restoredFromDevice: false, syncedToDatabase: false }
    }

    if (local.length > 0) {
      const synced = await syncExpensesToApi(local)
      if (synced.length > 0) {
        writeCompanyExpensesToStorage(synced.map(mapExpenseToRow))
        return { expenses: synced, restoredFromDevice: true, syncedToDatabase: true }
      }
      return { expenses: local, restoredFromDevice: true, syncedToDatabase: false }
    }

    return { expenses: [], restoredFromDevice: false, syncedToDatabase: false }
  } catch {
    return { expenses: local, restoredFromDevice: local.length > 0, syncedToDatabase: false }
  }
}

export function persistExpensesLocally(expenses: CompanyExpense[]) {
  writeCompanyExpensesToStorage(expenses.map(mapExpenseToRow))
}
