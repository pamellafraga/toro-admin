import { NextRequest, NextResponse } from "next/server"

/**
 * A API de tenant-config usa o slug na URL: GET /api/tenant-config/:slug
 * Ex.: GET /api/tenant-config/empresa-ativa
 * Header: Authorization: Bearer <CENTRAL_API_TOKEN>
 */
export async function GET(req: NextRequest) {
  return NextResponse.json(
    { error: "Use GET /api/tenant-config/:slug (ex.: /api/tenant-config/empresa-ativa)" },
    { status: 400 }
  )
}
