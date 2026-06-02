import { handleApiError, jsonOk } from "@/lib/api/response"
import { searchClientByName } from "@/lib/db/repositories/clients.repository"

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const name = searchParams.get("name")?.trim()
    if (!name) return jsonOk({ client: null })

    const client = await searchClientByName(name)
    return jsonOk({ client })
  } catch (err) {
    console.error("Erro em /api/clients/search:", err)
    return handleApiError(err, "Erro ao buscar cliente.")
  }
}
