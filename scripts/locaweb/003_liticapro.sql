-- LiticaPro: perfil do cliente, trial e metadados do contrato
ALTER TABLE clients ADD COLUMN IF NOT EXISTS company TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS liticapro_data JSONB;

ALTER TABLE contracts ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS plan TEXT;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS liticapro_meta JSONB;

CREATE INDEX IF NOT EXISTS idx_contracts_trial_ends ON contracts (trial_ends_at)
  WHERE trial_ends_at IS NOT NULL;
