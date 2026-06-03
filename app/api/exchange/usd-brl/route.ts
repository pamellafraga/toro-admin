import { NextResponse } from "next/server"
import { fetchLiveUsdBrlQuote } from "@/lib/exchange/usd-brl"

export const dynamic = "force-dynamic"

/** GET /api/exchange/usd-brl — cotação USD/BRL ao vivo */
export async function GET() {
  try {
    const quote = await fetchLiveUsdBrlQuote()
    return NextResponse.json(quote, {
      headers: {
        "Cache-Control": "public, s-maxage=900, stale-while-revalidate=3600",
      },
    })
  } catch (err) {
    console.error("Erro ao buscar cotação USD/BRL:", err)
    return NextResponse.json({ error: "Erro ao buscar cotação." }, { status: 500 })
  }
}
