import { NextRequest } from "next/server"
import { parseAuthCookie, isAdmin } from "@/lib/api/auth"
import { handleApiError, jsonError, jsonOk } from "@/lib/api/response"
import { deleteUserByUsername } from "@/lib/db/repositories/dashboard-users.repository"
import { registerLiticaProTrial } from "@/lib/liticapro/register-trial"
import {
  mergeDeveloperCredentials,
  parseDeveloperCredentials,
  readDeveloperCredentialsFromLiticaProData,
} from "@/lib/liticapro/developer-credentials"
import { findClientById } from "@/lib/db/repositories/clients.repository"

export const dynamic = "force-dynamic"

/** POST /api/contracts/register/liticapro — cadastro com teste grátis 7 dias */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const auth = parseAuthCookie(req)

    const customerType = body.customer_type as "empresa" | "profissional_liberal"
    if (customerType !== "empresa" && customerType !== "profissional_liberal") {
      return jsonError("Selecione Empresa ou Profissional Liberal.", 400)
    }

    const linkedClientId = String(body.client_id ?? "").trim() || null
    const existingRow = linkedClientId ? await findClientById(linkedClientId) : null
    const existingDev = existingRow
      ? readDeveloperCredentialsFromLiticaProData(existingRow.liticapro_data)
      : null
    const incomingDev = isAdmin(req) ? parseDeveloperCredentials(body.dados_desenvolvedor) : null
    const mergedDev = isAdmin(req)
      ? mergeDeveloperCredentials(existingDev, incomingDev)
      : null

    const result = await registerLiticaProTrial({
      customer_type: customerType,
      email: String(body.email ?? "").trim().toLowerCase(),
      phone: String(body.phone ?? "").trim(),
      origem_captacao: String(body.origem_captacao ?? "").trim(),
      states_of_interest: Array.isArray(body.states_of_interest)
        ? (body.states_of_interest as string[]).map((s) => String(s).toUpperCase()).filter(Boolean)
        : [],
      cnpj: String(body.cnpj ?? ""),
      responsible_name: String(body.responsible_name ?? "").trim(),
      business_segment: String(body.business_segment ?? "").trim(),
      company_name: String(body.company_name ?? "").trim(),
      company_gov: body.company_gov as Record<string, unknown> | null | undefined,
      cpf: String(body.cpf ?? ""),
      full_name: String(body.full_name ?? "").trim(),
      birth_date: String(body.birth_date ?? "").trim(),
      linked_cnpjs: Array.isArray(body.linked_cnpjs) ? body.linked_cnpjs : [],
      client_id: linkedClientId,
      dados_desenvolvedor: mergedDev,
      comercial_display_name: auth?.role === "comercial" ? auth.displayName ?? null : null,
      is_comercial_user: auth?.role === "comercial",
      is_admin_user: isAdmin(req),
      activity_actor: { displayName: auth?.displayName },
      auto_provision: true,
      send_welcome_email: true,
    })

    if (!result.success) {
      return jsonError(result.error, result.status)
    }

    await deleteUserByUsername("Lisete")

    return jsonOk({
      success: true,
      contract_id: result.contract_id,
      client_id: result.client_id,
      trial_ends_at: result.trial_ends_at,
      message: result.message,
      login_url: result.login_url,
      provisioned: result.provision?.ok === true,
    })
  } catch (err) {
    console.error("register/liticapro:", err)
    return handleApiError(err, "Erro ao registrar LicitaPregão.")
  }
}
