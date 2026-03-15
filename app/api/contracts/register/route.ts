import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { logActivity } from "@/lib/activity-log"

function getAuthFromCookie(req: NextRequest): { role?: string; displayName?: string } {
  try {
    const cookie = req.cookies.get("xpress_auth")?.value
    if (!cookie) return {}
    const parsed = JSON.parse(cookie)
    return { role: parsed.role, displayName: parsed.displayName ?? parsed.user }
  } catch {
    return {}
  }
}

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
      status,
      payment_status,
      origem_captacao,
    } = body
    const auth = getAuthFromCookie(req)
    const isComercial = auth.role === "comercial" && auth.displayName
    const origemComercial = isComercial ? `Comercial - ${auth.displayName}` : (body.origem_comercial ?? null)

    if (!client_name?.trim()) {
      return NextResponse.json(
        { error: "Nome do cliente é obrigatório." },
        { status: 400 },
      )
    }

    const supabase = await createClient()
    let resolvedProductId: string | null = productId || null

    if (!resolvedProductId && productSlug) {
      const { data: existingProduct } = await supabase
        .from("products")
        .select("id")
        .eq("name", "Software de Gestão")
        .limit(1)
        .maybeSingle()
      if (existingProduct) {
        resolvedProductId = existingProduct.id
      } else {
        const { data: created, error: createErr } = await supabase
          .from("products")
          .insert({
            name: "Software de Gestão",
            description: "Apólice de Seguro - Modalidade Garantias",
            icon: "monitor",
          })
          .select("id")
          .single()
        if (createErr) {
          return NextResponse.json(
            { error: "Erro ao obter/criar produto: " + createErr.message },
            { status: 500 },
          )
        }
        resolvedProductId = created.id
      }
    }

    if (!resolvedProductId) {
      return NextResponse.json(
        { error: "Informe o produto (productId ou productSlug)." },
        { status: 400 },
      )
    }

    const planValues: Record<string, number> = {
      basic: 500,
      confort: 800,
      premium: 1500,
    }
    const selectedValue = planValues[plan]
    if (!selectedValue) {
      return NextResponse.json(
        { error: "Plano inválido." },
        { status: 400 },
      )
    }

    const cpfCnpjRaw = (client_cpf_cnpj || "").replace(/\D/g, "")
    if (!cpfCnpjRaw || (cpfCnpjRaw.length !== 11 && cpfCnpjRaw.length !== 14)) {
      return NextResponse.json(
        { error: "CPF/CNPJ inválido." },
        { status: 400 },
      )
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
    const clientPayload: Record<string, unknown> = {
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
    }
    if (origem_captacao != null && String(origem_captacao).trim()) {
      clientPayload.origem_captacao = String(origem_captacao).trim()
    }
    if (pagamentoPerdido) {
      clientPayload.status_lead = "perdido"
    }

    let clientId: string

    const { data: existing } = await supabase
      .from("clients")
      .select("id, name")
      .eq("cpf_cnpj", cpfCnpjRaw)
      .maybeSingle()

    if (existing) {
      clientId = existing.id
      const updatePayload: Record<string, unknown> = {
        name: client_name.trim(),
        email: (client_email || "").trim() || "",
        phone: (client_phone || "").trim() || "",
        address: fullAddress,
        number: number?.trim() || null,
        district: district?.trim() || null,
        city: city?.trim() || null,
        state: state?.trim() ? String(state).toUpperCase() : null,
        zip_code: zip_code?.trim() || null,
      }
      if (origem_captacao != null && String(origem_captacao).trim()) {
        updatePayload.origem_captacao = String(origem_captacao).trim()
      }
      if (pagamentoPerdido) {
        updatePayload.status_lead = "perdido"
      }
      await supabase
        .from("clients")
        .update(updatePayload)
        .eq("id", clientId)
    } else {
      const { data: inserted, error: clientError } = await supabase
        .from("clients")
        .insert(clientPayload)
        .select("id")
        .single()

      if (clientError) {
        return NextResponse.json(
          { error: "Erro ao criar cliente: " + clientError.message },
          { status: 500 },
        )
      }
      clientId = inserted.id
    }

    const paymentDay = Number(payment_day) || 10
    const wasExistingClient = !!existing
    const { data: contract, error: contractError } = await supabase
      .from("contracts")
      .insert({
        client_id: clientId,
        product_id: resolvedProductId,
        status: contractStatus,
        payment_status: paymentStatusDb,
        start_date: start_date || new Date().toISOString().slice(0, 10),
        monthly_value: selectedValue,
        notes: null,
        origem_comercial: origemComercial || null,
      })
      .select("id, client_id, product_id")
      .single()

    if (contractError) {
      return NextResponse.json(
        { error: "Erro ao criar contrato: " + contractError.message },
        { status: 500 },
      )
    }

    // NF-e só para quem está com pagamento em dia — guarda todos os dados do cliente e da compra na solicitação
    await logActivity(
      { displayName: auth.displayName },
      {
        action: wasExistingClient
          ? `Cadastrou contrato/assinatura para ${(client_name as string).trim()}`
          : `Cadastrou novo cliente e contrato: ${(client_name as string).trim()}`,
        entity_type: "contract",
        entity_id: contract.id,
        details: { client_id: clientId, product_id: resolvedProductId },
      }
    )

    if (paymentStatusDb === "em_dia") {
      await supabase.from("nfe_documents").insert({
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

    return NextResponse.json({
      success: true,
      productId: resolvedProductId,
      existingClient: wasExistingClient,
      existingClientName: wasExistingClient ? ((existing as { name?: string })?.name ?? null) : null,
    })
  } catch (err: unknown) {
    console.error("Erro ao registrar assinatura:", err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erro inesperado" },
      { status: 500 },
    )
  }
}
