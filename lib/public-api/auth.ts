import type { NextRequest } from "next/server"

export function verifyPublicSiteApiKey(request: NextRequest): boolean {
  const secret =
    process.env.SITE_API_KEY?.trim() || process.env.PUBLIC_SITE_API_KEY?.trim()
  if (!secret) return false
  const auth = request.headers.get("authorization")
  const bearer = auth?.startsWith("Bearer ") ? auth.slice(7).trim() : null
  const headerKey = request.headers.get("x-api-key")?.trim()
  return bearer === secret || headerKey === secret
}
