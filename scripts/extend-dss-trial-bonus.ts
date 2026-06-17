import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
for (const envFile of [".env.local", ".env"]) {
  const envPath = path.join(__dirname, "..", envFile)
  if (!fs.existsSync(envPath)) continue
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith("#")) continue
    const idx = trimmed.indexOf("=")
    if (idx <= 0) continue
    const key = trimmed.slice(0, idx).trim()
    let value = trimmed.slice(idx + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    if (!process.env[key]) process.env[key] = value
  }
}

import { extendDssTrialBonusAndNotify } from "../lib/liticapro/dss-trial-bonus-extension"

async function main() {
  const dryRun = process.argv.includes("--dry-run")
  const noEmail = process.argv.includes("--no-email")
  const emailOnly = process.argv.includes("--email-only")
  const extraArg = process.argv.find((a) => a.startsWith("--days="))
  const extraDays = extraArg ? Number(extraArg.split("=")[1]) : 7

  console.log(
    dryRun
      ? "Modo dry-run — nenhuma alteração no banco, sem envio de e-mail."
      : noEmail
        ? "Aplicando extensão sem enviar e-mails."
        : "Aplicando extensão +7 dias e enviando e-mails para todos os usuários DSS…",
  )

  const result = await extendDssTrialBonusAndNotify({
    extraDays,
    sendEmail: !noEmail,
    dryRun,
    emailOnly,
    activityActor: { displayName: "Script bônus DSS" },
  })

  console.log(JSON.stringify(result, null, 2))

  const failed = result.users.filter((u) => u.sent === false && u.error !== "dry-run" && u.error !== "envio desligado")
  if (failed.length > 0 && !dryRun && !noEmail) {
    console.error(`Falha no envio para ${failed.length} destinatário(s).`)
    process.exit(1)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
