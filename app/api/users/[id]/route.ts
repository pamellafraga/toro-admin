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

/** PATCH: editar usuário (display_name, role e opcionalmente nova senha) */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAdminRequest(request))
    return NextResponse.json({ error: "Somente administradores podem editar usuários." }, { status: 403 })

  const { id } = await params
  if (!id) return NextResponse.json({ error: "ID do usuário é obrigatório." }, { status: 400 })

  try {
    const body = await request.json()
    const display_name = body.display_name != null ? String(body.display_name).trim() : undefined
    const role = body.role != null ? String(body.role).trim() : undefined
    const new_password = body.new_password != null ? String(body.new_password) : undefined
    const email = body.email !== undefined ? (body.email == null || body.email === "" ? null : String(body.email).trim().toLowerCase()) : undefined

    if (role !== undefined && role !== "admin" && role !== "comercial")
      return NextResponse.json({ error: "Perfil deve ser Administrador ou Comercial." }, { status: 400 })

    const supabase = createAdminClient()
    const updates: { display_name?: string; role?: string; password_hash?: string; email?: string | null; updated_at?: string } = {}
    if (display_name !== undefined) updates.display_name = display_name
    if (role !== undefined) updates.role = role
    if (email !== undefined) updates.email = email
    if (new_password !== undefined && new_password !== "") updates.password_hash = hashPassword(new_password)

    if (Object.keys(updates).length === 0)
      return NextResponse.json({ error: "Nenhum campo para atualizar." }, { status: 400 })

    const { data, error } = await supabase
      .from("dashboard_users")
      .update(updates)
      .eq("id", id)
      .select("id, username, role, display_name, email, updated_at")
      .single()

    if (error) throw error
    if (!data) return NextResponse.json({ error: "Usuário não encontrado." }, { status: 404 })
    const who = (await (async () => {
      try {
        const c = request.cookies.get("xpress_auth")?.value
        if (!c) return "Admin"
        const p = JSON.parse(c)
        return p.displayName ?? p.user ?? "Admin"
      } catch { return "Admin" }
    })())
    await logActivity(
      { displayName: who },
      { action: `Atualizou o usuário ${(data as { display_name?: string }).display_name ?? data.username}`, entity_type: "user", entity_id: id }
    )
    return NextResponse.json(data)
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro ao atualizar usuário."
    if (/obrigatórios para o admin client|SUPABASE_SERVICE_ROLE_KEY/i.test(msg))
      return NextResponse.json({ error: "Configuração do servidor incompleta." }, { status: 503 })
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

/** DELETE: remover usuário do sistema */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAdminRequest(_request))
    return NextResponse.json({ error: "Somente administradores podem remover usuários." }, { status: 403 })

  const { id } = await params
  if (!id) return NextResponse.json({ error: "ID do usuário é obrigatório." }, { status: 400 })

  try {
    const supabase = createAdminClient()
    const { data: user } = await supabase.from("dashboard_users").select("display_name, username").eq("id", id).single()
    const { error } = await supabase.from("dashboard_users").delete().eq("id", id)

    if (error) throw error
    const who = (await (async () => {
      try {
        const c = _request.cookies.get("xpress_auth")?.value
        if (!c) return "Admin"
        const p = JSON.parse(c)
        return p.displayName ?? p.user ?? "Admin"
      } catch { return "Admin" }
    })())
    const name = (user as { display_name?: string } | null)?.display_name ?? (user as { username?: string } | null)?.username ?? "usuário"
    await logActivity({ displayName: who }, { action: `Removeu o usuário ${name}`, entity_type: "user", entity_id: id })
    return new NextResponse(null, { status: 204 })
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro ao remover usuário."
    if (/obrigatórios para o admin client|SUPABASE_SERVICE_ROLE_KEY/i.test(msg))
      return NextResponse.json({ error: "Configuração do servidor incompleta." }, { status: 503 })
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
