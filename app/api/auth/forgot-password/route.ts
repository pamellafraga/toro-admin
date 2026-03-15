import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { sendPasswordResetCode } from "@/lib/send-email"
import { getEmailForUsername } from "@/lib/password-reset-email-map"

const CODE_EXPIRY_MINUTES = 15

function generateCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000))
}

/**
 * POST /api/auth/forgot-password
 * Body: { username: string }
 * Envia código para o e-mail interno do usuário (mapeamento fixo). Não expõe e-mails.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const username = String(body.username ?? "").trim()
    if (!username) {
      return NextResponse.json({ error: "Informe o usuário." }, { status: 400 })
    }

    const supabase = createAdminClient()
    const { data: user } = await supabase
      .from("dashboard_users")
      .select("id, display_name, username, email")
      .ilike("username", username)
      .limit(1)
      .maybeSingle()

    if (!user) {
      return NextResponse.json({
        success: true,
        message: "Se o usuário estiver cadastrado, você receberá o código em instantes.",
      })
    }

    const dbEmail = (user as { email?: string | null }).email?.trim()
    const sendToEmail = dbEmail || getEmailForUsername(username)
    if (!sendToEmail) {
      return NextResponse.json({
        success: true,
        message: "Se o usuário estiver cadastrado, você receberá o código em instantes.",
      })
    }

    const code = generateCode()
    const expiresAt = new Date(Date.now() + CODE_EXPIRY_MINUTES * 60 * 1000)

    await supabase.from("password_reset_codes").delete().eq("username", (user as { username: string }).username)
    await supabase.from("password_reset_codes").insert({
      username: (user as { username: string }).username,
      email: sendToEmail,
      code,
      expires_at: expiresAt.toISOString(),
    })

    const { ok, error } = await sendPasswordResetCode({
      to: sendToEmail,
      code,
      userName: (user as { display_name?: string }).display_name,
    })

    if (!ok) {
      console.error("Erro ao enviar código por e-mail:", error)
      return NextResponse.json(
        { error: "Não foi possível enviar o e-mail. Verifique RESEND_API_KEY e tente novamente." },
        { status: 503 }
      )
    }

    return NextResponse.json({
      success: true,
      message: "Se o usuário estiver cadastrado, você receberá o código em instantes.",
    })
  } catch (e) {
    console.error("forgot-password:", e)
    return NextResponse.json({ error: "Erro ao processar solicitação." }, { status: 500 })
  }
}
