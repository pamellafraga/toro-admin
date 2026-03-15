import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

function isAdminRequest(request: NextRequest): boolean {
  try {
    const cookie = request.cookies.get("xpress_auth")?.value
    if (!cookie) return false
    const parsed = JSON.parse(cookie)
    return !!(parsed.authenticated || parsed.user)
  } catch {
    return false
  }
}

export async function GET(request: NextRequest) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 })
  }
  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from("admin_credentials")
      .select("*")
      .order("service")
    if (error) throw error
    return NextResponse.json(data ?? [])
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Erro ao listar."
    const isEnvMissing = /obrigatórios para o admin client|SUPABASE_SERVICE_ROLE_KEY/i.test(msg)
    return NextResponse.json(
      { error: isEnvMissing ? "Configure SUPABASE_SERVICE_ROLE_KEY no .env.local e reinicie o servidor (npm run dev)." : msg },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 })
  }
  try {
    const body = await request.json()
    const { id, service, login, password, url, notes, category } = body
    if (!service?.trim() || !login?.trim() || !password?.trim()) {
      return NextResponse.json({ error: "Serviço, login e senha são obrigatórios." }, { status: 400 })
    }
    const supabase = createAdminClient()
    const payload = {
      service: String(service).trim(),
      login: String(login).trim(),
      password: String(password),
      url: url?.trim() || null,
      notes: notes?.trim() || null,
      category: category || "FERRAMENTAS",
    }
    if (id) {
      const { error } = await supabase.from("admin_credentials").update(payload).eq("id", id)
      if (error) throw error
      return NextResponse.json({ success: true })
    }
    const { error } = await supabase.from("admin_credentials").insert(payload)
    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Erro ao salvar."
    const isEnvMissing = /obrigatórios para o admin client|SUPABASE_SERVICE_ROLE_KEY/i.test(msg)
    return NextResponse.json(
      { error: isEnvMissing ? "Configure SUPABASE_SERVICE_ROLE_KEY no .env.local e reinicie o servidor (npm run dev)." : msg },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 })
  }
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")
    if (!id) return NextResponse.json({ error: "id obrigatório." }, { status: 400 })
    const supabase = createAdminClient()
    const { error } = await supabase.from("admin_credentials").delete().eq("id", id)
    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Erro ao remover."
    const isEnvMissing = /obrigatórios para o admin client|SUPABASE_SERVICE_ROLE_KEY/i.test(msg)
    return NextResponse.json(
      { error: isEnvMissing ? "Configure SUPABASE_SERVICE_ROLE_KEY no .env.local e reinicie o servidor (npm run dev)." : msg },
      { status: 500 }
    )
  }
}
