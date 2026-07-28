/**
 * Cria schema MySQL Toro + seed de produtos e usuário admin.
 * Uso: node scripts/run-mysql-setup.js
 * Requer DATABASE_HOST, DATABASE_USER, DATABASE_PASSWORD no ambiente ou .env.local
 */
const fs = require("fs")
const path = require("path")
const crypto = require("crypto")

function loadEnvLocal() {
  const envPath = path.join(__dirname, "..", ".env.local")
  if (!fs.existsSync(envPath)) return
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const t = line.trim()
    if (!t || t.startsWith("#")) continue
    const i = t.indexOf("=")
    if (i === -1) continue
    const key = t.slice(0, i).trim()
    const val = t.slice(i + 1).trim().replace(/^["']|["']$/g, "")
    if (!process.env[key]) process.env[key] = val
  }
}

const TORO_SEED = [
  ["f-001", "Short Booty Preto", 690, "Short booty de cintura alta em tecido compressivo preto ultrafine.", '{"category":"Shorts","gender":"feminino","image":"/products/editorial-f-short-booty-preto.webp","stockBySize":{"PP":3,"P":5,"M":8,"G":4},"stockTotal":20,"sizes":["PP","P","M","G"],"collectionLine":"Elite Black","tag":"Novo","bestSeller":true,"isLaunch":true}'],
  ["f-002", "Top Cropped Manga Longa", 620, "Top cropped manga longa em Dry Energy preto com gola alta.", '{"category":"Tops","gender":"feminino","image":"/products/editorial-f-cropped-preto.webp","stockBySize":{"PP":2,"P":6,"M":0,"G":3},"stockTotal":11,"sizes":["PP","P","M","G"],"collectionLine":"Elite Black","bestSeller":true}'],
  ["f-003", "Conjunto Preto Elite", 1480, "Conjunto exclusivo preto: top fio dental + short booty.", '{"category":"Conjuntos","gender":"feminino","image":"/products/editorial-f-conjunto-preto.webp","stockBySize":{"PP":1,"P":2,"M":1,"G":0},"stockTotal":4,"sizes":["PP","P","M","G"],"collectionLine":"Elite Black","tag":"Exclusivo","bestSeller":true}'],
  ["f-004", "Top Fio Dental Preto", 480, "Top fio dental em meia malha preta ultrafine.", '{"category":"Tops","gender":"feminino","image":"/products/editorial-f-top-fio-dental-preto.webp","stockBySize":{"PP":0,"P":0,"M":0,"G":0},"stockTotal":0,"sizes":["PP","P","M","G"],"collectionLine":"Elite Black","tag":"Novo","isLaunch":true}'],
  ["m-001", "Regata Machão Preto", 480, "Regata machão em meia malha preta ultrafine.", '{"category":"Regatas","gender":"masculino","image":"/products/editorial-m-machao-preto.webp","stockBySize":{"P":6,"M":10,"G":7,"GG":2},"stockTotal":25,"sizes":["P","M","G","GG"],"collectionLine":"Elite Black","tag":"Novo","bestSeller":true,"isLaunch":true}'],
  ["m-002", "Short Elastic Preto", 560, "Short elastic preto com cintura elástica e logo TORO.", '{"category":"Shorts","gender":"masculino","image":"/products/editorial-m-short-elastic-preto.webp","stockBySize":{"P":4,"M":5,"G":3,"GG":1},"stockTotal":13,"sizes":["P","M","G","GG"],"collectionLine":"Elite Black","bestSeller":true}'],
  ["m-003", "Conjunto Machão + Short", 1340, "Conjunto completo preto: regata machão + short elastic.", '{"category":"Conjuntos","gender":"masculino","image":"/products/editorial-m-conjunto-machao-short.webp","stockBySize":{"P":2,"M":4,"G":2,"GG":0},"stockTotal":8,"sizes":["P","M","G","GG"],"collectionLine":"Elite Black","tag":"Exclusivo","bestSeller":true}'],
  ["m-004", "Regata Machão Performance", 520, "Regata machão preta performance com tecido respirável.", '{"category":"Regatas","gender":"masculino","image":"/products/editorial-m-machao-forca.webp","stockBySize":{"P":3,"M":6,"G":4,"GG":2},"stockTotal":15,"sizes":["P","M","G","GG"],"collectionLine":"Elite Black","tag":"Novo","isLaunch":true}'],
]

async function main() {
  loadEnvLocal()
  const mysql = require("mysql2/promise")

  const conn = await mysql.createConnection({
    host: process.env.DATABASE_HOST,
    port: Number(process.env.DATABASE_PORT || 3306),
    database: process.env.DATABASE_NAME || "toro_xp",
    user: process.env.DATABASE_USER || "toro_xp",
    password: process.env.DATABASE_PASSWORD || "",
    multipleStatements: true,
  })

  console.log("Conectado ao MySQL:", process.env.DATABASE_HOST)

  const schemaSql = fs.readFileSync(path.join(__dirname, "mysql", "001_toro_schema.sql"), "utf8")
  await conn.query(schemaSql)
  console.log("Schema criado/atualizado.")

  for (const [slug, name, price, description, metadata] of TORO_SEED) {
    const status = metadata.includes('"stockTotal":0') || metadata.includes('"M":0,"G":0,"stockTotal":0') ? "esgotado" : "disponivel"
    const meta = JSON.parse(metadata)
    const stockTotal = Object.values(meta.stockBySize || {}).reduce((a, b) => a + b, 0)
    const productStatus = stockTotal <= 0 ? "esgotado" : "disponivel"
    meta.stockTotal = stockTotal

    const [existing] = await conn.execute(
      `SELECT id FROM products WHERE slug = ? OR external_id = ? LIMIT 1`,
      [slug, slug],
    )
    if (existing.length > 0) {
      await conn.execute(
        `UPDATE products SET name=?, description=?, price=?, metadata=?, product_status=?, is_active=1 WHERE id=?`,
        [name, description, price, JSON.stringify(meta), productStatus, existing[0].id],
      )
    } else {
      await conn.execute(
        `INSERT INTO products (id, name, description, icon, slug, external_id, price, product_status, is_active, metadata)
         VALUES (UUID(), ?, ?, 'shirt', ?, ?, ?, ?, 1, ?)`,
        [name, description, slug, slug, price, productStatus, JSON.stringify(meta)],
      )
    }
  }
  console.log("8 produtos Toro seedados.")

  const hash = crypto.createHash("sha256").update("toro@101029").digest("hex")
  await conn.execute(
    `INSERT INTO dashboard_users (id, username, password_hash, role, display_name)
     VALUES (UUID(), 'Toro', ?, 'admin', 'Toro')
     ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash), role = 'admin', display_name = 'Toro'`,
    [hash],
  )
  console.log("Usuário Toro OK (login: Toro / toro@101029).")

  const [countRows] = await conn.execute(
    `SELECT COUNT(*) AS n FROM products WHERE JSON_UNQUOTE(JSON_EXTRACT(metadata, '$.gender')) IS NOT NULL`,
  )
  console.log("Produtos Toro no banco:", countRows[0].n)

  await conn.end()
  console.log("Setup MySQL concluído!")
}

main().catch((e) => {
  console.error("Erro:", e.message)
  process.exit(1)
})
