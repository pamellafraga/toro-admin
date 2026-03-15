-- =============================================================================
-- 031 — Multi-tenancy (Apolicer): tenants + tenant_databases
-- Rode no Supabase da Dashboard (Soluções Dashboard Xpress).
-- API: GET /api/tenant-config/:slug usa estas tabelas.
-- =============================================================================

-- Tabela de inquilinos (cada assinante da ferramenta Apolicer)
CREATE TABLE IF NOT EXISTS tenants (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome       TEXT NOT NULL,
  slug       TEXT NOT NULL,
  ferramenta TEXT NOT NULL DEFAULT 'apolicer',
  ativo      BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_tenants_slug_ferramenta
  ON tenants(slug, ferramenta);

-- Tabela de conexão do tenant (URL + chave Supabase)
CREATE TABLE IF NOT EXISTS tenant_databases (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  supabase_url  TEXT NOT NULL,
  supabase_anon TEXT NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id)
);

-- Seed: tenant de teste (substitua SUA_PROJECT_URL e SUA_ANON_KEY antes de rodar)
INSERT INTO tenants (nome, slug, ferramenta, ativo)
VALUES ('Empresa Teste', 'empresa-ativa', 'apolicer', true)
ON CONFLICT (slug, ferramenta) DO NOTHING;

INSERT INTO tenant_databases (tenant_id, supabase_url, supabase_anon)
SELECT t.id, 'https://tgttiupxinnnwzzfmpva.supabase.co', 'sb_publishable_1aovJZheVrUHmgRkjzyX2g_jFdeUrPq'
FROM tenants t
WHERE t.slug = 'empresa-ativa' AND t.ferramenta = 'apolicer'
LIMIT 1
ON CONFLICT (tenant_id) DO UPDATE SET
  supabase_url  = EXCLUDED.supabase_url,
  supabase_anon = EXCLUDED.supabase_anon;
