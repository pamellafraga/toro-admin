import { buildLiticaProWelcomeEmailHtml } from "@/lib/email/liticapregao-welcome-template"
import { sendSmtpEmail } from "@/lib/mail-smtp"
import type { LiticaProDeveloperCredentials } from "@/lib/liticapro/types"

const RESEND_API_URL = "https://api.resend.com/emails"

export function resolveLiticaProPortalUrl(loginUrl?: string): string {
  const configured =
    process.env.LICITAPREGAO_PORTAL_URL?.trim() ||
    process.env.LICITAPREGAO_LOGIN_URL?.trim() ||
    loginUrl?.trim() ||
    "https://licitapregao.xpresssolutions.com.br/"

  return configured.replace(/\/login\/?$/, "/")
}

export async function sendLiticaProWelcomeEmail(params: {
  to: string
  clientName: string
  credentials: LiticaProDeveloperCredentials
  loginUrl?: string
  customerType: "empresa" | "profissional_liberal"
  statesOfInterest?: string[]
}): Promise<{ ok: boolean; error?: string; channel?: "resend" | "smtp" | "dev" }> {
  const { to, clientName, credentials, loginUrl, customerType, statesOfInterest } = params
  const portalUrl = resolveLiticaProPortalUrl(loginUrl)
  const from = process.env.RESEND_FROM_EMAIL ?? process.env.SMTP_USER ?? "noreply@xpresssolutions.com.br"
  const subject = "🚀 Seu acesso à LicitaPro está liberado!"
  const html = buildLiticaProWelcomeEmailHtml({
    clientName,
    credentials,
    portalUrl,
    customerType,
    statesOfInterest,
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
  if (smtp.ok) {
    return { ok: true, channel: "smtp" }
  }

  if (process.env.NODE_ENV === "development") {
    console.log("[DEV] E-mail de boas-vindas LicitaPro para", to)
    console.log("[DEV] Portal:", portalUrl)
    console.log("[DEV] Credenciais:", credentials)
    return { ok: true, channel: "dev" }
  }

  return {
    ok: false,
    error: smtp.error ?? "Configure RESEND_API_KEY ou SMTP_HOST/SMTP_USER/SMTP_PASS no painel admin.",
    channel: "smtp",
  }
}
