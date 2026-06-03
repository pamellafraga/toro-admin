import { isAuthenticated } from "@/lib/api/auth"
import { handleApiError, jsonOk, jsonUnauthorized } from "@/lib/api/response"
import { mapClientRow } from "@/lib/clients/map-client-row"
import { normalizeEmailForDuplicate, normalizePhoneDigits } from "@/lib/clients/duplicate-check"
import {
  findClientByEmailNormalized,
  findClientById,
  findClientByPhoneDigits,
  searchClientByName,
} from "@/lib/db/repositories/clients.repository"

export const dynamic = "force-dynamic"

/** GET /api/clients/search?name=&phone=&email= */
export async function GET(req: Request) {
  try {
    if (!isAuthenticated(req)) return jsonUnauthorized()

    const { searchParams } = new URL(req.url)
    const name = searchParams.get("name")?.trim()
    const phoneRaw = searchParams.get("phone")?.trim()
    const emailRaw = searchParams.get("email")?.trim()

    const phoneDigits = phoneRaw ? normalizePhoneDigits(phoneRaw) : null
    const emailNorm = emailRaw ? normalizeEmailForDuplicate(emailRaw) : null

    let id: string | null = null

    if (phoneDigits) {
      const hit = await findClientByPhoneDigits(phoneDigits)
      if (hit) id = hit.id
    }

    if (!id && emailNorm) {
      const hit = await findClientByEmailNormalized(emailNorm)
      if (hit) id = hit.id
    }

    if (!id && name) {
      const hit = await searchClientByName(name)
      if (hit) id = hit.id
    }

    if (!id) return jsonOk({ client: null })

    const row = await findClientById(id)
    if (!row) return jsonOk({ client: null })

    return jsonOk({ client: mapClientRow(row) })
  } catch (err) {
    console.error("Erro em /api/clients/search:", err)
    return handleApiError(err, "Erro ao buscar contato.")
  }
}
