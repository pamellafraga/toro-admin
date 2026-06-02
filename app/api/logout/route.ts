import { NextRequest } from "next/server"
import { clearAuthCookie } from "@/lib/api/auth"
import { jsonOk } from "@/lib/api/response"

export async function POST(_request: NextRequest) {
  const response = jsonOk({ success: true })
  clearAuthCookie(response)
  return response
}
