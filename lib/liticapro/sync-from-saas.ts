import {
  getClientLiticaProData,
  updateClientDeveloperCredentials,
  updateClientForContract,
  updateClientLiticaProData,
} from "@/lib/db/repositories/clients.repository"
import { findContractWithProduct, updateContract } from "@/lib/db/repositories/contracts.repository"
import {
  mergeDeveloperCredentials,
  readDeveloperCredentialsFromLiticaProData,
} from "@/lib/liticapro/developer-credentials"
import { queryOne } from "@/lib/db/pool"
import { buildGovFromSiteLinkedCompany } from "@/lib/liticapro/build-gov-from-site"
import { enrichLinkedCnpjs } from "@/lib/liticapro/enrich-linked-cnpjs"
import { labelRamoNegocio } from "@/lib/liticapro/ramo-labels"
import type { CnpjGovData, LiticaProSaaSUser } from "@/lib/liticapro/types"

export type SyncFromSaaSInput = {
  empresa_id: string
  usuario_id?: string
  customer_type: "empresa" | "profissional_liberal"
  email: string
  phone?: string
  client_name?: string
  usuario: string
  credentials_empresa?: string
  nova_senha?: string
  trial_ends_at?: string
  states_of_interest?: string[]
  business_segment?: string
  address?: {
    cep?: string
    endereco_sede?: string
    cidade?: string
    uf?: string
  }
  cnpj?: string
  cnaes?: string[]
  empresas_vinculadas?: Array<{
    cnpj?: string
    razao_social?: string
    ramo_id?: string
    ramo_atuacao?: string
    ufs?: string[]
    states?: string[]
    cnaes?: Array<{ codigo?: string; descricao?: string; principal?: boolean }>
  }>
  admin_client_id?: string
  admin_contract_id?: string
  saas_user_append?: {
    saas_usuario_id: string
    email: string
    usuario: string
    senha?: string
    full_name?: string
    cpf?: string
    birth_date?: string
    empresa_login?: string
  }
}

export type SyncFromSaaSResult =
  | { ok: true; client_id: string; contract_id: string }
  | { ok: false; error: string; status: number }

function parseEnderecoSede(enderecoSede?: string) {
  const raw = String(enderecoSede ?? "").trim()
  if (!raw) return { address: null as string | null, number: null as string | null, district: null as string | null }
  const parts = raw.split(",").map((p) => p.trim()).filter(Boolean)
  if (parts.length >= 3) {
    return { address: parts[0], number: parts[1], district: parts.slice(2).join(", ") }
  }
  if (parts.length === 2) {
    return { address: parts[0], number: parts[1], district: null }
  }
  return { address: raw, number: null, district: null }
}

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

function buildLinkedCnpjs(
  empresas: SyncFromSaaSInput["empresas_vinculadas"],
  businessSegment?: string,
) {
  if (!Array.isArray(empresas)) return undefined
  return empresas
    .map((item) => {
      const cnpj = String(item.cnpj ?? "").replace(/\D/g, "")
      const razao_social = String(item.razao_social ?? "").trim()
      const ramo_atuacao =
        String(item.ramo_atuacao ?? "").trim() ||
        (item.ramo_id ? labelRamoNegocio(item.ramo_id) : "") ||
        businessSegment ||
        "Licitações públicas"
      const states = Array.isArray(item.ufs)
        ? item.ufs.map((uf) => String(uf).trim().toUpperCase()).filter(Boolean)
        : Array.isArray(item.states)
          ? item.states.map((uf) => String(uf).trim().toUpperCase()).filter(Boolean)
          : []
      const cnaes = Array.isArray(item.cnaes) ? item.cnaes : []

      const gov = buildGovFromSiteLinkedCompany({
        cnpj,
        razao_social,
        ramo_atuacao,
        cnaes,
      })

      if (gov) {
        return {
          ...gov,
          ramo_atuacao,
          ...(states.length > 0 ? { states } : {}),
          ...(cnaes.length > 0 ? { cnaes } : {}),
        }
      }

      return {
        cnpj,
        razao_social,
        ramo_atuacao,
        ...(states.length > 0 ? { states } : {}),
        ...(cnaes.length > 0 ? { cnaes } : {}),
      }
    })
    .filter((item) => String(item.cnpj ?? "").replace(/\D/g, "").length === 14 && item.razao_social)
}

function buildCompanyGov(cnpj?: string, cnaes?: string[], razaoSocial?: string) {
  const digits = String(cnpj ?? "").replace(/\D/g, "")
  if (!digits && (!cnaes || cnaes.length === 0)) return null
  const principal = cnaes?.[0]
  return {
    cnpj: digits,
    razao_social: razaoSocial ?? "",
    nome_fantasia: null,
    logradouro: null,
    numero: null,
    bairro: null,
    municipio: null,
    uf: null,
    cep: null,
    cnae_fiscal: principal ? Number(principal.replace(/\D/g, "").padStart(7, "0").slice(0, 7)) : null,
    cnae_fiscal_descricao: null,
    cnaes_secundarios: (cnaes ?? []).slice(1).map((codigo) => ({
      codigo: Number(codigo.replace(/\D/g, "").padStart(7, "0").slice(0, 7)),
      descricao: "",
    })),
    descricao_situacao_cadastral: null,
  }
}

async function appendSaasUserToClient(
  clientId: string,
  contractId: string,
  user: NonNullable<SyncFromSaaSInput["saas_user_append"]>,
  empresaNome: string,
): Promise<void> {
  const liticaproRow = await getClientLiticaProData(clientId)
  const existingData = liticaproRow?.liticapro_data ?? {}
  const existingUsers = Array.isArray(existingData.saas_users)
    ? ([...existingData.saas_users] as LiticaProSaaSUser[])
    : []

  const email = user.email.trim().toLowerCase()
  const cpf = String(user.cpf ?? "").replace(/\D/g, "")
  const newUser: LiticaProSaaSUser = {
    cpf,
    full_name: user.full_name?.trim() || user.usuario.trim(),
    birth_date: user.birth_date?.trim() || "",
    email,
    is_owner: false,
    credentials: {
      empresa: user.empresa_login?.trim() || empresaNome,
      usuario: user.usuario.trim(),
      senha: user.senha?.trim() || "",
    },
    saas_usuario_id: user.saas_usuario_id,
    welcome_email_sent_at: null,
  }

  const idx = existingUsers.findIndex(
    (row) =>
      row.saas_usuario_id === user.saas_usuario_id ||
      row.email?.trim().toLowerCase() === email,
  )

  if (idx >= 0) {
    const prev = existingUsers[idx]
    existingUsers[idx] = {
      ...prev,
      ...newUser,
      credentials: {
        ...prev.credentials,
        ...newUser.credentials,
        senha: newUser.credentials.senha || prev.credentials?.senha || "",
      },
    }
  } else {
    existingUsers.push(newUser)
  }

  await updateClientLiticaProData(clientId, { saas_users: existingUsers })

  const contract = await findContractWithProduct(contractId)
  const meta = { ...(contract?.liticapro_meta ?? {}) }
  const ids = [
    ...new Set(
      existingUsers
        .map((row) => row.saas_usuario_id)
        .filter((id): id is string => Boolean(id)),
    ),
  ]

  await updateContract(contractId, {
    liticapro_meta: {
      ...meta,
      saas_usuario_ids: ids,
      saas_last_sync_at: new Date().toISOString(),
    },
  })
}

export async function syncLiticaProFromSaaS(
  input: SyncFromSaaSInput,
): Promise<SyncFromSaaSResult> {
  const empresaId = input.empresa_id.trim()
  if (!empresaId) {
    return { ok: false, error: "empresa_id é obrigatório.", status: 400 }
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

  const endereco = parseEnderecoSede(input.address?.endereco_sede)
  const clientName =
    input.client_name?.trim() ||
    (input.customer_type === "empresa" ? input.credentials_empresa : input.usuario) ||
    "Cliente LicitaPregão"

  const liticaproRow = await getClientLiticaProData(clientId)
  const existingData = liticaproRow?.liticapro_data ?? {}
  const existingDev = readDeveloperCredentialsFromLiticaProData(existingData)
  const credEmpresa =
    input.credentials_empresa?.trim() ||
    existingDev?.empresa ||
    (input.customer_type === "profissional_liberal" ? "" : clientName)

  await updateClientForContract(clientId, {
    name: clientName,
    email: input.email.trim() || null,
    phone: input.phone?.trim() || null,
    address: endereco.address,
    number: endereco.number,
    district: endereco.district,
    city: input.address?.cidade?.trim() || null,
    state: input.address?.uf?.trim()?.toUpperCase() || null,
    zip_code: String(input.address?.cep ?? "").replace(/\D/g, "") || null,
    origem_captacao: null,
    status_lead: null,
  })

  let linkedCnpjs = buildLinkedCnpjs(input.empresas_vinculadas, input.business_segment)
  if (linkedCnpjs?.length) {
    linkedCnpjs = await enrichLinkedCnpjs(linkedCnpjs)
  }

  let companyGov: CnpjGovData | null =
    input.customer_type === "empresa"
      ? buildCompanyGov(input.cnpj, input.cnaes, input.credentials_empresa || clientName)
      : null

  if (
    input.customer_type === "profissional_liberal" &&
    linkedCnpjs?.length
  ) {
    const first = linkedCnpjs[0]
    if (first.cnae_fiscal || first.cnae_fiscal_descricao || first.cnaes_secundarios) {
      companyGov = first as CnpjGovData
    }
  }

  const liticaproPatch: Record<string, unknown> = {
    customer_type: input.customer_type,
    business_segment: input.business_segment?.trim() || undefined,
    states_of_interest: input.states_of_interest ?? undefined,
    company_gov: companyGov ?? undefined,
    billing_address: input.address?.cep
      ? {
          cep: String(input.address.cep).replace(/\D/g, ""),
          logradouro: endereco.address ?? "",
          numero: endereco.number ?? "",
          bairro: endereco.district ?? "",
          cidade: input.address.cidade ?? "",
          uf: input.address.uf ?? "",
        }
      : undefined,
    saas_last_sync_at: new Date().toISOString(),
    saas_last_sync_source: "ferramenta",
  }

  if (linkedCnpjs?.length) {
    liticaproPatch.linked_cnpjs = linkedCnpjs
  }

  await updateClientLiticaProData(clientId, liticaproPatch)

  const mergedDev = mergeDeveloperCredentials(existingDev, {
    empresa: credEmpresa,
    usuario: input.usuario.trim(),
    senha: input.nova_senha?.trim() || "",
  })

  if (mergedDev && (mergedDev.empresa || mergedDev.usuario || mergedDev.senha)) {
    await updateClientDeveloperCredentials(clientId, mergedDev)
  }

  const meta = {
    ...(contract.liticapro_meta ?? {}),
    saas_empresa_id: empresaId,
    ...(input.usuario_id ? { saas_usuario_id: input.usuario_id } : {}),
    states_of_interest: input.states_of_interest ?? undefined,
    customer_type: input.customer_type,
    saas_last_sync_at: new Date().toISOString(),
  }

  await updateContract(contractId, {
    trial_ends_at: input.trial_ends_at?.trim() || undefined,
    liticapro_meta: meta,
  })

  if (input.saas_user_append && input.customer_type === "empresa") {
    await appendSaasUserToClient(
      clientId,
      contractId,
      input.saas_user_append,
      credEmpresa || clientName,
    )
  }

  return { ok: true, client_id: clientId, contract_id: contractId }
}
