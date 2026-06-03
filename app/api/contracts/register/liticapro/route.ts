import { NextRequest } from "next/server"
import { parseAuthCookie, isAdmin } from "@/lib/api/auth"
import { handleApiError, jsonError, jsonOk } from "@/lib/api/response"
import { logActivity } from "@/lib/activity-log"
import { deleteUserByUsername } from "@/lib/db/repositories/dashboard-users.repository"
import { duplicateClientMessage, findDuplicateClient } from "@/lib/clients/duplicate-check"
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
import { LITICAPRO_TRIAL_DAYS } from "@/lib/liticapro/constants"
import { computeTrialEndsAt } from "@/lib/liticapro/trial"
import { fetchCnpjFromGov } from "@/lib/liticapro/cnpj-lookup"
import { parseDeveloperCredentials, mergeDeveloperCredentials, readDeveloperCredentialsFromLiticaProData } from "@/lib/liticapro/developer-credentials"
import { origemComercialFromCaptacao } from "@/lib/constants/origem-captacao"
import {
  canComercialMutateClient,
  comercialMutateDeniedMessage,
  comercialOwnOrigem,
  resolveComercialOrigemOnUpdate,
} from "@/lib/clients/comercial-client-guard"
import { getProductBySlug } from "@/lib/products/catalog"

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

    const email = String(body.email ?? "").trim().toLowerCase()
    const phone = String(body.phone ?? "").trim()
    let origemCaptacao = String(body.origem_captacao ?? "").trim()
    const statesOfInterest = Array.isArray(body.states_of_interest)
      ? (body.states_of_interest as string[]).map((s) => String(s).toUpperCase()).filter(Boolean)
      : []

    if (customerType === "empresa" && !email) return jsonError("E-mail principal é obrigatório.", 400)
    if (!phone) return jsonError("Telefone/WhatsApp é obrigatório.", 400)
    if (!origemCaptacao) return jsonError("Origem da captação é obrigatória.", 400)
    if (statesOfInterest.length === 0) return jsonError("Selecione ao menos um estado de interesse.", 400)

    const isComercialUser = auth?.role === "comercial" && auth.displayName
    if (isComercialUser) {
      const own = comercialOwnOrigem(auth.displayName!)
      if (origemCaptacao !== own) {
        return jsonError("Você só pode registrar compras com sua origem comercial.", 403)
      }
      origemCaptacao = own
    }

    const catalog = getProductBySlug("liticapro")
    if (!catalog) return jsonError("Produto LiticaPro não configurado.", 500)
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
      const cnpj = String(body.cnpj ?? "").replace(/\D/g, "")
      const responsibleName = String(body.responsible_name ?? "").trim()
      const businessSegment = String(body.business_segment ?? "").trim()
      let companyGov = body.company_gov as Record<string, unknown> | null | undefined

      if (cnpj.length !== 14) return jsonError("CNPJ inválido.", 400)

      if (!companyGov?.razao_social) {
        companyGov = await fetchCnpjFromGov(cnpj)
      }
      if (!companyGov?.razao_social) {
        return jsonError("Não foi possível consultar este CNPJ na Receita. Verifique o número ou tente novamente.", 400)
      }
      if (!responsibleName) return jsonError("Nome do responsável é obrigatório.", 400)
      if (!businessSegment) return jsonError("Ramo de atuação é obrigatório.", 400)

      cpfCnpjRaw = cnpj
      clientName = companyGov?.razao_social || String(body.company_name ?? "").trim() || cnpj
      company = companyGov?.nome_fantasia || companyGov?.razao_social || clientName
      address = companyGov?.logradouro ?? null
      number = companyGov?.numero ?? null
      district = companyGov?.bairro ?? null
      city = companyGov?.municipio ?? null
      state = companyGov?.uf ?? null
      zipCode = companyGov?.cep ?? null

      liticaproData.responsible_name = responsibleName
      liticaproData.business_segment = businessSegment
      liticaproData.company_gov = companyGov ?? null
    } else {
      const cpf = String(body.cpf ?? "").replace(/\D/g, "")
      const fullName = String(body.full_name ?? "").trim()
      const birthDate = String(body.birth_date ?? "").trim()
      const linkedCnpjs = Array.isArray(body.linked_cnpjs) ? body.linked_cnpjs : []
      if (cpf.length !== 11) return jsonError("CPF inválido.", 400)
      if (!fullName) return jsonError("Nome completo é obrigatório.", 400)
      if (!birthDate) return jsonError("Data de nascimento é obrigatória.", 400)
      if (linkedCnpjs.length === 0) return jsonError("Informe ao menos um CNPJ vinculado.", 400)
      if (!linkedCnpjs.some((x: { razao_social?: string; cnpj?: string }) => x?.razao_social || x?.cnpj)) {
        return jsonError("Consulte pelo menos um CNPJ válido na Receita Federal.", 400)
      }
      const missingRamo = linkedCnpjs.some(
        (x: { ramo_atuacao?: string }) => !(String(x.ramo_atuacao ?? "").trim()),
      )
      if (missingRamo) return jsonError("Informe o ramo de atuação para cada CNPJ vinculado.", 400)

      cpfCnpjRaw = cpf
      clientName = fullName

      liticaproData.birth_date = birthDate
      liticaproData.linked_cnpjs = linkedCnpjs
    }

    const linkedClientId = String(body.client_id ?? "").trim() || null
    const existingByLink = linkedClientId ? await findClientById(linkedClientId) : null
    const existingByCpf = await findClientByCpfCnpj(cpfCnpjRaw)

    if (
      existingByLink &&
      existingByCpf &&
      existingByLink.id !== existingByCpf.id
    ) {
      return jsonError(
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
      if (!canComercialMutateClient(auth!.displayName!, existing.origem_captacao)) {
        return jsonError(comercialMutateDeniedMessage(), 403)
      }
    }

    if (existing?.liticapro_data) {
      liticaproData = { ...existing.liticapro_data, ...liticaproData }
    }

    if (isAdmin(req)) {
      const incoming = parseDeveloperCredentials(body.dados_desenvolvedor)
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
        auth!.displayName!,
        existing.origem_captacao,
        origemCaptacao,
      )
      if (!resolved.ok) return jsonError(resolved.error, 403)
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
      return jsonError(duplicateClientMessage(duplicate), 409)
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

    const isComercial = auth?.role === "comercial" && auth.displayName
    const origemComercial = isComercial
      ? `Comercial - ${auth.displayName}`
      : origemComercialFromCaptacao(origemCaptacao)

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

    const trialLabel = trialEnds.toLocaleDateString("pt-BR")
    await insertNotification({
      title: "LiticaPro — novo teste grátis",
      message: `${clientName} cadastrado em ${registeredAt.toLocaleDateString("pt-BR")}. Teste de ${LITICAPRO_TRIAL_DAYS} dias expira em ${trialLabel}. Após expirar, entre em contato para verificar renovação.`,
      type: "info",
      link: "/dashboard/produtos/liticapro",
    })

    await logActivity(
      { displayName: auth?.displayName },
      {
        action: `Cadastrou teste LiticaPro (${customerType}): ${clientName}`,
        entity_type: "contract",
        entity_id: contract.id,
        details: { client_id: clientId, trial_ends_at: trialEnds.toISOString() },
      },
    )

    await deleteUserByUsername("Lisete")

    return jsonOk({
      success: true,
      contract_id: contract.id,
      client_id: clientId,
      trial_ends_at: trialEnds.toISOString(),
      message: `Teste grátis de ${LITICAPRO_TRIAL_DAYS} dias iniciado (cadastro ${registeredAt.toLocaleDateString("pt-BR")}). Expira em ${trialLabel}.`,
    })
  } catch (err) {
    console.error("register/liticapro:", err)
    return handleApiError(err, "Erro ao registrar LiticaPro.")
  }
}
