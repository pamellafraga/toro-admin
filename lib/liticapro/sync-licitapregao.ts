import {
  findClientById,
  getClientLiticaProData,
} from "@/lib/db/repositories/clients.repository"
import { findContractWithProduct } from "@/lib/db/repositories/contracts.repository"
import { readDeveloperCredentialsFromLiticaProData } from "@/lib/liticapro/developer-credentials"
import { resolveTrialEndsAt } from "@/lib/liticapro/trial"
import type { CnpjGovData } from "@/lib/liticapro/types"

export type SyncLiticaProResult =
  | { ok: true; empresa_id: string; usuario_id: string }
  | { ok: false; error: string; skipped?: boolean }

function getSyncConfig() {
  const baseUrl = process.env.LICITAPREGAO_API_URL?.trim().replace(/\/$/, "")
  const apiKey = process.env.LICITAPREGAO_API_KEY?.trim()
  return { baseUrl, apiKey }
}

export async function syncLiticaProTenantAfterAdminEdit(
  contractId: string,
): Promise<SyncLiticaProResult> {
  const { baseUrl, apiKey } = getSyncConfig()
  if (!baseUrl || !apiKey) {
    return {
      ok: false,
      error: "LICITAPREGAO_API_URL ou LICITAPREGAO_API_KEY não configurados.",
      skipped: true,
    }
  }

  const contract = await findContractWithProduct(contractId)
  if (!contract || contract.product_slug !== "liticapro") {
    return { ok: false, error: "Contrato LicitaPregão não encontrado.", skipped: true }
  }

  const meta = (contract.liticapro_meta ?? {}) as Record<string, unknown>
  const empresaId = String(meta.saas_empresa_id ?? "").trim()
  if (!empresaId) {
    return {
      ok: false,
      error: "Cliente ainda não provisionado na ferramenta (sem saas_empresa_id).",
      skipped: true,
    }
  }

  const client = await findClientById(contract.client_id)
  if (!client) {
    return { ok: false, error: "Cliente não encontrado.", skipped: true }
  }

  const liticaproRow = await getClientLiticaProData(contract.client_id)
  const liticaproData = (liticaproRow?.liticapro_data ?? {}) as Record<string, unknown>
  const credentials = readDeveloperCredentialsFromLiticaProData(liticaproData)
  const customerType =
    liticaproData.customer_type === "profissional_liberal"
      ? "profissional_liberal"
      : "empresa"

  const statesRaw =
    (liticaproData.states_of_interest as string[] | undefined) ??
    (meta.states_of_interest as string[] | undefined) ??
    []

  const trialEndsAt = resolveTrialEndsAt({
    trial_ends_at: contract.trial_ends_at,
    created_at: contract.created_at,
  })

  try {
    const res = await fetch(`${baseUrl}/api/sync-tenant`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        empresa_id: empresaId,
        usuario_id: meta.saas_usuario_id ? String(meta.saas_usuario_id) : undefined,
        customer_type: customerType,
        email: String(client.email ?? "").trim(),
        phone: String(client.phone ?? "").trim() || undefined,
        client_name: String(client.name ?? "").trim(),
        trial_ends_at: trialEndsAt?.toISOString(),
        states_of_interest: statesRaw,
        credentials: credentials
          ? {
              empresa: credentials.empresa,
              usuario: credentials.usuario,
              senha: credentials.senha || undefined,
            }
          : undefined,
        address: {
          zip_code: client.zip_code,
          address: client.address,
          number: client.number,
          district: client.district,
          city: client.city,
          state: client.state,
        },
        business_segment: String(liticaproData.business_segment ?? "").trim() || undefined,
        company_gov: (liticaproData.company_gov as CnpjGovData | null) ?? null,
        linked_cnpjs: Array.isArray(liticaproData.linked_cnpjs)
          ? liticaproData.linked_cnpjs
          : undefined,
      }),
    })

    const data = (await res.json().catch(() => ({}))) as {
      error?: string
      empresa_id?: string
      usuario_id?: string
    }

    if (!res.ok) {
      return {
        ok: false,
        error: data.error ?? `Falha ao sincronizar LicitaPregão (${res.status}).`,
      }
    }

    return {
      ok: true,
      empresa_id: String(data.empresa_id ?? empresaId),
      usuario_id: String(data.usuario_id ?? meta.saas_usuario_id ?? ""),
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro de rede ao sincronizar LicitaPregão."
    return { ok: false, error: message }
  }
}

export async function syncLiticaProTenantForClient(
  clientId: string,
): Promise<SyncLiticaProResult> {
  const { queryOne } = await import("@/lib/db/pool")
  const row = await queryOne<{ id: string }>(
    `SELECT c.id
     FROM contracts c
     INNER JOIN products p ON p.id = c.product_id
     WHERE c.client_id = $1 AND lower(p.slug) = 'liticapro'
     ORDER BY c.updated_at DESC NULLS LAST, c.created_at DESC
     LIMIT 1`,
    [clientId],
  )

  if (!row?.id) {
    return { ok: false, error: "Contrato LicitaPregão não encontrado para este cliente.", skipped: true }
  }

  return syncLiticaProTenantAfterAdminEdit(row.id)
}
