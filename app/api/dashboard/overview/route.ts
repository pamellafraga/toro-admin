import { NextRequest } from "next/server"
import { isAuthenticated } from "@/lib/api/auth"
import { handleApiError, jsonOk, jsonUnauthorized } from "@/lib/api/response"
import { getDashboardOverview } from "@/lib/db/repositories/dashboard.repository"

export const dynamic = "force-dynamic"

/** GET /api/dashboard/overview — KPIs, gráficos e atividades recentes */
export async function GET(req: NextRequest) {
  try {
    if (!isAuthenticated(req)) return jsonUnauthorized()

    const overview = await getDashboardOverview()
    return jsonOk(overview)
  } catch (err) {
    console.error("Erro em GET /api/dashboard/overview:", err)
    return handleApiError(err, "Erro ao carregar resumo do dashboard.")
  }
}
