import { NextRequest } from "next/server"
import { hashPassword, isAdmin, parseAuthCookie } from "@/lib/api/auth"
import { handleApiError, jsonError, jsonForbidden, jsonOk, jsonUnauthorized } from "@/lib/api/response"
import { logActivity } from "@/lib/activity-log"
import {
  createUser,
  findUserByUsername,
  listUsers,
} from "@/lib/db/repositories/dashboard-users.repository"

export async function GET(request: NextRequest) {
  if (!isAdmin(request)) return jsonForbidden("Somente administradores podem acessar.")

  try {
    const data = await listUsers()
    return jsonOk(data)
  } catch (e) {
    return handleApiError(e, "Erro ao listar usuários.")
  }
}

export async function POST(request: NextRequest) {
  const auth = parseAuthCookie(request)
  if (!auth) return jsonUnauthorized()
  if (auth.role !== "admin") return jsonForbidden("Somente administradores podem cadastrar usuários.")

  try {
    const body = await request.json()
    const username = String(body.username ?? "").trim()
    const password = String(body.password ?? "")
    const display_name = String(body.display_name ?? "").trim()
    const role = String(body.role ?? "comercial").trim()
    const email = body.email != null ? String(body.email).trim().toLowerCase() || null : null

    if (!username) return jsonError("Login (username) é obrigatório.", 400)
    if (!password) return jsonError("Senha é obrigatória.", 400)
    if (!display_name) return jsonError("Nome de exibição é obrigatório.", 400)
    if (role !== "admin" && role !== "comercial")
      return jsonError("Perfil deve ser Administrador ou Comercial.", 400)

    const existing = await findUserByUsername(username)
    if (existing) return jsonError("Já existe um usuário com este login.", 400)

    const created = await createUser({
      username,
      password_hash: hashPassword(password),
      role,
      display_name,
      email,
    })

    await logActivity(
      { displayName: auth.displayName },
      { action: `Cadastrou o usuário ${display_name} (${username})`, entity_type: "user", entity_id: created.id },
    )

    return jsonOk(created, 201)
  } catch (e) {
    return handleApiError(e, "Erro ao cadastrar usuário.")
  }
}
