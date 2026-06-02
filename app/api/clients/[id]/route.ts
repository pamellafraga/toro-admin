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

    const customerType = body.customer_type as string | undefined
    if (customerType && customerType !== "empresa" && customerType !== "profissional_liberal") {
      return jsonError("Tipo de contato inválido.", 400)
    }

    let cpfCnpj = body.cpf_cnpj != null ? String(body.cpf_cnpj).trim() : null
    if (cpfCnpj && !cpfCnpj.startsWith("sem-cpf-")) {
      cpfCnpj = cpfCnpj.replace(/\D/g, "")
      if (!cpfCnpj) cpfCnpj = null
    }

    await updateClientFromDashboard(id, {
      name,
      email: body.email ?? null,
      phone: body.phone ?? null,
      cpf_cnpj: cpfCnpj,
      company: body.company ?? body.company_name ?? null,
      address: body.address ?? null,
      number: body.number ?? null,
      district: body.district ?? null,
      city: body.city ?? null,
      state: body.state ?? null,
      zip_code: body.zip_code ?? null,
      origem_captacao: body.origem_captacao ?? null,
      status_lead: body.status_lead ?? null,
      customer_type: customerType as "empresa" | "profissional_liberal" | undefined,
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
