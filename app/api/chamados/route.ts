import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { canAccessChamadosPanel, canIngestChamadosFromTool } from "@/lib/chamados-api"
import type { InternalSupportTicket, SupportTicketPriority, SupportTicketStatus } from "@/lib/types"

const STATUSES: SupportTicketStatus[] = ["aberto", "em_andamento", "resolvido", "fechado"]
const PRIORITIES: SupportTicketPriority[] = ["baixa", "normal", "alta", "urgente"]

/** Lista chamados (painel Pamella). */
export async function GET(request: NextRequest) {
  if (!canAccessChamadosPanel(request))
    return NextResponse.json({ error: "Sem permissão para acessar chamados." }, { status: 403 })

  try {
    const supabase = createAdminClient()
    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")
    let q = supabase.from("internal_support_tickets").select("*").order("created_at", { ascending: false })
    if (status && STATUSES.includes(status as SupportTicketStatus)) {
      q = q.eq("status", status)
    }
    const { data, error } = await q
    if (error) throw error
    return NextResponse.json((data ?? []) as InternalSupportTicket[])
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro ao listar chamados."
    if (/relation.*does not exist|internal_support_tickets/i.test(msg))
      return NextResponse.json(
        { error: "Tabela de chamados ainda não criada. Execute o script SQL 032_internal_support_tickets.sql no Supabase." },
        { status: 503 }
      )
    if (/obrigatórios para o admin client|SUPABASE_SERVICE_ROLE_KEY/i.test(msg))
      return NextResponse.json({ error: "Configuração do servidor incompleta." }, { status: 503 })
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

/**
 * Abre chamado a partir de uma ferramenta (chat de suporte no app do cliente).
 * Header: Authorization: Bearer CHAMADOS_INGEST_TOKEN
 */
export async function POST(request: NextRequest) {
  if (!canIngestChamadosFromTool(request))
    return NextResponse.json(
      { error: "Não autorizado. Defina CHAMADOS_INGEST_TOKEN no servidor e envie Authorization: Bearer <token>." },
      { status: 401 }
    )

  try {
    const body = await request.json()
    const subject = String(body.subject ?? "").trim()
    const message = String(body.message ?? "").trim()
    if (!subject || !message)
      return NextResponse.json({ error: "Campos subject e message são obrigatórios." }, { status: 400 })

    let priority: SupportTicketPriority = "normal"
    const pr = String(body.priority ?? "normal").toLowerCase()
    if (PRIORITIES.includes(pr as SupportTicketPriority)) priority = pr as SupportTicketPriority

    const row = {
      source_tool: body.source_tool != null ? String(body.source_tool).trim() || null : null,
      client_identifier: body.client_identifier != null ? String(body.client_identifier).trim() || null : null,
      client_email: body.client_email != null ? String(body.client_email).trim().toLowerCase() || null : null,
      subject,
      message,
      priority,
      external_user_id: body.external_user_id != null ? String(body.external_user_id).trim() || null : null,
      status: "aberto" as const,
    }

    const supabase = createAdminClient()
    const { data, error } = await supabase.from("internal_support_tickets").insert(row).select("*").single()
    if (error) throw error
    return NextResponse.json(data as InternalSupportTicket, { status: 201 })
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro ao criar chamado."
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
