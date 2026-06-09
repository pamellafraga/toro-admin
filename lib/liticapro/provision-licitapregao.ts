import type { LiticaProDeveloperCredentials } from "@/lib/liticapro/types"

export type ProvisionLiticaProInput = {
  customer_type: "empresa" | "profissional_liberal"
  email: string
  trial_starts_at: string
  trial_ends_at: string
  states_of_interest: string[]
  credentials: LiticaProDeveloperCredentials
  external_client_id: string
  external_contract_id: string
  cnpj?: string | null
  company_name?: string | null
}

export type ProvisionLiticaProResult =
  | {
      ok: true
      empresa_id: string
      usuario_id: string
      login_url: string
    }
  | {
      ok: false
      error: string
      skipped?: boolean
    }

function getProvisionConfig() {
  const baseUrl = process.env.LICITAPREGAO_API_URL?.trim().replace(/\/$/, "")
  const apiKey = process.env.LICITAPREGAO_API_KEY?.trim()
  const loginUrl =
    process.env.LICITAPREGAO_LOGIN_URL?.trim() ||
    (baseUrl ? `${baseUrl}/login` : "https://licitapregao.xpresssolutions.com.br/login")

  return { baseUrl, apiKey, loginUrl }
}

export async function provisionLiticaProTenant(
  input: ProvisionLiticaProInput,
): Promise<ProvisionLiticaProResult> {
  const { baseUrl, apiKey, loginUrl } = getProvisionConfig()

  if (!baseUrl || !apiKey) {
    return {
      ok: false,
      error: "LICITAPREGAO_API_URL ou LICITAPREGAO_API_KEY não configurados no painel admin.",
      skipped: true,
    }
  }

  try {
    const res = await fetch(`${baseUrl}/api/provision`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        customer_type: input.customer_type,
        email: input.email,
        trial_starts_at: input.trial_starts_at,
        trial_ends_at: input.trial_ends_at,
        states_of_interest: input.states_of_interest,
        credentials: input.credentials,
        external_client_id: input.external_client_id,
        external_contract_id: input.external_contract_id,
        cnpj: input.cnpj ?? null,
        company_name: input.company_name ?? null,
      }),
    })

    const data = (await res.json().catch(() => ({}))) as {
      error?: string
      erro?: string
      empresa_id?: string
      usuario_id?: string
      login_url?: string
    }

    if (!res.ok) {
      return {
        ok: false,
        error: data.error ?? data.erro ?? `Falha ao provisionar LicitaPregão (${res.status}).`,
      }
    }

    return {
      ok: true,
      empresa_id: String(data.empresa_id ?? ""),
      usuario_id: String(data.usuario_id ?? ""),
      login_url: data.login_url?.trim() || loginUrl,
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro de rede ao provisionar LicitaPregão."
    return { ok: false, error: message }
  }
}
