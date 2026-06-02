import { NextRequest } from "next/server"
import { handleApiError, jsonError, jsonOk } from "@/lib/api/response"
import { findUserByUsername } from "@/lib/db/repositories/dashboard-users.repository"
import {
  deleteResetCodesByUsername,
  insertResetCode,
} from "@/lib/db/repositories/password-reset.repository"
import { getEmailForUsername } from "@/lib/password-reset-email-map"
import { sendPasswordResetCode } from "@/lib/send-email"

const CODE_EXPIRY_MINUTES = 15

function generateCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000))
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const username = String(body.username ?? "").trim()
    if (!username) return jsonError("Informe o usuário.", 400)

    const user = await findUserByUsername(username)
    if (!user) {
      return jsonOk({
        success: true,
        message: "Se o usuário estiver cadastrado, você receberá o código em instantes.",
      })
    }

    const sendToEmail = user.email?.trim() || getEmailForUsername(username)
    if (!sendToEmail) {
      return jsonOk({
        success: true,
        message: "Se o usuário estiver cadastrado, você receberá o código em instantes.",
      })
    }

    const code = generateCode()
    const expiresAt = new Date(Date.now() + CODE_EXPIRY_MINUTES * 60 * 1000)

    await deleteResetCodesByUsername(user.username)
    await insertResetCode({
      username: user.username,
      email: sendToEmail,
      code,
      expires_at: expiresAt,
    })

    const { ok, error } = await sendPasswordResetCode({
      to: sendToEmail,
      code,
      userName: user.display_name,
    })

    if (!ok) {
      console.error("Erro ao enviar código por e-mail:", error)
      return jsonError(
        "Não foi possível enviar o e-mail. Verifique RESEND_API_KEY e tente novamente.",
        503,
      )
    }

    return jsonOk({
      success: true,
      message: "Se o usuário estiver cadastrado, você receberá o código em instantes.",
    })
  } catch (e) {
    console.error("forgot-password:", e)
    return handleApiError(e, "Erro ao processar solicitação.")
  }
}
