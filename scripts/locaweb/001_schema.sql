-- =============================================================================
-- Xpress Dashboard — PostgreSQL Locaweb (schema completo)
-- Banco/usuário: admxpress
-- Execute no phpPgAdmin ou psql conectado ao banco admxpress
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Função updated_at reutilizável
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- Perfis (sem dependência de auth.users do Supabase)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS profiles (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL DEFAULT '',
  role       TEXT NOT NULL DEFAULT 'custom'
    CHECK (role IN ('admin', 'marketing', 'captacao', 'financeiro', 'custom')),
  is_active  BOOLEAN NOT NULL DEFAULT true,
  permissions JSONB NOT NULL DEFAULT '[]'::jsonb,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ---------------------------------------------------------------------------
-- Produtos, clientes, contratos
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS products (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  icon        TEXT NOT NULL DEFAULT 'package',
  slug        TEXT UNIQUE,
  monthly_price DECIMAL(10,2) NOT NULL DEFAULT 0,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  product_status TEXT DEFAULT 'no_ar',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS clients (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  cpf_cnpj        TEXT NOT NULL UNIQUE,
  email           TEXT NOT NULL DEFAULT '',
  phone           TEXT NOT NULL DEFAULT '',
  company         TEXT,
  address         TEXT,
  number          TEXT,
  district        TEXT,
  city            TEXT,
  state           TEXT,
  zip_code        TEXT,
  origem_captacao TEXT,
  status_lead     TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER clients_updated_at
  BEFORE UPDATE ON clients FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TABLE IF NOT EXISTS contracts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id       UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  product_id      UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  status          TEXT NOT NULL DEFAULT 'pendente',
  start_date      DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date        DATE,
  monthly_value   DECIMAL(10,2) NOT NULL DEFAULT 0,
  payment_status  TEXT NOT NULL DEFAULT 'em_dia',
  notes           TEXT,
  origem_comercial TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER contracts_updated_at
  BEFORE UPDATE ON contracts FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ---------------------------------------------------------------------------
-- Seguradoras, atividades, notificações, chat
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS seguradoras (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS activity_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES profiles(id) ON DELETE SET NULL,
  user_name   TEXT,
  action      TEXT NOT NULL,
  entity_type TEXT NOT NULL DEFAULT '',
  entity_id   UUID,
  details     JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS notifications (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title      TEXT NOT NULL,
  message    TEXT NOT NULL DEFAULT '',
  type       TEXT NOT NULL DEFAULT 'info',
  link       TEXT,
  read       BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender     TEXT NOT NULL,
  content    TEXT NOT NULL,
  channel    TEXT DEFAULT 'geral',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- NF-e, credenciais admin, usuários do dashboard
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS nfe_documents (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id        UUID REFERENCES clients(id) ON DELETE SET NULL,
  client_name      TEXT NOT NULL,
  total_value      DECIMAL(10,2) NOT NULL DEFAULT 0,
  nature_operation TEXT,
  cfop             TEXT,
  status           TEXT NOT NULL DEFAULT 'pendente',
  number           TEXT,
  series           TEXT,
  provider_id      TEXT,
  provider_payload JSONB,
  provider_response JSONB,
  pdf_storage_path TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER nfe_documents_updated_at
  BEFORE UPDATE ON nfe_documents FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TABLE IF NOT EXISTS admin_credentials (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service    TEXT NOT NULL,
  login      TEXT NOT NULL,
  password   TEXT NOT NULL,
  url        TEXT,
  notes      TEXT,
  category   TEXT NOT NULL DEFAULT 'FERRAMENTAS'
    CHECK (category IN ('FERRAMENTAS', 'DOMÍNIOS', 'HOSPEDAGENS', 'OUTROS')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS dashboard_users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username      TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL CHECK (role IN ('admin', 'comercial')),
  display_name  TEXT NOT NULL,
  email         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION set_dashboard_users_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER dashboard_users_updated_at
  BEFORE UPDATE ON dashboard_users FOR EACH ROW EXECUTE FUNCTION set_dashboard_users_updated_at();

CREATE TABLE IF NOT EXISTS password_reset_codes (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username   TEXT,
  email      TEXT NOT NULL,
  code       TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_password_reset_codes_username ON password_reset_codes (username);
CREATE INDEX IF NOT EXISTS idx_password_reset_codes_expires ON password_reset_codes (expires_at);

-- ---------------------------------------------------------------------------
-- Multi-tenancy (Apolicer) + chamados
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tenants (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome       TEXT NOT NULL,
  slug       TEXT NOT NULL,
  ferramenta TEXT NOT NULL DEFAULT 'apolicer',
  ativo      BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_tenants_slug_ferramenta ON tenants(slug, ferramenta);

CREATE TABLE IF NOT EXISTS tenant_databases (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  supabase_url  TEXT NOT NULL,
  supabase_anon TEXT NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id)
);

CREATE TABLE IF NOT EXISTS internal_support_tickets (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  source_tool       TEXT,
  client_identifier TEXT,
  client_email      TEXT,
  subject           TEXT NOT NULL,
  message           TEXT NOT NULL,
  status            TEXT NOT NULL DEFAULT 'aberto'
    CHECK (status IN ('aberto', 'em_andamento', 'resolvido', 'fechado')),
  priority          TEXT NOT NULL DEFAULT 'normal'
    CHECK (priority IN ('baixa', 'normal', 'alta', 'urgente')),
  external_user_id  TEXT
);

CREATE INDEX IF NOT EXISTS internal_support_tickets_created_at_idx
  ON internal_support_tickets (created_at DESC);

-- ---------------------------------------------------------------------------
-- Seed: usuários do dashboard
-- Senha Admin/Pamella/Roberto: Xpress@101029
-- Senha Lisete: Lisete2026 | Senha Stefanie: Stefanie2026
-- ---------------------------------------------------------------------------
INSERT INTO dashboard_users (username, password_hash, role, display_name, email)
VALUES
  ('Admin',    '004337285807f7743d82a633a3ca0c825ab00303fb88a27245690867397215da', 'admin',     'Admin',    'rcf.fraga@gmail.com'),
  ('Pamella',  '004337285807f7743d82a633a3ca0c825ab00303fb88a27245690867397215da', 'admin',     'Pamella',  'ti.pamellafraga@gmail.com'),
  ('Roberto',  '004337285807f7743d82a633a3ca0c825ab00303fb88a27245690867397215da', 'admin',     'Roberto',  'rcf.fraga@gmail.com'),
  ('Lisete',   '490a7fbdccffa5419b4e3e403332d66b8fa0efef53d2e9e8aa366430fb170cdc', 'comercial', 'Lisete',   'rcf.fraga@gmail.com'),
  ('Stefanie', '697f60f318546d50ee5c81c70059bf3b541c988e0958bdb0199055bd10f52f93', 'comercial', 'Stefanie', 'rcf.fraga@gmail.com')
ON CONFLICT (username) DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  role = EXCLUDED.role,
  display_name = EXCLUDED.display_name,
  email = EXCLUDED.email,
  updated_at = now();

INSERT INTO products (name, description, icon, slug, product_status)
SELECT 'SEGURA', 'Apólice de Seguro - Modalidade Garantias', 'shield-check', 'segura', 'no_ar'
WHERE NOT EXISTS (SELECT 1 FROM products WHERE slug = 'segura');

INSERT INTO products (name, description, icon, slug, product_status)
SELECT 'LiticaPro', 'Monitoramento de licitações públicas no Brasil', 'search', 'liticapro', 'no_ar'
WHERE NOT EXISTS (SELECT 1 FROM products WHERE slug = 'liticapro');
