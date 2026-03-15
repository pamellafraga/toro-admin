import { NextRequest, NextResponse } from "next/server"
import { createHash } from "crypto"
import { createAdminClient } from "@/lib/supabase/admin"

function hashPassword(password: string): string {
  return createHash("sha256").update(password).digest("hex")
}

/**
 * POST /api/auth/reset-password
 * Body: { username: string, code: string, newPassword: string }
 * Verifica o código (vinculado ao usuário) e atualiza a senha.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const username = String(body.username ?? "").trim()
    const code = String(body.code ?? "").trim()
    const newPassword = String(body.newPassword ?? "")

    if (!username) return NextResponse.json({ error: "Usuário é obrigatório." }, { status: 400 })
    if (!code) return NextResponse.json({ error: "Código é obrigatório." }, { status: 400 })
    if (!newPassword || newPassword.length < 6) {
      return NextResponse.json({ error: "Nova senha deve ter no mínimo 6 caracteres." }, { status: 400 })
    }

    const supabase = createAdminClient()

    const { data: row } = await supabase
      .from("password_reset_codes")
      .select("id, expires_at, username")
      .ilike("username", username)
      .eq("code", code)
      .limit(1)
      .maybeSingle()

    if (!row) {
      return NextResponse.json(
        { error: "Código inválido ou expirado. Solicite um novo código." },
        { status: 400 }
      )
    }

    const rowUsername = (row as { username?: string }).username
    const expiresAt = new Date((row as { expires_at: string }).expires_at)
    if (expiresAt.getTime() < Date.now()) {
      await supabase.from("password_reset_codes").delete().eq("id", (row as { id: string }).id)
      return NextResponse.json(
        { error: "Código expirado. Solicite um novo código." },
        { status: 400 }
      )
    }

    const { data: user } = await supabase
      .from("dashboard_users")
      .select("id")
      .ilike("username", username)
      .limit(1)
      .maybeSingle()

    if (!user) {
      return NextResponse.json({ error: "Usuário não encontrado." }, { status: 404 })
    }

    const password_hash = hashPassword(newPassword)
    await supabase
      .from("dashboard_users")
      .update({ password_hash, updated_at: new Date().toISOString() })
      .eq("id", (user as { id: string }).id)

    await supabase.from("password_reset_codes").delete().eq("id", (row as { id: string }).id)

    return NextResponse.json({
      success: true,
      message: "Senha alterada com sucesso. Faça login com a nova senha.",
    })
  } catch (e) {
    console.error("reset-password:", e)
    return NextResponse.json({ error: "Erro ao redefinir senha." }, { status: 500 })
  }
}
