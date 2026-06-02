import type { NextRequest } from "next/server"
import { parseAuthCookie } from "@/lib/api/auth"
import { insertActivityLog } from "@/lib/db/repositories/activity-log.repository"

export interface LogActivityPayload {
  action: string
  entity_type?: string
  entity_id?: string
  details?: Record<string, unknown>
}

export async function logActivity(
  requestOrAuth: NextRequest | { displayName?: string | null },
  payload: LogActivityPayload,
): Promise<void> {
  let user_name = "Sistema"

  if (requestOrAuth && "cookies" in requestOrAuth) {
    user_name = parseAuthCookie(requestOrAuth as NextRequest)?.displayName ?? "Sistema"
  } else if (requestOrAuth && typeof requestOrAuth === "object" && "displayName" in requestOrAuth) {
    user_name = (requestOrAuth as { displayName?: string | null }).displayName ?? "Sistema"
  }

  await insertActivityLog({
    user_name,
    action: payload.action,
    entity_type: payload.entity_type,
    entity_id: payload.entity_id,
    details: payload.details,
  })
}
