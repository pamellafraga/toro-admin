import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { canAccessChamadosPanel } from "@/lib/chamados-api"
import type { SupportTicketStatus } from "@/lib/types"

const STATUSES: SupportTicketStatus[] = ["aberto", "em_andamento", "resolvido", "fechado"]

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!canAccessChamadosPanel(request))
    return NextResponse.json({ error: "Sem permissão." }, { status: 403 })

  const { id } = await params
  if (!id) return NextResponse.json({ error: "ID inválido." }, { status: 400 })

  try {
    const body = await request.json()
    const status = body.status != null ? String(body.status).trim() : ""
    if (!STATUSES.includes(status as SupportTicketStatus))
      return NextResponse.json({ error: "Status inválido." }, { status: 400 })

    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from("internal_support_tickets")
      .update({ status })
      .eq("id", id)
      .select("*")
      .single()

    if (error) throw error
    if (!data) return NextResponse.json({ error: "Chamado não encontrado." }, { status: 404 })
    return NextResponse.json(data)
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro ao atualizar."
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
