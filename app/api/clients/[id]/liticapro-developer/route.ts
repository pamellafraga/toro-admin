import { NextRequest } from "next/server"
import { isAdmin } from "@/lib/api/auth"
import { handleApiError, jsonError, jsonOk } from "@/lib/api/response"
import { logActivity } from "@/lib/activity-log"
import { updateClientDeveloperCredentials } from "@/lib/db/repositories/clients.repository"
import { parseDeveloperCredentials } from "@/lib/liticapro/developer-credentials"
import { syncLiticaProTenantForClient } from "@/lib/liticapro/sync-licitapregao"

export const dynamic = "force-dynamic"

/** PATCH /api/clients/[id]/liticapro-developer — credenciais LicitaPregão (somente admin) */
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
      action: "Atualizou dados do desenvolvedor LicitaPregão",
      entity_type: "client",
      entity_id: id,
    })

    const syncResult = await syncLiticaProTenantForClient(id)
    const saas_sync = {
      ok: syncResult.ok,
      error: "error" in syncResult ? syncResult.error : undefined,
      skipped: "skipped" in syncResult && syncResult.skipped ? true : undefined,
    }
    if (!syncResult.ok && !("skipped" in syncResult && syncResult.skipped)) {
      console.error("[liticapro-developer] Falha sync LicitaPregão:", syncResult.error)
    }

    return jsonOk({ success: true, saas_sync })
  } catch (err) {
    console.error("liticapro-developer PATCH:", err)
    return handleApiError(err, "Erro ao salvar credenciais.")
  }
}
