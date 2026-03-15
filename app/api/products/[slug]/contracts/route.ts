import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

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

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    const supabase = await createClient()
    const auth = getAuthFromCookie(req)
    const isComercial = auth.role === "comercial" && auth.displayName
    const origemComercial = isComercial ? `Comercial - ${auth.displayName}` : null

    const { data: product } = await supabase
      .from("products")
      .select("id, name, description, product_status")
      .eq("name", "Software de Gestão")
      .limit(1)
      .maybeSingle()

    if (!product) {
      return NextResponse.json({ product: null, contracts: [] })
    }

    let query = supabase
      .from("contracts")
      .select("*, clients(*), products(*)")
      .eq("product_id", product.id)
      .order("created_at", { ascending: false })
    if (origemComercial) {
      query = query.eq("origem_comercial", origemComercial)
    }
    const { data: contracts } = await query

    return NextResponse.json({
      product: {
        id: product.id,
        name: product.name,
        description: product.description,
        product_status: (product as { product_status?: string }).product_status ?? "no_ar",
      },
      contracts: contracts || [],
    })
  } catch (err) {
    console.error("Erro ao buscar contratos:", err)
    return NextResponse.json(
      { product: null, contracts: [], error: "Erro ao carregar" },
      { status: 500 },
    )
  }
}
