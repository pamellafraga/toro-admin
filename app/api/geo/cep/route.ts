import { NextResponse } from "next/server"

// Busca dados de endereço a partir do CEP (com ou sem máscara) usando ViaCEP
// Exemplo: /api/geo/cep?value=01001000 ou 01001-000
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const value = searchParams.get("value") || ""
  const cep = value.replace(/\D/g, "")

  if (!cep) {
    return NextResponse.json({ error: "CEP inválido." }, { status: 400 })
  }

  try {
    const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`, { cache: "force-cache" })
    const data = await res.json()

    if (data.erro) {
      return NextResponse.json({ error: "CEP não encontrado." }, { status: 404 })
    }

    return NextResponse.json({
      cep: data.cep,
      street: data.logradouro,
      district: data.bairro,
      city: data.localidade,
      state: data.uf,
    })
  } catch (err) {
    console.error("Erro ao consultar CEP:", err)
    return NextResponse.json({ error: "Erro ao consultar CEP." }, { status: 500 })
  }
}

