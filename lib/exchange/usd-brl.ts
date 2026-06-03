/** Fallback quando a cotação ao vivo não estiver disponível. */
export const USD_BRL_FALLBACK_RATE = 5.16

export type UsdBrlQuote = {
  rate: number
  updatedAt: string | null
  source: string
}

export function convertUsdToBrl(usd: number, rate: number): number {
  if (!Number.isFinite(usd) || usd <= 0) return 0
  if (!Number.isFinite(rate) || rate <= 0) return 0
  return Math.round(usd * rate * 100) / 100
}

async function fetchFromAwesomeApi(): Promise<UsdBrlQuote | null> {
  const res = await fetch("https://economia.awesomeapi.com.br/json/last/USD-BRL", {
    next: { revalidate: 900 },
    signal: AbortSignal.timeout(8000),
  })
  if (!res.ok) return null

  const data = (await res.json()) as {
    USDBRL?: { bid?: string; create_date?: string }
  }
  const rate = parseFloat(data?.USDBRL?.bid ?? "")
  if (!Number.isFinite(rate) || rate <= 0) return null

  return {
    rate,
    updatedAt: data.USDBRL?.create_date ?? null,
    source: "AwesomeAPI",
  }
}

async function fetchFromErApi(): Promise<UsdBrlQuote | null> {
  const res = await fetch("https://open.er-api.com/v6/latest/USD", {
    next: { revalidate: 900 },
    signal: AbortSignal.timeout(8000),
  })
  if (!res.ok) return null

  const data = (await res.json()) as {
    rates?: { BRL?: number }
    time_last_update_utc?: string
  }
  const rate = data?.rates?.BRL
  if (typeof rate !== "number" || rate <= 0) return null

  return {
    rate,
    updatedAt: data.time_last_update_utc ?? null,
    source: "open.er-api.com",
  }
}

/** Busca cotação USD/BRL ao vivo (com fallback). */
export async function fetchLiveUsdBrlQuote(): Promise<UsdBrlQuote> {
  for (const fetcher of [fetchFromAwesomeApi, fetchFromErApi]) {
    try {
      const quote = await fetcher()
      if (quote) return quote
    } catch {
      // tenta próxima fonte
    }
  }

  return {
    rate: USD_BRL_FALLBACK_RATE,
    updatedAt: null,
    source: "fallback",
  }
}
