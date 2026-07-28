const { Client } = require("pg")
const fs = require("fs")
const path = require("path")

const TORO_SEED = [
  ["f-001", "Short Booty Preto", 690, "Short booty de cintura alta em tecido compressivo preto ultrafine.", '{"category":"Shorts","gender":"feminino","image":"/products/editorial-f-short-booty-preto.webp","stockBySize":{"PP":3,"P":5,"M":8,"G":4},"sizes":["PP","P","M","G"],"collectionLine":"Elite Black","tag":"Novo","bestSeller":true,"isLaunch":true}'],
  ["f-002", "Top Cropped Manga Longa", 620, "Top cropped manga longa em Dry Energy preto com gola alta.", '{"category":"Tops","gender":"feminino","image":"/products/editorial-f-cropped-preto.webp","stockBySize":{"PP":2,"P":6,"M":0,"G":3},"sizes":["PP","P","M","G"],"collectionLine":"Elite Black","bestSeller":true}'],
  ["f-003", "Conjunto Preto Elite", 1480, "Conjunto exclusivo preto: top fio dental + short booty.", '{"category":"Conjuntos","gender":"feminino","image":"/products/editorial-f-conjunto-preto.webp","stockBySize":{"PP":1,"P":2,"M":1,"G":0},"sizes":["PP","P","M","G"],"collectionLine":"Elite Black","tag":"Exclusivo","bestSeller":true}'],
  ["f-004", "Top Fio Dental Preto", 480, "Top fio dental em meia malha preta ultrafine.", '{"category":"Tops","gender":"feminino","image":"/products/editorial-f-top-fio-dental-preto.webp","stockBySize":{"PP":0,"P":0,"M":0,"G":0},"sizes":["PP","P","M","G"],"collectionLine":"Elite Black","tag":"Novo","isLaunch":true}'],
  ["m-001", "Regata Machão Preto", 480, "Regata machão em meia malha preta ultrafine.", '{"category":"Regatas","gender":"masculino","image":"/products/editorial-m-machao-preto.webp","stockBySize":{"P":6,"M":10,"G":7,"GG":2},"sizes":["P","M","G","GG"],"collectionLine":"Elite Black","tag":"Novo","bestSeller":true,"isLaunch":true}'],
  ["m-002", "Short Elastic Preto", 560, "Short elastic preto com cintura elástica e logo TORO.", '{"category":"Shorts","gender":"masculino","image":"/products/editorial-m-short-elastic-preto.webp","stockBySize":{"P":4,"M":5,"G":3,"GG":1},"sizes":["P","M","G","GG"],"collectionLine":"Elite Black","bestSeller":true}'],
  ["m-003", "Conjunto Machão + Short", 1340, "Conjunto completo preto: regata machão + short elastic.", '{"category":"Conjuntos","gender":"masculino","image":"/products/editorial-m-conjunto-machao-short.webp","stockBySize":{"P":2,"M":4,"G":2,"GG":0},"sizes":["P","M","G","GG"],"collectionLine":"Elite Black","tag":"Exclusivo","bestSeller":true}'],
  ["m-004", "Regata Machão Performance", 520, "Regata machão preta performance com tecido respirável.", '{"category":"Regatas","gender":"masculino","image":"/products/editorial-m-machao-forca.webp","stockBySize":{"P":3,"M":6,"G":4,"GG":2},"sizes":["P","M","G","GG"],"collectionLine":"Elite Black","tag":"Novo","isLaunch":true}'],
]

async function upsertProduct(c, slug, name, price, description, metadataJson) {
  const updated = await c.query(
    `UPDATE products SET
      name = $2, description = $3, external_id = $1, price = $4,
      metadata = $5::jsonb, product_status = 'disponivel', is_active = true,
      icon = 'shirt'
     WHERE slug = $1 OR external_id = $1
     RETURNING id`,
    [slug, name, description, price, metadataJson],
  )
  if (updated.rowCount > 0) return

  await c.query(
    `INSERT INTO products (name, description, icon, slug, external_id, price, product_status, is_active, metadata)
     VALUES ($2, $3, 'shirt', $1, $1, $4, 'disponivel', true, $5::jsonb)`,
    [slug, name, description, price, metadataJson],
  )
}

async function main() {
  const c = new Client({
    host: process.env.DATABASE_HOST || "admxpress.postgresql.dbaas.com.br",
    port: Number(process.env.DATABASE_PORT || 5432),
    database: process.env.DATABASE_NAME || "admxpress",
    user: process.env.DATABASE_USER || "admxpress",
    password: process.env.DATABASE_PASSWORD || "Xpress@101029",
    ssl: process.env.DATABASE_SSL === "true",
  })
  await c.connect()

  await c.query(`
    ALTER TABLE public.products
      ADD COLUMN IF NOT EXISTS external_id text,
      ADD COLUMN IF NOT EXISTS price numeric(12,2),
      ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;
  `)
  console.log("Colunas external_id, price, metadata OK.")

  const toroOrdersSql = fs.readFileSync(path.join(__dirname, "036_toro_ecommerce.sql"), "utf8")
  const ordersBlock = toroOrdersSql.match(/CREATE TABLE IF NOT EXISTS public\.toro_orders[\s\S]*?FOR EACH ROW EXECUTE FUNCTION public\.set_toro_orders_updated_at\(\);/)
  if (ordersBlock) {
    await c.query(ordersBlock[0])
    console.log("Tabela toro_orders OK.")
  }

  for (const [slug, name, price, description, metadata] of TORO_SEED) {
    await upsertProduct(c, slug, name, price, description, metadata)
  }
  console.log("8 produtos Toro seedados.")

  const count = await c.query(
    `SELECT count(*)::int AS n FROM products WHERE metadata->>'gender' IS NOT NULL`,
  )
  console.log("Produtos Toro no banco:", count.rows[0].n)
  await c.end()
}

main().catch((e) => {
  console.error(e.message)
  process.exit(1)
})
