-- Notificações: público-alvo (admin) e chave anti-duplicata
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS audience TEXT NOT NULL DEFAULT 'all';
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS dedupe_key TEXT;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS is_read BOOLEAN;

UPDATE notifications SET is_read = COALESCE(is_read, "read", false) WHERE is_read IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_notifications_dedupe_key
  ON notifications (dedupe_key)
  WHERE dedupe_key IS NOT NULL;
