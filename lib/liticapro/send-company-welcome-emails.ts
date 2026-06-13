import {
  buildLiticaProOwnerWelcomeEmailHtml,
  buildLiticaProWelcomeEmailHtml,
} from "@/lib/email/liticapregao-welcome-template"
import { resolveLiticaProPortalUrl, resolveWelcomeEmailFromAddress } from "@/lib/send-licitapregao-welcome-email"
import { sendSmtpEmail } from "@/lib/mail-smtp"
import type { LiticaProSaaSUser } from "@/lib/liticapro/types"

const RESEND_API_URL = "https://api.resend.com/emails"

async function dispatchWelcomeEmail(input: {
  to: string
  subject: string
  html: string
}): Promise<{ ok: boolean; error?: string; channel?: "resend" | "smtp" | "dev" }> {
  const from = resolveWelcomeEmailFromAddress()
  const apiKey = process.env.RESEND_API_KEY?.trim()

  if (apiKey) {
    try {
      const res = await fetch(RESEND_API_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ from, to: [input.to], subject: input.subject, html: input.html }),
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
    to: input.to,
    subject: input.subject,
    html: input.html,
    replyTo: process.env.SMTP_REPLY_TO ?? "suporte@xpresssolutions.com.br",
  })
  if (smtp.ok) return { ok: true, channel: "smtp" }

  if (process.env.NODE_ENV === "development") {
    console.log("[DEV] E-mail LicitaPregão para", input.to)
    console.log("[DEV] Assunto:", input.subject)
    return { ok: true, channel: "dev" }
  }

  return {
    ok: false,
    error: smtp.error ?? "Configure RESEND_API_KEY ou SMTP no painel admin.",
    channel: "smtp",
  }
}

export async function sendLiticaProCompanyWelcomeEmails(params: {
  companyName: string
  users: LiticaProSaaSUser[]
  loginUrl?: string
  statesOfInterest?: string[]
}): Promise<{
  sentCount: number
  sentEmails: Set<string>
  errors: string[]
  channel?: "resend" | "smtp" | "dev"
}> {
  const portalUrl = resolveLiticaProPortalUrl(params.loginUrl)
  const sentEmails = new Set<string>()
  const errors: string[] = []
  let channel: "resend" | "smtp" | "dev" | undefined

  const owner =
    params.users.find((user) => user.is_owner) ??
    params.users.find((user) =>
      user.full_name.toLowerCase().includes("fernando"),
    ) ??
    params.users[0]

  const regularUsers = params.users.filter(
    (user) => user.email.trim().toLowerCase() !== owner.email.trim().toLowerCase(),
  )

  if (owner) {
    const ownerResult = await dispatchWelcomeEmail({
      to: owner.email.trim().toLowerCase(),
      subject: `Painel administrador LicitaPregão — ${params.companyName}`,
      html: buildLiticaProOwnerWelcomeEmailHtml({
        ownerName: owner.full_name,
        companyName: params.companyName,
        portalUrl,
        statesOfInterest: params.statesOfInterest,
        users: params.users.map((user) => ({
          full_name: user.full_name,
          email: user.email,
          credentials: user.credentials,
        })),
      }),
    })
    if (ownerResult.ok) {
      sentEmails.add(owner.email.trim().toLowerCase())
      channel = ownerResult.channel
    } else if (ownerResult.error) {
      errors.push(`${owner.email}: ${ownerResult.error}`)
    }
  }

  for (const user of regularUsers) {
    const userResult = await dispatchWelcomeEmail({
      to: user.email.trim().toLowerCase(),
      subject: "🚀 Seu acesso à LicitaPregão está liberado!",
      html: buildLiticaProWelcomeEmailHtml({
        clientName: user.full_name,
        credentials: user.credentials,
        portalUrl,
        customerType: "empresa",
        statesOfInterest: params.statesOfInterest,
      }),
    })
    if (userResult.ok) {
      sentEmails.add(user.email.trim().toLowerCase())
      channel = userResult.channel ?? channel
    } else if (userResult.error) {
      errors.push(`${user.email}: ${userResult.error}`)
    }
  }

  return { sentCount: sentEmails.size, sentEmails, errors, channel }
}

export async function sendLiticaProWelcomeEmailForSaasUser(params: {
  companyName: string
  user: LiticaProSaaSUser
  allUsers?: LiticaProSaaSUser[]
  loginUrl?: string
  statesOfInterest?: string[]
}) {
  const portalUrl = resolveLiticaProPortalUrl(params.loginUrl)
  const isOwner = Boolean(params.user.is_owner)
  const allUsers = params.allUsers ?? [params.user]

  if (isOwner && allUsers.length > 1) {
    return dispatchWelcomeEmail({
      to: params.user.email.trim().toLowerCase(),
      subject: `Painel administrador LicitaPregão — ${params.companyName}`,
      html: buildLiticaProOwnerWelcomeEmailHtml({
        ownerName: params.user.full_name,
        companyName: params.companyName,
        portalUrl,
        statesOfInterest: params.statesOfInterest,
        users: allUsers.map((user) => ({
          full_name: user.full_name,
          email: user.email,
          credentials: user.credentials,
        })),
      }),
    })
  }

  return dispatchWelcomeEmail({
    to: params.user.email.trim().toLowerCase(),
    subject: "🚀 Seu acesso à LicitaPregão está liberado!",
    html: buildLiticaProWelcomeEmailHtml({
      clientName: params.user.full_name,
      credentials: params.user.credentials,
      portalUrl,
      customerType: "empresa",
      statesOfInterest: params.statesOfInterest,
    }),
  })
}
