import { NextRequest } from "next/server"
import { isAuthenticated } from "@/lib/api/auth"
import { handleApiError, jsonError, jsonOk, jsonUnauthorized } from "@/lib/api/response"
import {
  deleteCredential,
  listCredentials,
  upsertCredential,
} from "@/lib/db/repositories/admin-credentials.repository"

export async function GET(request: NextRequest) {
  if (!isAuthenticated(request)) return jsonUnauthorized()

  try {
    const data = await listCredentials()
    return jsonOk(data)
  } catch (e) {
    return handleApiError(e, "Erro ao listar.")
  }
}

export async function POST(request: NextRequest) {
  if (!isAuthenticated(request)) return jsonUnauthorized()

  try {
    const body = await request.json()
    const { id, service, login, password, url, notes, category } = body
    if (!service?.trim() || !login?.trim() || !password?.trim()) {
      return jsonError("Serviço, login e senha são obrigatórios.", 400)
    }

    await upsertCredential({
      id,
      service: String(service).trim(),
      login: String(login).trim(),
      password: String(password),
      url: url?.trim() || null,
      notes: notes?.trim() || null,
      category: category || "FERRAMENTAS",
    })

    return jsonOk({ success: true })
  } catch (e) {
    return handleApiError(e, "Erro ao salvar.")
  }
}

export async function DELETE(request: NextRequest) {
  if (!isAuthenticated(request)) return jsonUnauthorized()

  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")
    if (!id) return jsonError("id obrigatório.", 400)
    await deleteCredential(id)
    return jsonOk({ success: true })
  } catch (e) {
    return handleApiError(e, "Erro ao remover.")
  }
}
