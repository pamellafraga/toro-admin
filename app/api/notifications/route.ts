import { NextRequest } from "next/server"
import { isAdmin, isAuthenticated } from "@/lib/api/auth"
import { handleApiError, jsonError, jsonOk, jsonUnauthorized } from "@/lib/api/response"
import { processCompanyExpenseDueReminders } from "@/lib/company-expenses/due-notifications"
import {
  countUnreadNotificationsForRole,
  deleteNotification,
  listNotificationsForRole,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/db/repositories/notifications.repository"

export const dynamic = "force-dynamic"

/** GET /api/notifications — lista notificações visíveis ao usuário */
export async function GET(request: NextRequest) {
  if (!isAuthenticated(request)) return jsonUnauthorized()

  try {
    const admin = isAdmin(request)
    if (admin) {
      await processCompanyExpenseDueReminders()
    }

    const { searchParams } = new URL(request.url)
    if (searchParams.get("count") === "unread") {
      const count = await countUnreadNotificationsForRole(admin)
      return jsonOk({ count })
    }

    const items = await listNotificationsForRole(admin)
    return jsonOk(items)
  } catch (e) {
    return handleApiError(e, "Erro ao carregar notificações.")
  }
}

/** PATCH /api/notifications — marcar como lida(s) */
export async function PATCH(request: NextRequest) {
  if (!isAuthenticated(request)) return jsonUnauthorized()

  try {
    const body = (await request.json()) as { id?: string; all?: boolean }
    const admin = isAdmin(request)

    if (body.all) {
      await markAllNotificationsRead(admin)
      return jsonOk({ success: true })
    }

    if (!body.id) return jsonError("id obrigatório.", 400)
    await markNotificationRead(body.id)
    return jsonOk({ success: true })
  } catch (e) {
    return handleApiError(e, "Erro ao atualizar notificação.")
  }
}

/** DELETE /api/notifications?id= */
export async function DELETE(request: NextRequest) {
  if (!isAuthenticated(request)) return jsonUnauthorized()

  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")
    if (!id) return jsonError("id obrigatório.", 400)
    await deleteNotification(id)
    return jsonOk({ success: true })
  } catch (e) {
    return handleApiError(e, "Erro ao excluir notificação.")
  }
}
