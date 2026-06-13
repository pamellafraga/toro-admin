import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const envPath = path.join(__dirname, "..", ".env.local")
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith("#")) continue
    const idx = trimmed.indexOf("=")
    if (idx <= 0) continue
    const key = trimmed.slice(0, idx).trim()
    const value = trimmed.slice(idx + 1).trim()
    if (!process.env[key]) process.env[key] = value
  }
}

import { sendLiticaProTrialCourtesyEmail } from "../lib/liticapro/send-trial-courtesy-email"

async function main() {
  const targets = [
    {
      to: "eduribeiro2002@yahoo.com.br",
      name: "Eduardo",
      previous: "10/06/2026",
      newEnd: "20/06/2026",
    },
  ]

  for (const target of targets) {
    const result = await sendLiticaProTrialCourtesyEmail({
      to: target.to,
      clientName: target.name,
      previousEndLabel: target.previous,
      newEndLabel: target.newEnd,
      extraDays: 7,
    })
    console.log(target.to, result)
  }
}

main().catch(console.error)
