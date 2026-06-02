const fs = require("fs")
const path = require("path")

// Carrega env
require("dotenv") // skip if not available

async function main() {
  process.chdir(path.join(__dirname, ".."))
  const env = Object.fromEntries(
    fs.readFileSync(".env.local", "utf8").split(/\r?\n/).filter((l) => l && !l.startsWith("#")).map((l) => {
      const i = l.indexOf("=")
      return [l.slice(0, i), l.slice(i + 1)]
    }),
  )
  process.env.DATABASE_HOST = env.DATABASE_HOST
  process.env.DATABASE_NAME = env.DATABASE_NAME
  process.env.DATABASE_USER = env.DATABASE_USER
  process.env.DATABASE_PASSWORD = env.DATABASE_PASSWORD

  const { findProductBySlug, updateProductStatus } = await import("../lib/db/repositories/products.repository.ts").catch(
    () => require("../lib/db/repositories/products.repository"),
  )

  const row = await findProductBySlug("segura")
  console.log("before:", row?.product_status)
  const updated = await updateProductStatus(row.id, "desativado")
  console.log("updated:", updated)
  const after = await findProductBySlug("segura")
  console.log("after read:", after?.product_status)
  await updateProductStatus(row.id, "no_ar")
}

main().catch(console.error)
