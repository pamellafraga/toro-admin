import { NextRequest, NextResponse } from "next/server"
import { logActivity } from "@/lib/activity-log"

/**
 * POST /api/activity/log
 * Registra uma ação no histórico de atividades (quem fez o quê).
 * O nome do usuário é obtido do cookie xpress_auth.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const action = typeof body.action === "string" ? body.action.trim() : ""
    if (!action) {
      return NextResponse.json({ error: "action é obrigatória." }, { status: 400 })
    }
    await logActivity(request, {
      action,
      entity_type: body.entity_type ?? undefined,
      entity_id: body.entity_id ?? undefined,
      details: body.details ?? undefined,
    })
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error("Erro ao registrar atividade:", e)
    return NextResponse.json({ error: "Erro ao registrar atividade." }, { status: 500 })
  }
}
