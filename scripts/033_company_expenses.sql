-- Gastos da Empresa (/dashboard/gastos-empresa)
CREATE TABLE IF NOT EXISTS company_expenses (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name           TEXT NOT NULL,
  category       TEXT NOT NULL,
  currency       TEXT NOT NULL DEFAULT 'usd' CHECK (currency IN ('usd', 'brl')),
  value_usd      NUMERIC(12, 2) NOT NULL DEFAULT 0,
  value_brl      NUMERIC(12, 2) NOT NULL DEFAULT 0,
  due_date       INTEGER NOT NULL DEFAULT 1,
  due_month      INTEGER CHECK (due_month IS NULL OR (due_month >= 1 AND due_month <= 12)),
  billing_period TEXT NOT NULL DEFAULT 'mensal'
    CHECK (billing_period IN ('mensal', 'anual', 'vitalicio')),
  notes          TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_company_expenses_category ON company_expenses (category);

CREATE OR REPLACE FUNCTION set_company_expenses_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS company_expenses_updated_at ON company_expenses;
CREATE TRIGGER company_expenses_updated_at
  BEFORE UPDATE ON company_expenses
  FOR EACH ROW EXECUTE FUNCTION set_company_expenses_updated_at();
