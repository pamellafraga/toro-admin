import { NextRequest } from "next/server"
import { parseAuthCookie } from "@/lib/api/auth"
import { handleApiError, jsonError, jsonOk } from "@/lib/api/response"
import { logActivity } from "@/lib/activity-log"
import { duplicateClientMessage, findDuplicateClient } from "@/lib/clients/duplicate-check"
import { findClientByCpfCnpj, insertClient, updateClient } from "@/lib/db/repositories/clients.repository"
import { insertContract } from "@/lib/db/repositories/contracts.repository"
import { insertNfeDocument } from "@/lib/db/repositories/nfe.repository"
import { findOrCreateProductFromCatalog, findProductBySlug } from "@/lib/db/repositories/products.repository"
import { getProductBySlug } from "@/lib/products/catalog"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      productId,
      productSlug,
      client_name,
      client_email,
      client_phone,
      client_cpf_cnpj,
      address,
      number,
      district,
      city,
      state,
      zip_code,
      plan,
      payment_day,
      start_date,
      status: _status,
      payment_status,
      origem_captacao,
    } = body

    const auth = parseAuthCookie(req)
    const isComercial = auth?.role === "comercial" && auth.displayName
    const origemComercial = isComercial ? `Comercial - ${auth.displayName}` : (body.origem_comercial ?? null)

    if (!client_name?.trim()) return jsonError("Nome do cliente é obrigatório.", 400)

    let resolvedProductId: string | null = productId || null

    if (!resolvedProductId && productSlug) {
      const catalog = getProductBySlug(String(productSlug))
      if (catalog) {
        const product = await findOrCreateProductFromCatalog(catalog)
        resolvedProductId = product.id
      } else {
        const product = await findProductBySlug(String(productSlug))
        if (product) resolvedProductId = product.id
      }
    }

    if (!resolvedProductId) return jsonError("Informe o produto (productId ou productSlug).", 400)

    const planValues: Record<string, number> = { basic: 500, confort: 800, premium: 1500 }
    const selectedValue = planValues[plan]
    if (!selectedValue) return jsonError("Plano inválido.", 400)

    const cpfCnpjRaw = (client_cpf_cnpj || "").replace(/\D/g, "")
    if (!cpfCnpjRaw || (cpfCnpjRaw.length !== 11 && cpfCnpjRaw.length !== 14)) {
      return jsonError("CPF/CNPJ inválido.", 400)
    }

    const paymentMap: Record<string, string> = {
      paid: "em_dia",
      pending: "pendente",
      overdue: "atrasado",
      cancelado: "cancelado",
      cancelled: "cancelado",
      expirado: "expirado",
      expired: "expirado",
    }
    const paymentStatusDb = paymentMap[payment_status] ?? "em_dia"
    const contractStatus = paymentStatusDb === "em_dia" ? "aguardando_produto" : "inativa"
    const pagamentoPerdido = paymentStatusDb === "cancelado" || paymentStatusDb === "expirado"

    const parts = [address, number, district, city, state, zip_code].filter(Boolean)
    const fullAddress = parts.length ? parts.join(", ") : null

    const clientPayload = {
      name: client_name.trim(),
      email: (client_email || "").trim() || "",
      phone: (client_phone || "").trim() || "",
      cpf_cnpj: cpfCnpjRaw,
      address: fullAddress,
      number: number?.trim() || null,
      district: district?.trim() || null,
      city: city?.trim() || null,
      state: state?.trim() ? String(state).toUpperCase() : null,
      zip_code: zip_code?.trim() || null,
      origem_captacao: origem_captacao != null && String(origem_captacao).trim() ? String(origem_captacao).trim() : null,
      status_lead: pagamentoPerdido ? "perdido" : null,
    }

    const existing = await findClientByCpfCnpj(cpfCnpjRaw)
    let clientId: string
    const wasExistingClient = !!existing

    const duplicate = await findDuplicateClient({
      cpfCnpj: cpfCnpjRaw,
      phone: clientPayload.phone,
      email: clientPayload.email,
      excludeClientId: existing?.id ?? null,
    })
    if (duplicate) {
      return jsonError(duplicateClientMessage(duplicate), 409)
    }

    if (existing) {
      clientId = existing.id
      await updateClient(clientId, clientPayload)
    } else {
      const inserted = await insertClient(clientPayload)
      clientId = inserted.id
    }

    const paymentDay = Number(payment_day) || 10
    const contract = await insertContract({
      client_id: clientId,
      product_id: resolvedProductId,
      status: contractStatus,
      payment_status: paymentStatusDb,
      start_date: start_date || new Date().toISOString().slice(0, 10),
      monthly_value: selectedValue,
      notes: null,
      origem_comercial: origemComercial || null,
    })

    await logActivity(
      { displayName: auth?.displayName },
      {
        action: wasExistingClient
          ? `Cadastrou contrato/assinatura para ${client_name.trim()}`
          : `Cadastrou novo cliente e contrato: ${client_name.trim()}`,
        entity_type: "contract",
        entity_id: contract.id,
        details: { client_id: clientId, product_id: resolvedProductId },
      },
    )

    if (paymentStatusDb === "em_dia") {
      await insertNfeDocument({
        client_id: contract.client_id,
        client_name: client_name.trim(),
        total_value: selectedValue,
        nature_operation: "Prestação de serviços de software (SaaS)",
        cfop: "5933",
        status: "pendente",
        number: null,
        series: null,
        provider_id: null,
        provider_payload: {
          contract_id: contract.id,
          product_id: contract.product_id,
          payment_day: paymentDay,
          recipient: {
            document: cpfCnpjRaw,
            email: (client_email || "").trim() || null,
            street: address?.trim() || null,
            number: number?.trim() || null,
            district: district?.trim() || null,
            city: city?.trim() || null,
            state: state?.trim() ? String(state).toUpperCase() : null,
            zip_code: zip_code?.trim() || null,
          },
        },
        provider_response: null,
      })
    }

    return jsonOk({
      success: true,
      productId: resolvedProductId,
      existingClient: wasExistingClient,
      existingClientName: wasExistingClient ? existing?.name ?? null : null,
    })
  } catch (err) {
    console.error("Erro ao registrar assinatura:", err)
    return handleApiError(err, "Erro inesperado")
  }
}
