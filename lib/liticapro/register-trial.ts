import { duplicateClientMessage, findDuplicateClient } from "@/lib/clients/duplicate-check"
import {
  canComercialMutateClient,
  comercialMutateDeniedMessage,
  comercialOwnOrigem,
  resolveComercialOrigemOnUpdate,
} from "@/lib/clients/comercial-client-guard"
import { origemComercialFromCaptacao } from "@/lib/constants/origem-captacao"
import {
  findClientByCpfCnpj,
  findClientById,
  insertClient,
  updateClient,
} from "@/lib/db/repositories/clients.repository"
import {
  findLiticaProContractByClientId,
  insertContract,
  updateContract,
} from "@/lib/db/repositories/contracts.repository"
import { insertNotification } from "@/lib/db/repositories/notifications.repository"
import { findOrCreateProductFromCatalog } from "@/lib/db/repositories/products.repository"
import { buildGovFromSiteLinkedCompany } from "@/lib/liticapro/build-gov-from-site"
import { fetchCnpjFromGov } from "@/lib/liticapro/cnpj-lookup"
import { LITICAPRO_TRIAL_DAYS } from "@/lib/liticapro/constants"
import {
  mergeDeveloperCredentials,
  parseDeveloperCredentials,
  readDeveloperCredentialsFromLiticaProData,
} from "@/lib/liticapro/developer-credentials"
import { buildLiticaProCredentials } from "@/lib/liticapro/generate-credentials"
import {
  provisionLiticaProTenant,
  type ProvisionLiticaProResult,
} from "@/lib/liticapro/provision-licitapregao"
import { syncLiticaProTenantAfterAdminEdit } from "@/lib/liticapro/sync-licitapregao"
import { computeTrialEndsAt } from "@/lib/liticapro/trial"
import type { LiticaProDeveloperCredentials } from "@/lib/liticapro/types"
import { getProductBySlug } from "@/lib/products/catalog"
import { logActivity } from "@/lib/activity-log"
import { sendLiticaProWelcomeEmail } from "@/lib/send-licitapregao-welcome-email"

export type RegisterLiticaProTrialInput = {
  customer_type: "empresa" | "profissional_liberal"
  email: string
  phone: string
  origem_captacao: string
  states_of_interest: string[]
  cnpj?: string
  responsible_name?: string
  business_segment?: string
  company_name?: string
  company_gov?: Record<string, unknown> | null
  cpf?: string
  full_name?: string
  birth_date?: string
  linked_cnpjs?: Array<{
    cnpj?: string
    razao_social?: string
    ramo_atuacao?: string
    cnaes?: Array<{ codigo?: string; descricao?: string; principal?: boolean }>
  }>
  billing_address?: {
    cep?: string
    logradouro?: string
    numero?: string
    bairro?: string
    cidade?: string
    uf?: string
  }
  client_id?: string | null
  dados_desenvolvedor?: LiticaProDeveloperCredentials | null
  comercial_display_name?: string | null
  is_comercial_user?: boolean
  is_admin_user?: boolean
  activity_actor?: { displayName?: string }
  auto_provision?: boolean
  send_welcome_email?: boolean
}

export type RegisterLiticaProTrialSuccess = {
  success: true
  contract_id: string
  client_id: string
  client_name: string
  trial_ends_at: string
  trial_starts_at: string
  message: string
  credentials: LiticaProDeveloperCredentials
  provision?: ProvisionLiticaProResult
  login_url?: string
  welcome_email_sent: boolean
  welcome_email_error: string | null
}

export type RegisterLiticaProTrialFailure = {
  success: false
  error: string
  status: number
}

export type RegisterLiticaProTrialResult =
  | RegisterLiticaProTrialSuccess
  | RegisterLiticaProTrialFailure

function fail(error: string, status: number): RegisterLiticaProTrialFailure {
  return { success: false, error, status }
}

export async function registerLiticaProTrial(
  input: RegisterLiticaProTrialInput,
): Promise<RegisterLiticaProTrialResult> {
  const customerType = input.customer_type
  const email = String(input.email ?? "").trim().toLowerCase()
  const phone = String(input.phone ?? "").trim()
  let origemCaptacao = String(input.origem_captacao ?? "").trim()
  const statesOfInterest = (input.states_of_interest ?? [])
    .map((s) => String(s).toUpperCase().trim())
    .filter(Boolean)

  if (customerType !== "empresa" && customerType !== "profissional_liberal") {
    return fail("Selecione Empresa ou Profissional Liberal.", 400)
  }
  if (customerType === "empresa" && !email) return fail("E-mail principal é obrigatório.", 400)
  if (!phone) return fail("Telefone/WhatsApp é obrigatório.", 400)
  if (!origemCaptacao) return fail("Origem da captação é obrigatória.", 400)
  if (statesOfInterest.length === 0) return fail("Selecione ao menos um estado de interesse.", 400)

  const isComercialUser = input.is_comercial_user && input.comercial_display_name
  if (isComercialUser) {
    const own = comercialOwnOrigem(input.comercial_display_name!)
    if (origemCaptacao !== own) {
      return fail("Você só pode registrar compras com sua origem comercial.", 403)
    }
    origemCaptacao = own
  }

  const catalog = getProductBySlug("liticapro")
  if (!catalog) return fail("Produto LicitaPregão não configurado.", 500)
  const product = await findOrCreateProductFromCatalog(catalog)

  let cpfCnpjRaw = ""
  let clientName = ""
  let company: string | null = null
  let address: string | null = null
  let number: string | null = null
  let district: string | null = null
  let city: string | null = null
  let state: string | null = null
  let zipCode: string | null = null

  let liticaproData: Record<string, unknown> = {
    customer_type: customerType,
    states_of_interest: statesOfInterest,
    origem_captacao: origemCaptacao,
  }

  if (customerType === "empresa") {
    const cnpj = String(input.cnpj ?? "").replace(/\D/g, "")
    const responsibleName = String(input.responsible_name ?? "").trim()
    const businessSegment = String(input.business_segment ?? "").trim()
    let companyGov = input.company_gov

    if (cnpj.length !== 14) return fail("CNPJ inválido.", 400)

    if (!companyGov?.razao_social) {
      companyGov = await fetchCnpjFromGov(cnpj)
    }
    if (!companyGov?.razao_social) {
      return fail(
        "Não foi possível consultar este CNPJ na Receita. Verifique o número ou tente novamente.",
        400,
      )
    }
    if (!responsibleName) return fail("Nome do responsável é obrigatório.", 400)
    if (!businessSegment) return fail("Ramo de atuação é obrigatório.", 400)

    cpfCnpjRaw = cnpj
    clientName = String(companyGov.razao_social || input.company_name || "").trim() || cnpj
    company = String(companyGov.nome_fantasia || companyGov.razao_social || clientName)
    address = (companyGov.logradouro as string | null) ?? null
    number = (companyGov.numero as string | null) ?? null
    district = (companyGov.bairro as string | null) ?? null
    city = (companyGov.municipio as string | null) ?? null
    state = (companyGov.uf as string | null) ?? null
    zipCode = (companyGov.cep as string | null) ?? null

    liticaproData.responsible_name = responsibleName
    liticaproData.business_segment = businessSegment
    liticaproData.company_gov = companyGov ?? null

    const billing = input.billing_address
    if (billing) {
      address = billing.logradouro?.trim() || address
      number = billing.numero?.trim() || number
      district = billing.bairro?.trim() || district
      city = billing.cidade?.trim() || city
      state = billing.uf?.trim().toUpperCase() || state
      zipCode = String(billing.cep ?? "").replace(/\D/g, "") || zipCode
      liticaproData.billing_address = billing
    }
  } else {
    const cpf = String(input.cpf ?? "").replace(/\D/g, "")
    const fullName = String(input.full_name ?? "").trim()
    const birthDate = String(input.birth_date ?? "").trim()
    const linkedCnpjsInput = Array.isArray(input.linked_cnpjs) ? input.linked_cnpjs : []
    const billing = input.billing_address

    if (cpf.length !== 11) return fail("CPF inválido.", 400)
    if (!fullName) return fail("Nome completo é obrigatório.", 400)
    if (!birthDate) return fail("Data de nascimento é obrigatória.", 400)
    if (linkedCnpjsInput.length === 0) return fail("Informe ao menos um CNPJ vinculado.", 400)
    if (!linkedCnpjsInput.some((x) => x?.razao_social || x?.cnpj)) {
      return fail("Consulte pelo menos um CNPJ válido na Receita Federal.", 400)
    }
    const missingRamo = linkedCnpjsInput.some((x) => !(String(x.ramo_atuacao ?? "").trim()))
    if (missingRamo) return fail("Informe o ramo de atuação para cada CNPJ vinculado.", 400)
    if (!billing?.cep || String(billing.cep).replace(/\D/g, "").length !== 8) {
      return fail("Informe o CEP do endereço de cobrança.", 400)
    }
    if (!billing.logradouro?.trim()) return fail("Informe o endereço de cobrança.", 400)
    if (!billing.numero?.trim()) return fail("Informe o número do endereço de cobrança.", 400)
    if (!billing.bairro?.trim()) return fail("Informe o bairro do endereço de cobrança.", 400)
    if (!billing.cidade?.trim()) return fail("Informe a cidade do endereço de cobrança.", 400)
    if (!billing.uf?.trim()) return fail("Informe a UF do endereço de cobrança.", 400)

    const enrichedLinkedCnpjs = await Promise.all(
      linkedCnpjsInput.map(async (item) => {
        const cnpj = String(item.cnpj ?? "").replace(/\D/g, "")
        if (cnpj.length === 14) {
          const gov = await fetchCnpjFromGov(cnpj)
          if (gov) {
            return {
              ...gov,
              razao_social: item.razao_social || gov.razao_social,
              ramo_atuacao: item.ramo_atuacao,
            }
          }
        }

        const fromSite = buildGovFromSiteLinkedCompany(item)
        if (fromSite) {
          return {
            ...fromSite,
            ramo_atuacao: item.ramo_atuacao,
          }
        }

        return item
      }),
    )

    cpfCnpjRaw = cpf
    clientName = fullName
    address = billing.logradouro?.trim() ?? null
    number = billing.numero?.trim() ?? null
    district = billing.bairro?.trim() ?? null
    city = billing.cidade?.trim() ?? null
    state = billing.uf?.trim().toUpperCase() ?? null
    zipCode = String(billing.cep ?? "").replace(/\D/g, "") || null

    liticaproData.birth_date = birthDate
    liticaproData.linked_cnpjs = enrichedLinkedCnpjs
    liticaproData.business_segment = String(enrichedLinkedCnpjs[0]?.ramo_atuacao ?? "").trim()
    liticaproData.billing_address = billing
  }

  const linkedClientId = String(input.client_id ?? "").trim() || null
  const existingByLink = linkedClientId ? await findClientById(linkedClientId) : null
  const existingByCpf = await findClientByCpfCnpj(cpfCnpjRaw)

  if (existingByLink && existingByCpf && existingByLink.id !== existingByCpf.id) {
    return fail(
      `Este CNPJ/CPF já está em outro contato (${existingByCpf.name}). Desvincule ou use o contato correto.`,
      409,
    )
  }

  const existingRow = existingByLink ?? existingByCpf
  const existing = existingRow
    ? {
        id: existingRow.id,
        name: existingRow.name,
        origem_captacao: existingRow.origem_captacao,
        liticapro_data: existingRow.liticapro_data as Record<string, unknown> | null,
      }
    : null

  if (isComercialUser && existing) {
    if (!canComercialMutateClient(input.comercial_display_name!, existing.origem_captacao)) {
      return fail(comercialMutateDeniedMessage(), 403)
    }
  }

  if (existing?.liticapro_data) {
    liticaproData = { ...existing.liticapro_data, ...liticaproData }
  }

  if (input.is_admin_user) {
    const incoming = parseDeveloperCredentials(input.dados_desenvolvedor)
    const existingDev = existingRow
      ? readDeveloperCredentialsFromLiticaProData(existingRow.liticapro_data)
      : null
    const merged = mergeDeveloperCredentials(existingDev, incoming)
    if (merged) liticaproData.dados_desenvolvedor = merged
  } else {
    delete liticaproData.dados_desenvolvedor
  }

  const parts = [address, number, district, city, state, zipCode].filter(Boolean)
  const fullAddress = parts.length ? parts.join(", ") : null

  const clientPayload = {
    name: clientName,
    email: email || "",
    phone,
    cpf_cnpj: cpfCnpjRaw,
    company,
    address: fullAddress,
    number,
    district,
    city,
    state,
    zip_code: zipCode,
    origem_captacao: origemCaptacao,
    status_lead: "ativo",
    liticapro_data: liticaproData,
  }

  if (existing && isComercialUser) {
    const resolved = resolveComercialOrigemOnUpdate(
      input.comercial_display_name!,
      existing.origem_captacao,
      origemCaptacao,
    )
    if (!resolved.ok) return fail(resolved.error, 403)
    clientPayload.origem_captacao = resolved.value ?? origemCaptacao
  } else if (existing && (existing.origem_captacao ?? "").trim()) {
    clientPayload.origem_captacao = existing.origem_captacao!.trim()
  }

  const duplicate = await findDuplicateClient({
    cpfCnpj: cpfCnpjRaw,
    phone: clientPayload.phone,
    email: clientPayload.email,
    excludeClientId: existing?.id ?? null,
  })
  if (duplicate) {
    return fail(duplicateClientMessage(duplicate), 409)
  }

  let clientId: string
  if (existing) {
    clientId = existing.id
    await updateClient(clientId, clientPayload)
  } else {
    const inserted = await insertClient(clientPayload)
    clientId = inserted.id
  }

  const registeredAt = new Date()
  const startDate = registeredAt.toISOString().slice(0, 10)
  const trialEnds = computeTrialEndsAt(registeredAt)

  const origemComercial = isComercialUser
    ? `Comercial - ${input.comercial_display_name}`
    : origemComercialFromCaptacao(origemCaptacao)

  const credentials = buildLiticaProCredentials({
    customer_type: customerType,
    empresa_nome: clientName,
    responsible_or_full_name:
      customerType === "empresa"
        ? String(liticaproData.responsible_name ?? clientName)
        : clientName,
    cpf_digits: customerType === "profissional_liberal" ? cpfCnpjRaw : undefined,
    existing: readDeveloperCredentialsFromLiticaProData(liticaproData),
  })

  liticaproData.dados_desenvolvedor = credentials

  await updateClient(clientId, {
    ...clientPayload,
    liticapro_data: liticaproData,
  })

  const liticaproMeta = {
    customer_type: customerType,
    trial_days: LITICAPRO_TRIAL_DAYS,
    states_of_interest: statesOfInterest,
    registered_at: registeredAt.toISOString(),
  }

  const existingContract = await findLiticaProContractByClientId(clientId, product.id)
  let contract: { id: string }

  if (existingContract) {
    await updateContract(existingContract.id, {
      status: "trial",
      payment_status: "trial",
      start_date: startDate,
      monthly_value: 0,
      notes: `Teste grátis ${LITICAPRO_TRIAL_DAYS} dias — aguardando escolha de plano`,
      trial_ends_at: trialEnds.toISOString(),
      liticapro_meta: {
        ...(existingContract.liticapro_meta ?? {}),
        ...liticaproMeta,
      },
    })
    contract = { id: existingContract.id }
  } else {
    contract = await insertContract({
      client_id: clientId,
      product_id: product.id,
      status: "trial",
      payment_status: "trial",
      start_date: startDate,
      monthly_value: 0,
      notes: `Teste grátis ${LITICAPRO_TRIAL_DAYS} dias — aguardando escolha de plano`,
      origem_comercial: origemComercial,
      trial_ends_at: trialEnds.toISOString(),
      plan: null,
      liticapro_meta: liticaproMeta,
    })
  }

  let provision: ProvisionLiticaProResult | undefined
  let loginUrl =
    process.env.LICITAPREGAO_LOGIN_URL?.trim() ||
    "https://licitapregao.xpresssolutions.com.br/login"

  if (input.auto_provision !== false) {
    provision = await provisionLiticaProTenant({
      customer_type: customerType,
      email,
      trial_starts_at: startDate,
      trial_ends_at: trialEnds.toISOString(),
      states_of_interest: statesOfInterest,
      credentials,
      external_client_id: clientId,
      external_contract_id: contract.id,
      cnpj: customerType === "empresa" ? cpfCnpjRaw : null,
      company_name: clientName,
      phone,
      client_name: clientName,
      address: {
        zip_code: zipCode,
        address,
        number,
        district,
        city,
        state,
      },
      business_segment: String(liticaproData.business_segment ?? "").trim() || undefined,
      company_gov:
        customerType === "empresa"
          ? ((liticaproData.company_gov as import("@/lib/liticapro/types").CnpjGovData | null) ??
            null)
          : null,
      linked_cnpjs: Array.isArray(liticaproData.linked_cnpjs)
        ? (liticaproData.linked_cnpjs as Array<Record<string, unknown>>)
        : undefined,
    })

    if (provision.ok) {
      loginUrl = provision.login_url
      await updateContract(contract.id, {
        liticapro_meta: {
          ...liticaproMeta,
          saas_empresa_id: provision.empresa_id,
          saas_usuario_id: provision.usuario_id,
          saas_provisioned_at: new Date().toISOString(),
        },
      })
      await syncLiticaProTenantAfterAdminEdit(contract.id).catch((err) => {
        console.error("[register-trial] sync pós-provisionamento:", err)
      })
    } else if (!provision.skipped) {
      return fail(
        `Cliente registrado no painel, mas falha ao criar acesso na ferramenta: ${provision.error}`,
        502,
      )
    }
  }

  const trialLabel = trialEnds.toLocaleDateString("pt-BR")
  let welcomeEmailSent = false
  let welcomeEmailError: string | null = null
  let contractMeta: Record<string, unknown> = {
    ...liticaproMeta,
    ...(provision?.ok
      ? {
          saas_empresa_id: provision.empresa_id,
          saas_usuario_id: provision.usuario_id,
          saas_provisioned_at: new Date().toISOString(),
        }
      : {}),
  }

  if (input.send_welcome_email !== false && email && provision?.ok) {
    const emailResult = await sendLiticaProWelcomeEmail({
      to: email,
      clientName,
      credentials,
      loginUrl,
      customerType,
      statesOfInterest: statesOfInterest,
    })
    welcomeEmailSent = emailResult.ok
    welcomeEmailError = emailResult.ok ? null : emailResult.error ?? "Falha ao enviar e-mail."

    if (emailResult.ok) {
      contractMeta = {
        ...contractMeta,
        welcome_email_sent_at: new Date().toISOString(),
        welcome_email_channel: emailResult.channel ?? null,
      }
      await updateContract(contract.id, { liticapro_meta: contractMeta })
    } else {
      console.error("[register-trial] Falha no e-mail de boas-vindas:", welcomeEmailError)
    }
  }

  await insertNotification({
    title: "LicitaPregão — novo teste grátis",
    message: `${clientName} cadastrado em ${registeredAt.toLocaleDateString("pt-BR")}. Teste de ${LITICAPRO_TRIAL_DAYS} dias expira em ${trialLabel}.`,
    type: "info",
    link: "/dashboard/produtos/liticapro",
  })

  await logActivity(input.activity_actor ?? null, {
    action: `Cadastrou teste LicitaPregão (${customerType}): ${clientName}`,
    entity_type: "contract",
    entity_id: contract.id,
    details: {
      client_id: clientId,
      trial_ends_at: trialEnds.toISOString(),
      origem: origemCaptacao,
      provisioned: provision?.ok === true,
      welcome_email_sent: welcomeEmailSent,
      welcome_email_error: welcomeEmailError,
      states_of_interest: statesOfInterest,
    },
  })

  return {
    success: true,
    contract_id: contract.id,
    client_id: clientId,
    client_name: clientName,
    trial_ends_at: trialEnds.toISOString(),
    trial_starts_at: startDate,
    credentials,
    provision,
    login_url: loginUrl,
    welcome_email_sent: welcomeEmailSent,
    welcome_email_error: welcomeEmailError,
    message: `Teste grátis de ${LITICAPRO_TRIAL_DAYS} dias iniciado (cadastro ${registeredAt.toLocaleDateString("pt-BR")}). Expira em ${trialLabel}.`,
  }
}
