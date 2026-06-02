import { NextRequest } from "next/server"
import { isAdmin } from "@/lib/api/auth"
import { handleApiError, jsonError, jsonOk } from "@/lib/api/response"
import { logActivity } from "@/lib/activity-log"
import { updateClientDeveloperCredentials } from "@/lib/db/repositories/clients.repository"
import { parseDeveloperCredentials } from "@/lib/liticapro/developer-credentials"

export const dynamic = "force-dynamic"

/** PATCH /api/clients/[id]/liticapro-developer — credenciais LiticaPro (somente admin) */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    if (!isAdmin(req)) return jsonError("Sem permissão.", 403)

    const { id } = await params
    const body = await req.json()
    const dev = parseDeveloperCredentials(body)
    if (!dev?.empresa && !dev?.usuario && !dev?.senha) {
      return jsonError("Informe ao menos um campo de credenciais.", 400)
    }

    await updateClientDeveloperCredentials(id, {
      empresa: dev?.empresa ?? "",
      usuario: dev?.usuario ?? "",
      senha: dev?.senha ?? "",
    })

    await logActivity(req, {
      action: "Atualizou dados do desenvolvedor LiticaPro",
      entity_type: "client",
      entity_id: id,
    })

    return jsonOk({ success: true })
  } catch (err) {
    console.error("liticapro-developer PATCH:", err)
    return handleApiError(err, "Erro ao salvar credenciais.")
  }
}
