import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

/**
 * GET /api/clients/search?name=Nome do Cliente
 * Retorna o primeiro cliente cujo nome contém o termo (busca no servidor).
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const name = searchParams.get("name")?.trim()
    if (!name) {
      return NextResponse.json({ client: null })
    }

    const supabase = await createClient()
    const { data: list, error } = await supabase
      .from("clients")
      .select("id, name, email, cpf_cnpj, address, number, district, city, state, zip_code")
      .ilike("name", `%${name}%`)
      .limit(1)

    if (error) {
      console.error("Erro ao buscar cliente por nome:", error)
      return NextResponse.json({ client: null, error: error.message }, { status: 500 })
    }

    const client = Array.isArray(list) && list.length > 0 ? list[0] : null
    return NextResponse.json({ client })
  } catch (err) {
    console.error("Erro em /api/clients/search:", err)
    return NextResponse.json({ client: null }, { status: 500 })
  }
}
