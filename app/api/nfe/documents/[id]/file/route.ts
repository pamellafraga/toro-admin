import { NextRequest } from "next/server"
import { isAuthenticated } from "@/lib/api/auth"
import { handleApiError, jsonError, jsonUnauthorized } from "@/lib/api/response"
import { findNfeDocument } from "@/lib/db/repositories/nfe.repository"
import { readNfePdf } from "@/lib/storage/nfe-pdf"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isAuthenticated(request)) return jsonUnauthorized()

  const { id } = await params
  if (!id) return jsonError("ID da NF-e é obrigatório.", 400)

  try {
    const doc = await findNfeDocument(id)
    if (!doc?.pdf_storage_path) {
      return jsonError("PDF não disponível.", 404)
    }

    const buffer = await readNfePdf(doc.pdf_storage_path as string)
    if (!buffer) return jsonError("Arquivo PDF não encontrado.", 404)

    return new Response(buffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="nfe-${id}.pdf"`,
      },
    })
  } catch (err) {
    return handleApiError(err, "Erro ao servir PDF")
  }
}
