import { NextRequest } from "next/server"
import { isAuthenticated } from "@/lib/api/auth"
import { handleApiError, jsonError, jsonOk, jsonUnauthorized } from "@/lib/api/response"
import { findNfeDocument } from "@/lib/db/repositories/nfe.repository"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isAuthenticated(request)) return jsonUnauthorized()

  const { id } = await params
  if (!id) return jsonError("ID da NF-e é obrigatório.", 400)

  try {
    const doc = await findNfeDocument(id)
    if (!doc) return jsonError("NF-e não encontrada.", 404)

    const path = doc.pdf_storage_path as string | null
    if (!path?.trim()) {
      return jsonError(
        "PDF não disponível para esta NF-e. O documento ainda não foi armazenado.",
        404,
      )
    }

    return jsonOk({ url: `/api/nfe/documents/${id}/file` })
  } catch (err) {
    console.error("Erro ao obter visualização NF-e:", err)
    return handleApiError(err, "Erro ao obter PDF")
  }
}
