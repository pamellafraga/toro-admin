import nodemailer from "nodemailer"

export function getSmtpConfig() {
  const host = process.env.SMTP_HOST
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS
  if (!host || !user || !pass) return null
  return {
    host,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === "true",
    auth: { user, pass },
  }
}

export async function sendSmtpEmail(options: {
  to: string
  subject: string
  html: string
  replyTo?: string
}): Promise<{ ok: boolean; error?: string }> {
  const config = getSmtpConfig()
  if (!config) {
    return { ok: false, error: "SMTP não configurado." }
  }

  try {
    const transporter = nodemailer.createTransport(config)
    const fromUser = process.env.SMTP_USER!
    const fromName = process.env.SMTP_FROM_NAME ?? "Xpress Solutions"

    await transporter.sendMail({
      from: `"${fromName}" <${fromUser}>`,
      to: options.to,
      replyTo: options.replyTo ?? process.env.SMTP_REPLY_TO ?? fromUser,
      subject: options.subject,
      html: options.html,
    })

    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Erro ao enviar e-mail via SMTP." }
  }
}
