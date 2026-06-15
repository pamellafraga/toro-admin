import { findContractWithProduct, updateContract } from "@/lib/db/repositories/contracts.repository"
import { queryOne } from "@/lib/db/pool"
import { logActivity } from "@/lib/activity-log"

export type SaaSPaymentStatus = "PENDENTE" | "PAGO" | "ERRO" | "CANCELADO" | "EXPIRADO"

export type SyncPaymentFromSaaSInput = {
  empresa_id: string
  pagamento_id: string
  status: SaaSPaymentStatus
  provedor?: "MERCADO_PAGO" | "BANCO_INTER"
  valor_total?: number
  mp_preference_id?: string
  mp_payment_id?: string
  mp_init_point?: string
  paid_at?: string
  assinatura_vencimento?: string
  admin_contract_id?: string
  admin_client_id?: string
}

export type SyncPaymentFromSaaSResult =
  | { ok: true; client_id: string; contract_id: string; payment_status: string }
  | { ok: false; error: string; status: number }

async function findLiticaProContractBySaasEmpresaId(empresaId: string) {
  return queryOne<{ id: string; client_id: string }>(
    `SELECT c.id, c.client_id
     FROM contracts c
     INNER JOIN products p ON p.id = c.product_id
     WHERE lower(p.slug) = 'liticapro'
       AND c.liticapro_meta->>'saas_empresa_id' = $1
     ORDER BY c.updated_at DESC NULLS LAST, c.created_at DESC
     LIMIT 1`,
    [empresaId],
  )
}

function mapPaymentStatus(status: SaaSPaymentStatus): string {
  switch (status) {
    case "PAGO":
      return "em_dia"
    case "PENDENTE":
      return "pendente"
    case "EXPIRADO":
      return "expirado"
    case "ERRO":
    case "CANCELADO":
      return "cancelado"
    default:
      return "pendente"
  }
}

function mapContractStatus(status: SaaSPaymentStatus): string | undefined {
  if (status === "PAGO") return "ativa"
  return undefined
}

function buildActivityMessage(input: SyncPaymentFromSaaSInput, paymentStatus: string): string {
  const valor =
    typeof input.valor_total === "number" && Number.isFinite(input.valor_total)
      ? ` — R$ ${input.valor_total.toFixed(2).replace(".", ",")}`
      : ""

  if (input.status === "PAGO") {
    return `Pagamento ${input.provedor === "MERCADO_PAGO" ? "Mercado Pago" : "assinatura"} confirmado${valor}.`
  }
  if (input.status === "PENDENTE") {
    return `Pagamento ${input.provedor === "MERCADO_PAGO" ? "Mercado Pago" : "assinatura"} pendente${valor}.`
  }
  if (input.status === "ERRO" || input.status === "CANCELADO") {
    return `Pagamento ${input.provedor === "MERCADO_PAGO" ? "Mercado Pago" : "assinatura"} não concluído (${paymentStatus}).`
  }
  return `Status de pagamento atualizado: ${paymentStatus}.`
}

export async function syncPaymentFromSaaS(
  input: SyncPaymentFromSaaSInput,
): Promise<SyncPaymentFromSaaSResult> {
  const empresaId = input.empresa_id.trim()
  const pagamentoId = input.pagamento_id.trim()

  if (!empresaId || !pagamentoId) {
    return { ok: false, error: "empresa_id e pagamento_id são obrigatórios.", status: 400 }
  }

  let contractId = input.admin_contract_id?.trim() || ""
  let clientId = input.admin_client_id?.trim() || ""

  if (!contractId || !clientId) {
    const bySaas = await findLiticaProContractBySaasEmpresaId(empresaId)
    if (!bySaas) {
      return {
        ok: false,
        error: "Contrato não encontrado no painel para esta empresa da ferramenta.",
        status: 404,
      }
    }
    contractId = bySaas.id
    clientId = bySaas.client_id
  }

  const contract = await findContractWithProduct(contractId)
  if (!contract || contract.client_id !== clientId) {
    return { ok: false, error: "Contrato ou cliente inválido.", status: 404 }
  }

  const paymentStatus = mapPaymentStatus(input.status)
  const contractStatus = mapContractStatus(input.status)

  const meta = {
    ...(contract.liticapro_meta ?? {}),
    saas_empresa_id: empresaId,
    last_payment_id: pagamentoId,
    last_payment_status: input.status,
    last_payment_provedor: input.provedor ?? "MERCADO_PAGO",
    last_payment_valor: input.valor_total ?? undefined,
    last_payment_at: new Date().toISOString(),
    last_mp_preference_id: input.mp_preference_id ?? undefined,
    last_mp_payment_id: input.mp_payment_id ?? undefined,
    last_mp_init_point: input.mp_init_point ?? undefined,
    last_paid_at: input.paid_at ?? undefined,
    assinatura_vencimento: input.assinatura_vencimento ?? undefined,
  }

  await updateContract(contractId, {
    payment_status: paymentStatus,
    ...(contractStatus ? { status: contractStatus } : {}),
    ...(typeof input.valor_total === "number" && input.status === "PAGO"
      ? { monthly_value: input.valor_total }
      : {}),
    liticapro_meta: meta,
  })

  await logActivity({ displayName: "LicitaPregão" }, {
    action: buildActivityMessage(input, paymentStatus),
    entity_type: "contract",
    entity_id: contractId,
    details: {
      empresa_id: empresaId,
      pagamento_id: pagamentoId,
      payment_status: paymentStatus,
      provedor: input.provedor ?? "MERCADO_PAGO",
      valor_total: input.valor_total,
    },
  })

  return {
    ok: true,
    client_id: clientId,
    contract_id: contractId,
    payment_status: paymentStatus,
  }
}
