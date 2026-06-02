import { NextRequest } from "next/server"
import { isAuthenticated } from "@/lib/api/auth"
import { handleApiError, jsonOk, jsonUnauthorized } from "@/lib/api/response"
import { findContractsByIds, findProductNamesByIds } from "@/lib/db/repositories/contracts.repository"
import { listNfeDocuments } from "@/lib/db/repositories/nfe.repository"

function planLabel(value: number) {
  const v = Number(value)
  if (v === 1500 || (v >= 1499 && v <= 1501)) return "Premium (R$ 1.500,00)"
  if (v === 800 || (v >= 799 && v <= 801)) return "Confort (R$ 800,00)"
  if (v === 500 || (v >= 499 && v <= 501)) return "Básico (R$ 500,00)"
  return v > 0 ? `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : ""
}

export async function GET(req: NextRequest) {
  if (!isAuthenticated(req)) return jsonUnauthorized()

  try {
    const rawDocs = await listNfeDocuments(100)
    const documents = rawDocs as Array<{
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

    const contractIds = [...new Set(documents.map((d) => d.provider_payload?.contract_id).filter(Boolean))] as string[]

    let contracts: Array<{
      id: string
      client_id: string | null
      payment_status: string | null
      monthly_value: number | null
      product_name?: string | null
      plan_label?: string
    }> = []

    if (contractIds.length > 0) {
      const raw = await findContractsByIds(contractIds)
      const productIds = [...new Set(raw.map((c) => c.product_id).filter(Boolean))] as string[]
      const productNames = await findProductNamesByIds(productIds)
      contracts = raw.map((c) => ({
        id: c.id,
        client_id: c.client_id,
        payment_status: c.payment_status,
        monthly_value: c.monthly_value,
        product_name: c.product_id ? productNames[c.product_id] ?? null : null,
        plan_label: planLabel(Number(c.monthly_value ?? 0)),
      }))
    }

    return jsonOk({ documents, contracts })
  } catch (err) {
    console.error("Erro ao listar NF-e:", err)
    return handleApiError(err, "Erro ao listar NF-e")
  }
}
