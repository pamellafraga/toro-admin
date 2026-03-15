import type { NextRequest } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

export interface LogActivityPayload {
  action: string
  entity_type?: string
  entity_id?: string
  details?: Record<string, unknown>
}

function getDisplayNameFromRequest(req: NextRequest): string | null {
  try {
    const cookie = req.cookies.get("xpress_auth")?.value
    if (!cookie) return null
    const parsed = JSON.parse(cookie)
    return parsed.displayName ?? parsed.user ?? null
  } catch {
    return null
  }
}

/**
 * Registra uma ação no histórico de atividades (visível para adm e comercial).
 * Use em API routes passando o request, ou no servidor passando { displayName }.
 */
export async function logActivity(
  requestOrAuth: NextRequest | { displayName?: string | null },
  payload: LogActivityPayload
): Promise<void> {
  let user_name: string | null = null
  if (requestOrAuth && "cookies" in requestOrAuth) {
    user_name = getDisplayNameFromRequest(requestOrAuth as NextRequest)
  } else if (requestOrAuth && typeof requestOrAuth === "object" && "displayName" in requestOrAuth) {
    user_name = (requestOrAuth as { displayName?: string | null }).displayName ?? null
  }

  const supabase = createAdminClient()
  await supabase.from("activity_log").insert({
    user_id: null,
    user_name: user_name || "Sistema",
    action: payload.action,
    entity_type: payload.entity_type ?? "",
    entity_id: payload.entity_id ?? null,
    details: payload.details ?? null,
  })
}
