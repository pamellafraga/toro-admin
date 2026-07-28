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
      "Banco MySQL não configurado. Defina DATABASE_URL ou DATABASE_HOST no Vercel.",
      503,
    )
  }

  if (/ECONNREFUSED|ENOTFOUND|ETIMEDOUT|connection terminated|ER_ACCESS_DENIED|Access denied for user/i.test(msg)) {
    return jsonError(
      "Não foi possível conectar ao MySQL. A Locaweb bloqueia o Vercel — use MySQL na nuvem (Railway/TiDB) com DATABASE_URL. Veja .env.cloud.example.",
      503,
    )
  }

  if (/relation .* does not exist|undefined table|column .* does not exist|doesn't exist/i.test(msg)) {
    return jsonError(
      `Erro no banco: ${msg}. Execute node scripts/run-mysql-setup.js no projeto.`,
      503,
    )
  }

  if (/Credenciais inválidas/i.test(msg)) {
    return jsonError(msg, 401)
  }

  return jsonError(msg, 500)
}
