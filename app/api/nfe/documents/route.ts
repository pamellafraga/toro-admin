import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

function isAdminRequest(request: NextRequest): boolean {
  try {
    const cookie = request.cookies.get("xpress_auth")?.value
    if (!cookie) return false
    const parsed = JSON.parse(cookie)
    return !!(parsed.authenticated || parsed.user)
  } catch {
    return false
  }
}

/**
 * Lista NF-e e contratos vinculados para a tela de emissão.
 * Usa admin client para não depender de sessão Supabase.
 */
export async function GET(req: NextRequest) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 })
  }

  try {
    const supabase = createAdminClient()

    const { data: rawDocs, error: docsError } = await supabase
      .from("nfe_documents")
      .select("id, client_id, number, series, status, client_name, total_value, created_at, provider_payload")
      .order("created_at", { ascending: false })
      .limit(100)

    if (docsError) {
      return NextResponse.json(
        { error: docsError.message },
        { status: 500 },
      )
    }

    const documents = (rawDocs || []) as Array<{
      id: string
      client_id: string | null
      number: string | null
      series: string | null
      status: string
      client_name: string
      total_value: number
      created_at: string
      provider_payload?: { contract_id?: string } | null
    }>

    const contractIds = [...new Set(
      documents
        .map((d) => d.provider_payload?.contract_id)
        .filter(Boolean),
    )] as string[]

    const planLabel = (value: number) => {
      const v = Number(value)
      if (v === 1500 || (v >= 1499 && v <= 1501)) return "Premium (R$ 1.500,00)"
      if (v === 800 || (v >= 799 && v <= 801)) return "Confort (R$ 800,00)"
      if (v === 500 || (v >= 499 && v <= 501)) return "Básico (R$ 500,00)"
      return v > 0 ? `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : ""
    }

    let contracts: Array<{
      id: string
      client_id: string | null
      payment_status: string | null
      monthly_value: number | null
      product_name?: string | null
      plan_label?: string
    }> = []
    if (contractIds.length > 0) {
      const { data: contractsData, error: contractsError } = await supabase
        .from("contracts")
        .select("id, client_id, payment_status, monthly_value, product_id")
        .in("id", contractIds)
      if (!contractsError && contractsData) {
        const raw = contractsData as Array<{ id: string; client_id: string | null; payment_status: string | null; monthly_value: number | null; product_id?: string }>
        const productIds = [...new Set(raw.map((c) => c.product_id).filter(Boolean))] as string[]
        let productNames: Record<string, string> = {}
        if (productIds.length > 0) {
          const { data: productsData } = await supabase.from("products").select("id, name").in("id", productIds)
          if (productsData) {
            productNames = Object.fromEntries((productsData as Array<{ id: string; name: string }>).map((p) => [p.id, p.name]))
          }
        }
        contracts = raw.map((c) => ({
          id: c.id,
          client_id: c.client_id,
          payment_status: c.payment_status,
          monthly_value: c.monthly_value,
          product_name: c.product_id ? productNames[c.product_id] ?? null : null,
          plan_label: planLabel(Number(c.monthly_value ?? 0)),
        }))
      }
    }

    return NextResponse.json({ documents, contracts })
  } catch (err) {
    console.error("Erro ao listar NF-e:", err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erro ao listar NF-e" },
      { status: 500 },
    )
  }
}
