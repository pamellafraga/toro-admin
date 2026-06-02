-- Índices para reforçar unicidade de telefone e e-mail (dígitos normalizados).
-- Execute após backup. Contatos com telefone/e-mail vazio não entram no índice.

CREATE UNIQUE INDEX IF NOT EXISTS idx_clients_phone_digits_unique
  ON clients (regexp_replace(COALESCE(phone, ''), '\D', '', 'g'))
  WHERE length(regexp_replace(COALESCE(phone, ''), '\D', '', 'g')) >= 10;

CREATE UNIQUE INDEX IF NOT EXISTS idx_clients_email_lower_unique
  ON clients (lower(trim(email)))
  WHERE trim(COALESCE(email, '')) <> '' AND position('@' in trim(email)) > 0;
