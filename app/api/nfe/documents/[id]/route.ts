import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { logActivity } from "@/lib/activity-log"

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

/**
 * PATCH: Cancelar NF-e (status -> cancelada).
 * Apenas NF-e com status "emitida" pode ser cancelada.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 })
  }

  const { id } = await params
  if (!id) {
    return NextResponse.json({ error: "ID da NF-e é obrigatório." }, { status: 400 })
  }

  let body: { action?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Corpo inválido." }, { status: 400 })
  }

  if (body.action !== "cancelar") {
    return NextResponse.json({ error: "Ação inválida. Use { \"action\": \"cancelar\" }." }, { status: 400 })
  }

  try {
    const supabase = createAdminClient()

    const { data: doc, error: fetchError } = await supabase
      .from("nfe_documents")
      .select("id, status, number, series, client_name")
      .eq("id", id)
      .maybeSingle()

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 })
    }
    if (!doc) {
      return NextResponse.json({ error: "NF-e não encontrada." }, { status: 404 })
    }

    const status = (doc.status ?? "").toString().toLowerCase()
    if (status !== "emitida") {
      return NextResponse.json(
        { error: "Apenas NF-e emitida pode ser cancelada. Para remover uma pendente, use Excluir." },
        { status: 400 },
      )
    }

    const { error: updateError } = await supabase
      .from("nfe_documents")
      .update({ status: "cancelada", updated_at: new Date().toISOString() })
      .eq("id", id)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    await logActivity(request, {
      action: `Cancelou NF-e ${doc.number ?? doc.id}`,
      entity_type: "nfe",
      entity_id: id,
      details: { number: doc.number, series: doc.series, client_name: doc.client_name },
    })

    return NextResponse.json({
      success: true,
      message: "NF-e cancelada.",
    })
  } catch (err) {
    console.error("Erro ao cancelar NF-e:", err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erro ao cancelar NF-e" },
      { status: 500 },
    )
  }
}

/**
 * DELETE: Excluir NF-e do sistema (remove o registro).
 * Pendente: pode excluir. Emitida/cancelada: remove apenas do painel (registro fiscal na SEFAZ não é alterado).
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 })
  }

  const { id } = await params
  if (!id) {
    return NextResponse.json({ error: "ID da NF-e é obrigatório." }, { status: 400 })
  }

  try {
    const supabase = createAdminClient()

    const { data: doc, error: fetchError } = await supabase
      .from("nfe_documents")
      .select("id, status, number, series, client_name")
      .eq("id", id)
      .maybeSingle()

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 })
    }
    if (!doc) {
      return NextResponse.json({ error: "NF-e não encontrada." }, { status: 404 })
    }

    const { error: deleteError } = await supabase
      .from("nfe_documents")
      .delete()
      .eq("id", id)

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 })
    }

    await logActivity(request, {
      action: `Excluiu NF-e ${doc.number ?? doc.id}`,
      entity_type: "nfe",
      entity_id: id,
      details: { number: doc.number, series: doc.series, status: doc.status, client_name: doc.client_name },
    })

    return NextResponse.json({
      success: true,
      message: "NF-e excluída.",
    })
  } catch (err) {
    console.error("Erro ao excluir NF-e:", err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erro ao excluir NF-e" },
      { status: 500 },
    )
  }
}
