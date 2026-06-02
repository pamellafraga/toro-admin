import { NextRequest } from "next/server"
import { hashPassword, isAdmin, parseAuthCookie } from "@/lib/api/auth"
import { handleApiError, jsonError, jsonForbidden, jsonOk } from "@/lib/api/response"
import { logActivity } from "@/lib/activity-log"
import { deleteUser, updateUser } from "@/lib/db/repositories/dashboard-users.repository"

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isAdmin(request)) return jsonForbidden("Somente administradores podem editar usuários.")

  const { id } = await params
  if (!id) return jsonError("ID do usuário é obrigatório.", 400)

  try {
    const body = await request.json()
    const display_name = body.display_name != null ? String(body.display_name).trim() : undefined
    const role = body.role != null ? String(body.role).trim() : undefined
    const new_password = body.new_password != null ? String(body.new_password) : undefined
    const email =
      body.email !== undefined
        ? body.email == null || body.email === ""
          ? null
          : String(body.email).trim().toLowerCase()
        : undefined

    if (role !== undefined && role !== "admin" && role !== "comercial")
      return jsonError("Perfil deve ser Administrador ou Comercial.", 400)

    const updates: Record<string, string | null> = {}
    if (display_name !== undefined) {
      updates.display_name = display_name
      updates.username = display_name
    }
    if (role !== undefined) updates.role = role
    if (email !== undefined) updates.email = email
    if (new_password !== undefined && new_password !== "") updates.password_hash = hashPassword(new_password)

    if (Object.keys(updates).length === 0) return jsonError("Nenhum campo para atualizar.", 400)

    const data = await updateUser(id, updates)
    if (!data) return jsonError("Usuário não encontrado.", 404)

    const auth = parseAuthCookie(request)
    await logActivity(
      { displayName: auth?.displayName },
      { action: `Atualizou o usuário ${data.display_name ?? data.username}`, entity_type: "user", entity_id: id },
    )

    return jsonOk(data)
  } catch (e) {
    return handleApiError(e, "Erro ao atualizar usuário.")
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isAdmin(request)) return jsonForbidden("Somente administradores podem remover usuários.")

  const { id } = await params
  if (!id) return jsonError("ID do usuário é obrigatório.", 400)

  try {
    const user = await deleteUser(id)
    const auth = parseAuthCookie(request)
    const name = user?.display_name ?? user?.username ?? "usuário"
    await logActivity({ displayName: auth?.displayName }, { action: `Removeu o usuário ${name}`, entity_type: "user", entity_id: id })
    return new Response(null, { status: 204 })
  } catch (e) {
    return handleApiError(e, "Erro ao remover usuário.")
  }
}
