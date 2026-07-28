-- Imagens de produtos enviadas pelo painel (armazenamento binário no PostgreSQL)
CREATE TABLE IF NOT EXISTS toro_product_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  filename text NOT NULL UNIQUE,
  content_type text NOT NULL,
  data bytea NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_toro_product_images_filename ON toro_product_images (filename);
