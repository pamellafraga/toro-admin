import {
  findClientByEmailNormalized,
  getClientLiticaProData,
} from "@/lib/db/repositories/clients.repository"
import { findLiticaProContractByClientId } from "@/lib/db/repositories/contracts.repository"
import { findOrCreateProductFromCatalog } from "@/lib/db/repositories/products.repository"
import { readDeveloperCredentialsFromLiticaProData } from "@/lib/liticapro/developer-credentials"
import { getProductBySlug } from "@/lib/products/catalog"
import type { LiticaProDeveloperCredentials } from "@/lib/liticapro/types"

export type ResendWelcomeFromSiteSuccess = {
  ok: true
  client_name: string
  customer_type: "empresa" | "profissional_liberal"
  states_of_interest: string[]
  credentials: LiticaProDeveloperCredentials
  login_url: string
  provisioned: boolean
}

export type ResendWelcomeFromSiteFailure = {
  ok: false
  error: string
  status: number
}

function parseCustomerType(raw: unknown): "empresa" | "profissional_liberal" {
  return raw === "profissional_liberal" ? "profissional_liberal" : "empresa"
}

function parseStatesOfInterest(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  return raw.map((uf) => String(uf ?? "").trim().toUpperCase()).filter(Boolean)
}

export async function getLiticaProAccessForResend(
  email: string,
): Promise<ResendWelcomeFromSiteSuccess | ResendWelcomeFromSiteFailure> {
  const normalized = email.trim().toLowerCase()
  if (!normalized || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    return { ok: false, error: "E-mail inválido.", status: 400 }
  }

  const client = await findClientByEmailNormalized(normalized)
  if (!client) {
    return {
      ok: false,
      error: "Não encontramos cadastro de teste grátis para este e-mail.",
      status: 404,
    }
  }

  const catalog = getProductBySlug("liticapro")
  if (!catalog) {
    return { ok: false, error: "Produto LicitaPregão não configurado.", status: 500 }
  }

  const product = await findOrCreateProductFromCatalog(catalog)
  const contract = await findLiticaProContractByClientId(client.id, product.id)
  if (!contract) {
    return {
      ok: false,
      error: "Não há contrato de teste grátis vinculado a este e-mail.",
      status: 404,
    }
  }

  const clientData = await getClientLiticaProData(client.id)
  const liticaproData = clientData?.liticapro_data ?? null
  const credentials = readDeveloperCredentialsFromLiticaProData(liticaproData)

  if (!credentials?.empresa || !credentials?.usuario || !credentials?.senha) {
    return {
      ok: false,
      error: "Credenciais de acesso ainda não estão disponíveis. Aguarde alguns minutos ou fale com o suporte.",
      status: 409,
    }
  }

  const meta = (contract.liticapro_meta ?? {}) as Record<string, unknown>
  const provisioned = Boolean(meta.saas_provisioned_at || meta.saas_empresa_id)

  const loginUrl =
    process.env.LICITAPREGAO_LOGIN_URL?.trim() ||
    "https://licitapregao.xpresssolutions.com.br/login"

  return {
    ok: true,
    client_name: client.name,
    customer_type: parseCustomerType(liticaproData?.customer_type),
    states_of_interest: parseStatesOfInterest(liticaproData?.states_of_interest),
    credentials,
    login_url: loginUrl,
    provisioned,
  }
}
