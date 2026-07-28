-- Toro e-commerce: campos extras em products + tabela de pedidos do site

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS external_id text,
  ADD COLUMN IF NOT EXISTS price numeric(12,2),
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE UNIQUE INDEX IF NOT EXISTS products_external_id_idx
  ON public.products (external_id)
  WHERE external_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.toro_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number text NOT NULL UNIQUE,
  site_user_id text,
  customer_name text,
  customer_email text,
  customer_phone text,
  customer_cpf_cnpj text,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  subtotal numeric(12,2) NOT NULL DEFAULT 0,
  shipping numeric(12,2) NOT NULL DEFAULT 0,
  discount numeric(12,2) NOT NULL DEFAULT 0,
  total numeric(12,2) NOT NULL DEFAULT 0,
  coupon_code text,
  address jsonb,
  payment_method text,
  payment_status text NOT NULL DEFAULT 'pending',
  order_status text NOT NULL DEFAULT 'pending_payment',
  tracking_code text,
  status_history jsonb NOT NULL DEFAULT '[]'::jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS toro_orders_created_at_idx ON public.toro_orders (created_at DESC);
CREATE INDEX IF NOT EXISTS toro_orders_order_status_idx ON public.toro_orders (order_status);

ALTER TABLE public.toro_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "toro_orders_select" ON public.toro_orders;
CREATE POLICY "toro_orders_select" ON public.toro_orders FOR SELECT USING (true);
DROP POLICY IF EXISTS "toro_orders_insert" ON public.toro_orders;
CREATE POLICY "toro_orders_insert" ON public.toro_orders FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "toro_orders_update" ON public.toro_orders;
CREATE POLICY "toro_orders_update" ON public.toro_orders FOR UPDATE USING (true);

CREATE OR REPLACE FUNCTION public.set_toro_orders_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS toro_orders_updated_at ON public.toro_orders;
CREATE TRIGGER toro_orders_updated_at
  BEFORE UPDATE ON public.toro_orders
  FOR EACH ROW EXECUTE FUNCTION public.set_toro_orders_updated_at();

-- Seed produtos do site Toro (https://toro-green.vercel.app)
INSERT INTO public.products (name, description, icon, slug, external_id, price, product_status, is_active, metadata)
VALUES
  ('Short Booty Preto', 'Short booty de cintura alta em tecido compressivo preto ultrafine.', 'shirt', 'f-001', 'f-001', 690, 'no_ar', true,
   '{"category":"Shorts","gender":"feminino","image":"/products/editorial-f-short-booty-preto.webp","stockBySize":{"PP":3,"P":5,"M":8,"G":4},"sizes":["PP","P","M","G"],"collectionLine":"Elite Black","tag":"Novo","bestSeller":true,"isLaunch":true}'::jsonb),
  ('Top Cropped Manga Longa', 'Top cropped manga longa em Dry Energy preto com gola alta.', 'shirt', 'f-002', 'f-002', 620, 'no_ar', true,
   '{"category":"Tops","gender":"feminino","image":"/products/editorial-f-cropped-preto.webp","stockBySize":{"PP":2,"P":6,"M":0,"G":3},"sizes":["PP","P","M","G"],"collectionLine":"Elite Black","bestSeller":true}'::jsonb),
  ('Conjunto Preto Elite', 'Conjunto exclusivo preto: top fio dental + short booty.', 'shirt', 'f-003', 'f-003', 1480, 'no_ar', true,
   '{"category":"Conjuntos","gender":"feminino","image":"/products/editorial-f-conjunto-preto.webp","stockBySize":{"PP":1,"P":2,"M":1,"G":0},"sizes":["PP","P","M","G"],"collectionLine":"Elite Black","tag":"Exclusivo","bestSeller":true}'::jsonb),
  ('Top Fio Dental Preto', 'Top fio dental em meia malha preta ultrafine.', 'shirt', 'f-004', 'f-004', 480, 'no_ar', true,
   '{"category":"Tops","gender":"feminino","image":"/products/editorial-f-top-fio-dental-preto.webp","stockBySize":{"PP":0,"P":0,"M":0,"G":0},"sizes":["PP","P","M","G"],"collectionLine":"Elite Black","tag":"Novo","isLaunch":true}'::jsonb),
  ('Regata Machão Preto', 'Regata machão em meia malha preta ultrafine.', 'shirt', 'm-001', 'm-001', 480, 'no_ar', true,
   '{"category":"Regatas","gender":"masculino","image":"/products/editorial-m-machao-preto.webp","stockBySize":{"P":6,"M":10,"G":7,"GG":2},"sizes":["P","M","G","GG"],"collectionLine":"Elite Black","tag":"Novo","bestSeller":true,"isLaunch":true}'::jsonb),
  ('Short Elastic Preto', 'Short elastic preto com cintura elástica e logo TORO.', 'shirt', 'm-002', 'm-002', 560, 'no_ar', true,
   '{"category":"Shorts","gender":"masculino","image":"/products/editorial-m-short-elastic-preto.webp","stockBySize":{"P":4,"M":5,"G":3,"GG":1},"sizes":["P","M","G","GG"],"collectionLine":"Elite Black","bestSeller":true}'::jsonb),
  ('Conjunto Machão + Short', 'Conjunto completo preto: regata machão + short elastic.', 'shirt', 'm-003', 'm-003', 1340, 'no_ar', true,
   '{"category":"Conjuntos","gender":"masculino","image":"/products/editorial-m-conjunto-machao-short.webp","stockBySize":{"P":2,"M":4,"G":2,"GG":0},"sizes":["P","M","G","GG"],"collectionLine":"Elite Black","tag":"Exclusivo","bestSeller":true}'::jsonb),
  ('Regata Machão Performance', 'Regata machão preta performance com tecido respirável.', 'shirt', 'm-004', 'm-004', 520, 'no_ar', true,
   '{"category":"Regatas","gender":"masculino","image":"/products/editorial-m-machao-forca.webp","stockBySize":{"P":3,"M":6,"G":4,"GG":2},"sizes":["P","M","G","GG"],"collectionLine":"Elite Black","tag":"Novo","isLaunch":true}'::jsonb)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  external_id = EXCLUDED.external_id,
  price = EXCLUDED.price,
  metadata = EXCLUDED.metadata,
  product_status = EXCLUDED.product_status,
  is_active = EXCLUDED.is_active;
