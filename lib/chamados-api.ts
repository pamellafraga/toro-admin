import type { NextRequest } from "next/server"
import { userHasChamadosAccess } from "@/lib/chamados-access"

/** Cookie do painel: admins enxergam o SAC. */
export function canAccessChamadosPanel(request: NextRequest): boolean {
  try {
    const cookie = request.cookies.get("toro_auth")?.value
    if (!cookie) return false
    const parsed = JSON.parse(cookie) as {
      authenticated?: boolean
      user?: string
      displayName?: string
      role?: string
    }
    if (!(parsed.authenticated || parsed.user)) return false
    if (parsed.role === "admin") return true
    const display = String(parsed.displayName ?? parsed.user ?? "").trim()
    const user = String(parsed.user ?? "").trim()
    return userHasChamadosAccess(display, user)
  } catch {
    return false
  }
}

export function canIngestChamadosFromTool(request: NextRequest): boolean {
  const secret = process.env.CHAMADOS_INGEST_TOKEN
  if (!secret?.trim()) return false
  const auth = request.headers.get("authorization")
  return auth === `Bearer ${secret.trim()}`
}
