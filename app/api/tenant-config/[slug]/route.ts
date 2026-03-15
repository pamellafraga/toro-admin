import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

const FERRAMENTA_APOLICER = "apolicer"

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
  { params }: { params: Promise<{ slug: string }> }
) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const slug = (await params).slug?.trim()
  if (!slug) {
    return NextResponse.json({ error: "Slug é obrigatório na URL." }, { status: 400 })
  }

  try {
    const supabase = createAdminClient()
    const { data: row, error } = await supabase
      .from("tenants")
      .select(
        `
        id,
        slug,
        tenant_databases!inner (
          supabase_url,
          supabase_anon
        )
      `
      )
      .eq("slug", slug)
      .eq("ferramenta", FERRAMENTA_APOLICER)
      .eq("ativo", true)
      .maybeSingle()

    if (error) {
      console.error("tenant-config query error:", error)
      return NextResponse.json({ error: "Erro ao consultar tenant." }, { status: 500 })
    }

    const db = (row as { tenant_databases?: { supabase_url: string; supabase_anon: string } | { supabase_url: string; supabase_anon: string }[] } | null)
      ?.tenant_databases
    const firstDb = Array.isArray(db) ? db[0] : (db as { supabase_url: string; supabase_anon: string } | null)

    if (!row?.id || !firstDb?.supabase_url || !firstDb?.supabase_anon) {
      return NextResponse.json(
        { error: "Tenant não encontrado ou inativo, ou banco não configurado." },
        { status: 404 }
      )
    }

    return NextResponse.json({
      tenantId: row.id,
      slug: row.slug,
      supabaseUrl: firstDb.supabase_url,
      supabaseAnonKey: firstDb.supabase_anon,
    })
  } catch (err) {
    console.error("tenant-config error:", err)
    return NextResponse.json({ error: "Erro interno." }, { status: 500 })
  }
}
