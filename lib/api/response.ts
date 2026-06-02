import { NextResponse } from "next/server"
import { isDatabaseConfigured } from "@/lib/db/config"

export function jsonOk<T>(data: T, status = 200): NextResponse {
  return NextResponse.json(data, { status })
}

export function jsonError(message: string, status = 500): NextResponse {
  return NextResponse.json({ error: message }, { status })
}

export function jsonUnauthorized(message = "Não autorizado."): NextResponse {
  return jsonError(message, 401)
}

export function jsonForbidden(message = "Sem permissão."): NextResponse {
  return jsonError(message, 403)
}

export function handleApiError(e: unknown, fallback = "Erro interno."): NextResponse {
  const msg = e instanceof Error ? e.message : fallback

  if (!isDatabaseConfigured()) {
    return jsonError(
      "Banco PostgreSQL não configurado. Defina DATABASE_HOST nas variáveis de ambiente (Vercel ou .env.local) e execute os scripts em scripts/locaweb/.",
      503,
    )
  }

  if (/ECONNREFUSED|ENOTFOUND|ETIMEDOUT|connection terminated/i.test(msg)) {
    return jsonError(
      "Não foi possível conectar ao PostgreSQL. Verifique DATABASE_HOST, firewall da Locaweb e se o IP está liberado.",
      503,
    )
  }

  if (/relation .* does not exist|undefined table|column .* does not exist/i.test(msg)) {
    return jsonError(
      `Erro no banco: ${msg}. Execute os scripts SQL em scripts/locaweb/ na ordem (001 → 004).`,
      503,
    )
  }

  if (/Credenciais inválidas/i.test(msg)) {
    return jsonError(msg, 401)
  }

  return jsonError(msg, 500)
}
