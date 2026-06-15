import { NextRequest } from "next/server"
import { handleApiError, jsonError, jsonOk } from "@/lib/api/response"
import { syncPaymentFromSaaS, type SaaSPaymentStatus } from "@/lib/liticapro/sync-payment-from-saas"
import { verifyPublicSiteApiKey } from "@/lib/public-api/auth"

export const dynamic = "force-dynamic"

const VALID_STATUSES = new Set<SaaSPaymentStatus>([
  "PENDENTE",
  "PAGO",
  "ERRO",
  "CANCELADO",
  "EXPIRADO",
])

/** PATCH /api/public/contracts/payment-sync-from-saas — status de pagamento da ferramenta. */
export async function PATCH(req: NextRequest) {
  try {
    if (!verifyPublicSiteApiKey(req)) {
      return jsonError(
        "Não autorizado. Configure SITE_API_KEY no painel e envie Authorization: Bearer <token>.",
        401,
      )
    }

    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>
    const status = String(body.status ?? "").toUpperCase() as SaaSPaymentStatus

    if (!VALID_STATUSES.has(status)) {
      return jsonError("status inválido.", 400)
    }

    const result = await syncPaymentFromSaaS({
      empresa_id: String(body.empresa_id ?? ""),
      pagamento_id: String(body.pagamento_id ?? ""),
      status,
      provedor:
        body.provedor === "BANCO_INTER" || body.provedor === "MERCADO_PAGO"
          ? body.provedor
          : "MERCADO_PAGO",
      valor_total:
        typeof body.valor_total === "number"
          ? body.valor_total
          : body.valor_total
            ? Number(body.valor_total)
            : undefined,
      mp_preference_id: body.mp_preference_id ? String(body.mp_preference_id) : undefined,
      mp_payment_id: body.mp_payment_id ? String(body.mp_payment_id) : undefined,
      mp_init_point: body.mp_init_point ? String(body.mp_init_point) : undefined,
      paid_at: body.paid_at ? String(body.paid_at) : undefined,
      assinatura_vencimento: body.assinatura_vencimento
        ? String(body.assinatura_vencimento)
        : undefined,
      admin_contract_id: body.admin_contract_id ? String(body.admin_contract_id) : undefined,
      admin_client_id: body.admin_client_id ? String(body.admin_client_id) : undefined,
    })

    if (!result.ok) {
      return jsonError(result.error, result.status)
    }

    return jsonOk({
      success: true,
      client_id: result.client_id,
      contract_id: result.contract_id,
      payment_status: result.payment_status,
    })
  } catch (err) {
    console.error("payment-sync-from-saas:", err)
    return handleApiError(err, "Erro ao sincronizar pagamento da ferramenta.")
  }
}
