import { NextRequest } from "next/server"
import { isAuthenticated } from "@/lib/api/auth"
import { handleApiError, jsonError, jsonOk, jsonUnauthorized } from "@/lib/api/response"
import { deleteClient, updateClientFromDashboard } from "@/lib/db/repositories/clients.repository"

export const dynamic = "force-dynamic"

/** PATCH /api/clients/[id] */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    if (!isAuthenticated(req)) return jsonUnauthorized()

    const { id } = await params
    const body = await req.json()
    const name = String(body.name ?? "").trim()
    if (!name) return jsonError("Nome obrigatório.", 400)

    await updateClientFromDashboard(id, {
      name,
      email: body.email ?? null,
      phone: body.phone ?? null,
      cpf_cnpj: body.cpf_cnpj ?? null,
      company: body.company ?? body.company_name ?? null,
      address: body.address ?? null,
      origem_captacao: body.origem_captacao ?? null,
      status_lead: body.status_lead ?? null,
    })

    return jsonOk({ ok: true })
  } catch (err) {
    console.error("Erro em PATCH /api/clients/[id]:", err)
    return handleApiError(err, "Erro ao atualizar cliente.")
  }
}

/** DELETE /api/clients/[id] */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    if (!isAuthenticated(req)) return jsonUnauthorized()

    const { id } = await params
    await deleteClient(id)
    return jsonOk({ ok: true })
  } catch (err) {
    console.error("Erro em DELETE /api/clients/[id]:", err)
    return handleApiError(err, "Erro ao excluir cliente.")
  }
}
