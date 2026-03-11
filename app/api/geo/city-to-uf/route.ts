import { NextResponse } from "next/server"

// Busca UF a partir do nome da cidade usando a API pública do IBGE
// Exemplo de uso: /api/geo/city-to-uf?name=campinas
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const name = searchParams.get("name")?.trim()

  if (!name) {
    return NextResponse.json({ error: "Parâmetro 'name' é obrigatório." }, { status: 400 })
  }

  try {
    const ibgeUrl = `https://servicodados.ibge.gov.br/api/v1/localidades/municipios?nome=${encodeURIComponent(name)}`
    const res = await fetch(ibgeUrl, { cache: "force-cache" })
    const json = (await res.json()) as any[]

    if (!Array.isArray(json) || json.length === 0) {
      return NextResponse.json({ error: "Cidade não encontrada." }, { status: 404 })
    }

    const muni = json[0]
    const uf = muni?.microrregiao?.mesorregiao?.UF?.sigla

    if (!uf) {
      return NextResponse.json({ error: "UF não encontrada para esta cidade." }, { status: 404 })
    }

    return NextResponse.json({ uf })
  } catch (err) {
    console.error("Erro ao consultar cidade no IBGE:", err)
    return NextResponse.json({ error: "Erro ao consultar serviço externo." }, { status: 500 })
  }
}

