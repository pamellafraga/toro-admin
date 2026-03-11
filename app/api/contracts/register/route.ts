import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(req: Request) {
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
    } = body

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

    const parts = [address, number, district, city, state, zip_code].filter(Boolean)
    const fullAddress = parts.length ? parts.join(", ") : null
    const clientPayload = {
      name: client_name.trim(),
      email: (client_email || "").trim() || "",
      phone: (client_phone || "").trim() || "",
      cpf_cnpj: cpfCnpjRaw,
      address: fullAddress,
    }

    let clientId: string

    const { data: existing } = await supabase
      .from("clients")
      .select("id")
      .eq("cpf_cnpj", cpfCnpjRaw)
      .maybeSingle()

    if (existing) {
      clientId = existing.id
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

    const statusMap: Record<string, string> = {
      active: "ativa",
      inactive: "inativa",
      suspended: "pendente",
      cancelled: "cancelada",
    }
    const paymentMap: Record<string, string> = {
      paid: "em_dia",
      pending: "em_dia",
      overdue: "atrasado",
    }

    const { data: contract, error: contractError } = await supabase
      .from("contracts")
      .insert({
        client_id: clientId,
        product_id: resolvedProductId,
        status: statusMap[status] ?? "ativa",
        payment_status: paymentMap[payment_status] ?? "em_dia",
        payment_day: Number(payment_day) || 10,
        start_date: start_date || new Date().toISOString().slice(0, 10),
        monthly_value: selectedValue,
        notes: null,
      })
      .select("id, client_id, product_id, payment_day")
      .single()

    if (contractError) {
      return NextResponse.json(
        { error: "Erro ao criar contrato: " + contractError.message },
        { status: 500 },
      )
    }

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
        payment_day: contract.payment_day,
      },
      provider_response: null,
    })

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    console.error("Erro ao registrar assinatura:", err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erro inesperado" },
      { status: 500 },
    )
  }
}
