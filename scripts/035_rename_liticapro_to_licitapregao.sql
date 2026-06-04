-- Corrige nome exibido do produto (slug interno permanece liticapro)
UPDATE products
SET name = 'LicitaPregão'
WHERE lower(trim(slug)) = 'liticapro'
   OR lower(trim(name)) = 'liticapro';
