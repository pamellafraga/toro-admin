import { addDays, format } from "date-fns"
import { ptBR } from "date-fns/locale"
import type { CompanyExpenseRow } from "@/lib/db/repositories/company-expenses.repository"
import { listCompanyExpenses } from "@/lib/db/repositories/company-expenses.repository"
import { insertNotificationIfNew } from "@/lib/db/repositories/notifications.repository"

function formatMoney(expense: CompanyExpenseRow): string {
  if (expense.currency === "brl") {
    return `R$ ${Number(expense.value_brl).toFixed(2).replace(".", ",")}`
  }
  const usd = Number(expense.value_usd)
  const brl = Number(expense.value_brl)
  if (usd > 0 && brl > 0) {
    return `US $${usd.toFixed(2)} (R$ ${brl.toFixed(2).replace(".", ",")})`
  }
  return usd > 0 ? `US $${usd.toFixed(2)}` : `R$ ${brl.toFixed(2).replace(".", ",")}`
}

function billingLabel(period: CompanyExpenseRow["billing_period"]): string {
  if (period === "anual") return "anual"
  if (period === "vitalicio") return "vitalício"
  return "mensal"
}

/** Retorna a data de vencimento quando ela cai amanhã. */
export function getTomorrowDueDate(expense: CompanyExpenseRow, today = new Date()): Date | null {
  if (expense.billing_period === "vitalicio" || !expense.due_date) return null

  const tomorrow = addDays(today, 1)
  tomorrow.setHours(12, 0, 0, 0)

  if (expense.billing_period === "mensal") {
    if (tomorrow.getDate() !== expense.due_date) return null
    return tomorrow
  }

  if (expense.billing_period === "anual" && expense.due_month) {
    if (tomorrow.getMonth() + 1 !== expense.due_month || tomorrow.getDate() !== expense.due_date) {
      return null
    }
    return tomorrow
  }

  return null
}

function buildDedupeKey(expense: CompanyExpenseRow, dueDate: Date): string {
  if (expense.billing_period === "anual") {
    return `expense-due:${expense.id}:${format(dueDate, "yyyy-MM-dd")}`
  }
  return `expense-due:${expense.id}:${format(dueDate, "yyyy-MM")}`
}

function buildMessage(expense: CompanyExpenseRow, dueDate: Date): string {
  const valor = formatMoney(expense)
  const tipo = billingLabel(expense.billing_period)
  const quando =
    expense.billing_period === "anual"
      ? format(dueDate, "dd 'de' MMMM", { locale: ptBR })
      : `dia ${expense.due_date}`

  return `${expense.name} — ${valor} (${tipo}). Vencimento ${quando}.`
}

/** Cria notificações admin 1 dia antes do vencimento de cada gasto recorrente. */
export async function processCompanyExpenseDueReminders(today = new Date()): Promise<number> {
  const expenses = await listCompanyExpenses()
  let created = 0

  for (const expense of expenses) {
    const dueDate = getTomorrowDueDate(expense, today)
    if (!dueDate) continue

    const inserted = await insertNotificationIfNew({
      title: "Gasto da empresa — vencimento amanhã",
      message: buildMessage(expense, dueDate),
      type: "warning",
      link: "/dashboard/gastos-empresa",
      audience: "admin",
      dedupe_key: buildDedupeKey(expense, dueDate),
    })

    if (inserted) created++
  }

  return created
}
