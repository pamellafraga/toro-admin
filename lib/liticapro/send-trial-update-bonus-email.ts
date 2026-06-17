import { buildLiticaProTrialUpdateBonusEmailHtml } from "@/lib/email/liticapregao-trial-update-bonus-template"
import { sendSmtpEmail } from "@/lib/mail-smtp"
import { resolveLiticaProPortalUrl, resolveWelcomeEmailFromAddress } from "@/lib/send-licitapregao-welcome-email"

const RESEND_API_URL = "https://api.resend.com/emails"

export async function sendLiticaProTrialUpdateBonusEmail(params: {
  to: string
  clientName: string
  extraDays: number
  trialEndsLabel: string
  loginUrl?: string
}): Promise<{ ok: boolean; error?: string; channel?: "resend" | "smtp" | "dev" }> {
  const to = params.to.trim().toLowerCase()
  if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
    return { ok: false, error: "E-mail inválido." }
  }

  const portalUrl = resolveLiticaProPortalUrl(params.loginUrl)
  const from = resolveWelcomeEmailFromAddress()
  const subject = `Novidades LicitaPregão — +${params.extraDays} dias de teste gratuito para você`
  const html = buildLiticaProTrialUpdateBonusEmailHtml({
    clientName: params.clientName,
    extraDays: params.extraDays,
    trialEndsLabel: params.trialEndsLabel,
    portalUrl,
  })

  const apiKey = process.env.RESEND_API_KEY?.trim()
  if (apiKey) {
    try {
      const res = await fetch(RESEND_API_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ from, to: [to], subject, html }),
      })
      const data = (await res.json().catch(() => ({}))) as { message?: string }
      if (!res.ok) {
        return { ok: false, error: data?.message ?? `Falha ao enviar e-mail (${res.status}).`, channel: "resend" }
      }
      return { ok: true, channel: "resend" }
    } catch (e) {
      return {
        ok: false,
        error: e instanceof Error ? e.message : "Erro ao enviar e-mail via Resend.",
        channel: "resend",
      }
    }
  }

  const smtp = await sendSmtpEmail({
    to,
    subject,
    html,
    replyTo: process.env.SMTP_REPLY_TO ?? "suporte@xpresssolutions.com.br",
  })
  if (smtp.ok) return { ok: true, channel: "smtp" }

  if (process.env.NODE_ENV === "development") {
    console.log("[DEV] Bônus teste LicitaPregão para", to, "até", params.trialEndsLabel)
    return { ok: true, channel: "dev" }
  }

  return {
    ok: false,
    error: smtp.error ?? "Configure RESEND_API_KEY ou SMTP no painel admin.",
    channel: "smtp",
  }
}
