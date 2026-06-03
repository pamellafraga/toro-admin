import { NextRequest } from "next/server"
import { isAdmin, isAuthenticated } from "@/lib/api/auth"
import { handleApiError, jsonError, jsonForbidden, jsonOk, jsonUnauthorized } from "@/lib/api/response"
import { processCompanyExpenseDueReminders } from "@/lib/company-expenses/due-notifications"
import {
  deleteCompanyExpense,
  listCompanyExpenses,
  upsertCompanyExpense,
} from "@/lib/db/repositories/company-expenses.repository"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  if (!isAuthenticated(request)) return jsonUnauthorized()
  if (!isAdmin(request)) return jsonForbidden()

  try {
    await processCompanyExpenseDueReminders()
    const data = await listCompanyExpenses()
    return jsonOk(data)
  } catch (e) {
    return handleApiError(e, "Erro ao listar gastos.")
  }
}

export async function POST(request: NextRequest) {
  if (!isAuthenticated(request)) return jsonUnauthorized()
  if (!isAdmin(request)) return jsonForbidden()

  try {
    const body = await request.json()
    const {
      id,
      name,
      category,
      currency,
      value_usd,
      value_brl,
      due_date,
      due_month,
      billing_period,
      notes,
    } = body

    if (!name?.trim()) return jsonError("Nome é obrigatório.", 400)
    if (!category?.trim()) return jsonError("Categoria é obrigatória.", 400)
    if (currency !== "usd" && currency !== "brl") return jsonError("Moeda inválida.", 400)
    if (!["mensal", "anual", "vitalicio"].includes(billing_period)) {
      return jsonError("Periodicidade inválida.", 400)
    }

    const row = await upsertCompanyExpense({
      id: id || undefined,
      name: String(name).trim(),
      category: String(category).trim(),
      currency,
      value_usd: Number(value_usd) || 0,
      value_brl: Number(value_brl) || 0,
      due_date: Number(due_date) || 0,
      due_month: billing_period === "anual" ? Number(due_month) || null : null,
      billing_period,
      notes: notes?.trim() || null,
    })

    return jsonOk(row)
  } catch (e) {
    return handleApiError(e, "Erro ao salvar gasto.")
  }
}

export async function DELETE(request: NextRequest) {
  if (!isAuthenticated(request)) return jsonUnauthorized()
  if (!isAdmin(request)) return jsonForbidden()

  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")
    if (!id) return jsonError("id obrigatório.", 400)
    await deleteCompanyExpense(id)
    return jsonOk({ success: true })
  } catch (e) {
    return handleApiError(e, "Erro ao remover gasto.")
  }
}
