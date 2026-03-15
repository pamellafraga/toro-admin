import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

const NFE_PDF_BUCKET = "nfe-pdfs"

function isAuthRequest(request: NextRequest): boolean {
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
 * GET: Retorna URL assinada para visualizar o PDF da NF-e (quando armazenado no bucket nfe-pdfs).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isAuthRequest(request)) {
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
      .select("id, pdf_storage_path, status")
      .eq("id", id)
      .maybeSingle()

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 })
    }
    if (!doc) {
      return NextResponse.json({ error: "NF-e não encontrada." }, { status: 404 })
    }

    const path = doc.pdf_storage_path as string | null
    if (!path || typeof path !== "string" || !path.trim()) {
      return NextResponse.json(
        { error: "PDF não disponível para esta NF-e. O documento ainda não foi armazenado." },
        { status: 404 },
      )
    }

    const { data: signedList, error: signError } = await supabase.storage
      .from(NFE_PDF_BUCKET)
      .createSignedUrls([path], 120)

    if (signError) {
      console.error("Erro ao criar URL assinada:", signError)
      return NextResponse.json(
        { error: "Erro ao gerar link do PDF. Verifique se o bucket nfe-pdfs existe e o arquivo está lá." },
        { status: 500 },
      )
    }

    const first = Array.isArray(signedList) ? signedList[0] : (signedList as { signedUrl?: string } | null)
    const url = first?.signedUrl ?? null
    if (!url) {
      return NextResponse.json({ error: "URL do PDF não disponível." }, { status: 500 })
    }

    return NextResponse.json({ url })
  } catch (err) {
    console.error("Erro ao obter visualização NF-e:", err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erro ao obter PDF" },
      { status: 500 },
    )
  }
}
