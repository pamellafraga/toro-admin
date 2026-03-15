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
    // Mesmo critério da listagem (GET /contracts): por nome, para atualizar o produto que a tela exibe
    const { data: productRow } = await supabase
      .from("products")
      .select("id")
      .eq("name", "Software de Gestão")
      .limit(1)
      .maybeSingle()
    if (!productRow?.id) {
      return NextResponse.json({ error: "Produto não encontrado" }, { status: 404 })
    }
    const productId = productRow.id
    const { data: updated, error: updateError } = await supabase
      .from("products")
      .update({ product_status })
      .eq("id", productId)
      .select("id, name, description, product_status")
      .single()
    if (updateError) {
      console.error("Erro ao atualizar product_status:", updateError)
      return NextResponse.json(
        { error: "Falha ao salvar no banco. Verifique se a coluna product_status existe (script 016 ou 030). Detalhe: " + updateError.message },
        { status: 500 }
      )
    }
    if (!updated) {
      return NextResponse.json({ error: "Produto não encontrado após atualização." }, { status: 500 })
    }
    return NextResponse.json({ success: true, product: updated })
  } catch (err) {
    console.error("Erro ao atualizar produto:", err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erro ao atualizar" },
      { status: 500 }
    )
  }
}
