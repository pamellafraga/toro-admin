import { NextRequest } from "next/server"
import { hashPassword, setAuthCookie } from "@/lib/api/auth"
import { handleApiError, jsonError, jsonOk } from "@/lib/api/response"
import { findUserByUsername, findUserPasswordHash } from "@/lib/db/repositories/dashboard-users.repository"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const username = String(body.username ?? "").trim()
    const password = String(body.password ?? "")

    if (!username || !password) {
      return jsonError("Usuário e senha são obrigatórios.", 400)
    }

    const user = await findUserByUsername(username)
    if (!user) {
      return jsonError("Credenciais inválidas.", 401)
    }

    const expectedHash = await findUserPasswordHash(user.id)
    const actualHash = hashPassword(password)
    if (!expectedHash || actualHash !== expectedHash) {
      return jsonError("Credenciais inválidas.", 401)
    }

    const response = jsonOk({
      success: true,
      user: user.username,
      displayName: user.display_name,
      role: user.role,
    })

    setAuthCookie(response, {
      user: user.username,
      displayName: user.display_name,
      role: user.role,
    })

    return response
  } catch (e) {
    return handleApiError(e, "Erro ao autenticar.")
  }
}
