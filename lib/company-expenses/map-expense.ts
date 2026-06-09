import type { CompanyExpenseRow } from "@/lib/db/repositories/company-expenses.repository"

export type BillingPeriod = "mensal" | "anual" | "vitalicio"
export type FeeCurrency = "usd" | "brl"

export type CompanyExpense = {
  id: string
  name: string
  category: string
  currency: FeeCurrency
  valueUsd: number
  valueBrl: number
  dueDate: number
  dueMonth?: number
  billingPeriod: BillingPeriod
  notes?: string
  createdAt?: string
}

export function mapExpenseRow(row: CompanyExpenseRow): CompanyExpense {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    currency: row.currency,
    valueUsd: Number(row.value_usd) || 0,
    valueBrl: Number(row.value_brl) || 0,
    dueDate: Number(row.due_date) || 0,
    dueMonth: row.due_month ?? undefined,
    billingPeriod: row.billing_period,
    notes: row.notes ?? undefined,
    createdAt: row.created_at,
  }
}

export function mapExpenseToRow(expense: CompanyExpense): CompanyExpenseRow {
  return {
    id: expense.id,
    name: expense.name,
    category: expense.category,
    currency: expense.currency,
    value_usd: expense.valueUsd,
    value_brl: expense.valueBrl,
    due_date: expense.dueDate,
    due_month: expense.billingPeriod === "anual" ? expense.dueMonth ?? null : null,
    billing_period: expense.billingPeriod,
    notes: expense.notes ?? null,
    created_at: expense.createdAt,
  }
}
