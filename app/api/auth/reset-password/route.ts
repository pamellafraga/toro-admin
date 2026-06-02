import { NextRequest } from "next/server"
import { hashPassword } from "@/lib/api/auth"
import { handleApiError, jsonError, jsonOk } from "@/lib/api/response"
import { findUserByUsername, updateUserPassword } from "@/lib/db/repositories/dashboard-users.repository"
import {
  deleteResetCode,
  findValidResetCode,
} from "@/lib/db/repositories/password-reset.repository"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const username = String(body.username ?? "").trim()
    const code = String(body.code ?? "").trim()
    const newPassword = String(body.newPassword ?? "")

    if (!username) return jsonError("Usuário é obrigatório.", 400)
    if (!code) return jsonError("Código é obrigatório.", 400)
    if (!newPassword || newPassword.length < 6) {
      return jsonError("Nova senha deve ter no mínimo 6 caracteres.", 400)
    }

    const row = await findValidResetCode(username, code)
    if (!row) {
      return jsonError("Código inválido ou expirado. Solicite um novo código.", 400)
    }

    const expiresAt = new Date(row.expires_at)
    if (expiresAt.getTime() < Date.now()) {
      await deleteResetCode(row.id)
      return jsonError("Código expirado. Solicite um novo código.", 400)
    }

    const user = await findUserByUsername(username)
    if (!user) return jsonError("Usuário não encontrado.", 404)

    await updateUserPassword(user.id, hashPassword(newPassword))
    await deleteResetCode(row.id)

    return jsonOk({
      success: true,
      message: "Senha alterada com sucesso. Faça login com a nova senha.",
    })
  } catch (e) {
    console.error("reset-password:", e)
    return handleApiError(e, "Erro ao redefinir senha.")
  }
}
