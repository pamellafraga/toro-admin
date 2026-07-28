import { NextResponse, type NextRequest } from "next/server"

const DEFAULT_SITE_ORIGIN = "https://toro-green.vercel.app"

export function getToroSiteOrigin(): string {
  return process.env.TORO_SITE_URL?.trim() || DEFAULT_SITE_ORIGIN
}

export function applyPublicCors(request: NextRequest, response: NextResponse): NextResponse {
  const allowed = getToroSiteOrigin()
  const origin = request.headers.get("origin")
  if (origin && (origin === allowed || origin.endsWith(".vercel.app"))) {
    response.headers.set("Access-Control-Allow-Origin", origin)
  } else if (!origin) {
    response.headers.set("Access-Control-Allow-Origin", allowed)
  }
  response.headers.set("Access-Control-Allow-Methods", "GET, POST, PATCH, OPTIONS")
  response.headers.set("Access-Control-Allow-Headers", "Authorization, Content-Type, x-api-key")
  response.headers.set("Access-Control-Max-Age", "86400")
  return response
}

export function corsPreflightResponse(request: NextRequest): NextResponse {
  const response = new NextResponse(null, { status: 204 })
  return applyPublicCors(request, response)
}

export function jsonWithCors<T>(request: NextRequest, data: T, status = 200): NextResponse {
  const response = NextResponse.json(data, { status })
  return applyPublicCors(request, response)
}
