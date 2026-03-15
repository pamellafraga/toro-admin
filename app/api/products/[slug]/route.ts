import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

function getAuthFromCookie(req: NextRequest): { role?: string } {
  try {
    const cookie = req.cookies.get("xpress_auth")?.value
    if (!cookie) return {}
    const parsed = JSON.parse(cookie)
    return { role: parsed.role }
  } catch {
    return {}
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const auth = getAuthFromCookie(req)
    if (auth.role !== "admin") {
      return NextResponse.json(
        { error: "Apenas administradores podem alterar o status do produto" },
        { status: 403 }
      )
    }
    const { slug } = await params
    const body = await req.json()
    const { product_status } = body as { product_status?: string }
    if (!product_status || !["no_ar", "pausado", "desativado"].includes(product_status)) {
      return NextResponse.json(
        { error: "product_status deve ser no_ar, pausado ou desativado" },
        { status: 400 }
      )
    }
    const supabase = await createClient()
    const { data: bySlug } = await supabase
      .from("products")
      .select("id")
      .eq("slug", slug)
      .maybeSingle()
    let productId = bySlug?.id
    if (!productId) {
      const { data: byName } = await supabase
        .from("products")
        .select("id")
        .eq("name", "Software de Gestão")
        .limit(1)
        .maybeSingle()
      if (!byName) {
        return NextResponse.json({ error: "Produto não encontrado" }, { status: 404 })
      }
      productId = byName.id
      await supabase.from("products").update({ product_status, slug }).eq("id", productId)
    } else {
      await supabase.from("products").update({ product_status }).eq("id", productId)
    }
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("Erro ao atualizar produto:", err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erro ao atualizar" },
      { status: 500 }
    )
  }
}
