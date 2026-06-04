-- Renomeia Software de Gestão → SEGURA e adiciona LicitaPregão
ALTER TABLE products ADD COLUMN IF NOT EXISTS slug TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS monthly_price DECIMAL(10,2) NOT NULL DEFAULT 0;

-- Renomear produto principal
UPDATE products
SET
  name = 'SEGURA',
  slug = 'segura',
  description = 'Apólice de Seguro - Modalidade Garantias',
  icon = 'shield-check'
WHERE name IN ('Software de Gestão', 'SEGURA')
   OR slug IN ('software-gestao-apolice-seguro', 'segura');

-- Remover produtos seed antigos que não são mais usados no painel
DELETE FROM products
WHERE name IN ('Gestao de Apolices de Garantias', 'Gestao de Contratos', 'Xpress Chat')
  AND slug IS NULL;

-- LicitaPregão
INSERT INTO products (name, description, icon, slug, product_status, is_active)
SELECT 'LicitaPregão', 'Monitoramento de licitações públicas no Brasil', 'search', 'liticapro', 'no_ar', true
WHERE NOT EXISTS (SELECT 1 FROM products WHERE slug = 'liticapro');

-- Índice único só depois dos dados corrigidos
DROP INDEX IF EXISTS idx_products_slug;
CREATE UNIQUE INDEX IF NOT EXISTS idx_products_slug ON products(slug) WHERE slug IS NOT NULL;
