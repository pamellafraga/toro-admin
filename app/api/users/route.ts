import { NextRequest, NextResponse } from "next/server"
import { createHash } from "crypto"
import { createAdminClient } from "@/lib/supabase/admin"
import { logActivity } from "@/lib/activity-log"

function hashPassword(password: string): string {
  return createHash("sha256").update(password).digest("hex")
}

function isAdminRequest(request: NextRequest): boolean {
  try {
    const cookie = request.cookies.get("xpress_auth")?.value
    if (!cookie) return false
    const parsed = JSON.parse(cookie)
    return parsed.role === "admin" && !!(parsed.authenticated || parsed.user)
  } catch {
    return false
  }
}

/** GET: listar todos os usuários do sistema (sem password_hash) */
export async function GET(request: NextRequest) {
  if (!isAdminRequest(request))
    return NextResponse.json({ error: "Somente administradores podem acessar." }, { status: 403 })

  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from("dashboard_users")
      .select("id, username, role, display_name, email, created_at, updated_at")
      .order("display_name")

    if (error) throw error
    return NextResponse.json(data ?? [])
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro ao listar usuários."
    if (/obrigatórios para o admin client|SUPABASE_SERVICE_ROLE_KEY/i.test(msg))
      return NextResponse.json({ error: "Configuração do servidor incompleta." }, { status: 503 })
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

/** POST: cadastrar novo usuário */
export async function POST(request: NextRequest) {
  const cookie = request.cookies.get("xpress_auth")?.value
  if (!cookie) return NextResponse.json({ error: "Não autorizado." }, { status: 401 })
  let parsed: { role?: string; authenticated?: boolean; user?: string }
  try {
    parsed = JSON.parse(cookie)
  } catch {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 })
  }
  if (parsed.role !== "admin" || !(parsed.authenticated || parsed.user))
    return NextResponse.json({ error: "Somente administradores podem cadastrar usuários." }, { status: 403 })

  try {
    const body = await request.json()
    const username = String(body.username ?? "").trim()
    const password = String(body.password ?? "")
    const display_name = String(body.display_name ?? "").trim()
    const role = String(body.role ?? "comercial").trim()
    const email = body.email != null ? String(body.email).trim().toLowerCase() || null : null

    if (!username) return NextResponse.json({ error: "Login (username) é obrigatório." }, { status: 400 })
    if (!password) return NextResponse.json({ error: "Senha é obrigatória." }, { status: 400 })
    if (!display_name) return NextResponse.json({ error: "Nome de exibição é obrigatório." }, { status: 400 })
    if (role !== "admin" && role !== "comercial")
      return NextResponse.json({ error: "Perfil deve ser Administrador ou Comercial." }, { status: 400 })

    const supabase = createAdminClient()
    const { data: existing } = await supabase
      .from("dashboard_users")
      .select("id")
      .ilike("username", username)
      .limit(1)
      .maybeSingle()

    if (existing) return NextResponse.json({ error: "Já existe um usuário com este login." }, { status: 400 })

    const password_hash = hashPassword(password)
    const { data: created, error } = await supabase
      .from("dashboard_users")
      .insert({ username, password_hash, role, display_name, email })
      .select("id, username, role, display_name, email, created_at")
      .single()

    if (error) throw error
    const who = (parsed as { displayName?: string }).displayName ?? parsed.user ?? "Admin"
    await logActivity(
      { displayName: who },
      { action: `Cadastrou o usuário ${display_name} (${username})`, entity_type: "user", entity_id: created.id }
    )
    return NextResponse.json(created, { status: 201 })
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro ao cadastrar usuário."
    if (/obrigatórios para o admin client|SUPABASE_SERVICE_ROLE_KEY/i.test(msg))
      return NextResponse.json({ error: "Configuração do servidor incompleta." }, { status: 503 })
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
