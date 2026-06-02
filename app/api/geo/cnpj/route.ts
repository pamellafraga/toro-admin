import { NextResponse } from "next/server"
import { fetchCnpjFromGov } from "@/lib/liticapro/cnpj-lookup"
import type { CnpjGovData } from "@/lib/liticapro/types"

export const dynamic = "force-dynamic"

export type { CnpjGovData }

/** GET /api/geo/cnpj?value=00000000000191 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const cnpj = (searchParams.get("value") ?? "").replace(/\D/g, "")

  if (cnpj.length !== 14) {
    return NextResponse.json({ error: "CNPJ deve ter 14 dígitos." }, { status: 400 })
  }

  try {
    const payload = await fetchCnpjFromGov(cnpj)
    if (!payload?.razao_social) {
      return NextResponse.json({ error: "CNPJ não encontrado na Receita Federal." }, { status: 404 })
    }
    return NextResponse.json(payload)
  } catch (err) {
    console.error("Erro ao consultar CNPJ:", err)
    return NextResponse.json({ error: "Erro ao consultar CNPJ." }, { status: 500 })
  }
}
