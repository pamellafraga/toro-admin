import { NextRequest } from "next/server"
import { isAuthenticated } from "@/lib/api/auth"
import { handleApiError, jsonOk, jsonUnauthorized } from "@/lib/api/response"
import { listPrimaryContractByClient } from "@/lib/db/repositories/contracts.repository"

export const dynamic = "force-dynamic"

/** GET /api/contracts/status-by-client — contrato principal por cliente (status sincronizado com Produtos) */
export async function GET(req: NextRequest) {
  try {
    if (!isAuthenticated(req)) return jsonUnauthorized()

    const rows = await listPrimaryContractByClient()
    const statuses: Record<string, string> = {}
    const contracts: Record<string, (typeof rows)[number]> = {}
    for (const row of rows) {
      statuses[row.client_id] = row.status
      contracts[row.client_id] = row
    }
    return jsonOk({ statuses, contracts })
  } catch (err) {
    console.error("Erro em GET /api/contracts/status-by-client:", err)
    return handleApiError(err, "Erro ao buscar status dos contratos.")
  }
}
