import { queryOne } from "@/lib/db/pool"

const FERRAMENTA_APOLICER = "apolicer"

export async function findTenantConfig(slug: string) {
  return queryOne<{ id: string; slug: string; supabase_url: string; supabase_anon: string }>(
    `SELECT t.id, t.slug, td.supabase_url, td.supabase_anon
     FROM tenants t
     JOIN tenant_databases td ON td.tenant_id = t.id
     WHERE lower(trim(t.slug)) = lower(trim($1))
       AND t.ferramenta = $2
       AND t.ativo = true
     LIMIT 1`,
    [slug, FERRAMENTA_APOLICER],
  )
}
