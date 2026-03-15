import { NextRequest, NextResponse } from "next/server"
import { createHash } from "crypto"
import { createAdminClient } from "@/lib/supabase/admin"

function hashPassword(password: string): string {
  return createHash("sha256").update(password).digest("hex")
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const username = String(body.username ?? "").trim()
    const password = String(body.password ?? "")

    if (!username || !password) {
      return NextResponse.json({ error: "Usuário e senha são obrigatórios." }, { status: 400 })
    }

    const supabase = createAdminClient()
    const { data: user, error } = await supabase
      .from("dashboard_users")
      .select("id, username, role, display_name")
      .ilike("username", username)
      .limit(1)
      .maybeSingle()

    if (error || !user) {
      return NextResponse.json({ error: "Credenciais inválidas." }, { status: 401 })
    }

    const { data: full } = await supabase
      .from("dashboard_users")
      .select("password_hash")
      .eq("id", user.id)
      .single()

    const expectedHash = (full as { password_hash?: string } | null)?.password_hash
    const actualHash = hashPassword(password)
    if (!expectedHash || actualHash !== expectedHash) {
      return NextResponse.json({ error: "Credenciais inválidas." }, { status: 401 })
    }

    const cookiePayload = {
      user: user.username,
      displayName: user.display_name,
      role: user.role,
      authenticated: true,
    }

    const response = NextResponse.json(
      { success: true, user: user.username, displayName: user.display_name, role: user.role },
      { status: 200 },
    )

    response.cookies.set({
      name: "xpress_auth",
      value: JSON.stringify(cookiePayload),
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
    })

    return response
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro ao autenticar"
    if (msg.includes("SUPABASE_SERVICE_ROLE_KEY") || msg.includes("admin")) {
      return NextResponse.json(
        { error: "Configuração do servidor incompleta. Configure SUPABASE_SERVICE_ROLE_KEY e execute o script 018_dashboard_users.sql." },
        { status: 503 },
      )
    }
    return NextResponse.json({ error: "Erro ao autenticar." }, { status: 500 })
  }
}
