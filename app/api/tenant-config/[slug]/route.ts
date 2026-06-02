import { NextRequest } from "next/server"
import { handleApiError, jsonError, jsonOk } from "@/lib/api/response"
import { findTenantConfig } from "@/lib/db/repositories/tenants.repository"

function isAuthorized(req: NextRequest): boolean {
  const token = process.env.CENTRAL_API_TOKEN
  if (!token?.length) return false

  const authHeader = req.headers.get("authorization")
  const bearer = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null
  if (bearer && bearer === token) return true

  const trustedIps = process.env.CENTRAL_TRUSTED_IPS
  if (trustedIps?.length) {
    const allowed = trustedIps.split(",").map((s) => s.trim().toLowerCase())
    const forwarded = req.headers.get("x-forwarded-for")
    const ip = (forwarded?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "").toLowerCase()
    if (ip && allowed.includes(ip)) return true
  }

  return false
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  if (!isAuthorized(req)) return jsonError("Unauthorized", 401)

  const slug = (await params).slug?.trim()
  if (!slug) return jsonError("Slug é obrigatório na URL.", 400)

  try {
    const row = await findTenantConfig(slug)
    if (!row?.id || !row.supabase_url || !row.supabase_anon) {
      return jsonError("Tenant não encontrado ou inativo, ou banco não configurado.", 404)
    }

    return jsonOk({
      tenantId: row.id,
      slug: row.slug,
      supabaseUrl: row.supabase_url,
      supabaseAnonKey: row.supabase_anon,
    })
  } catch (err) {
    console.error("tenant-config error:", err)
    return handleApiError(err, "Erro interno.")
  }
}
