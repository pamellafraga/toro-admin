import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    const supabase = await createClient()

    const { data: product } = await supabase
      .from("products")
      .select("id, name, description, product_status")
      .eq("name", "Software de Gestão")
      .limit(1)
      .maybeSingle()

    if (!product) {
      return NextResponse.json({ product: null, contracts: [] })
    }

    const { data: contracts } = await supabase
      .from("contracts")
      .select("*, clients(*), products(*)")
      .eq("product_id", product.id)
      .order("created_at", { ascending: false })

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
