/**
 * Envio de e-mail para redefinição de senha.
 * Usa Resend (https://resend.com) se RESEND_API_KEY estiver definida.
 * Em desenvolvimento sem API key: loga o código no servidor (não bloqueia o fluxo).
 */

const RESEND_API_URL = "https://api.resend.com/emails"

export interface SendCodeEmailParams {
  to: string
  code: string
  userName?: string
}

export async function sendPasswordResetCode(params: SendCodeEmailParams): Promise<{ ok: boolean; error?: string }> {
  const { to, code, userName } = params
  const from = process.env.RESEND_FROM_EMAIL ?? "xpresssolutions@xpresssolutions.com.br"
  const subject = "Código para redefinir sua senha — Xpress Solutions"
  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: system-ui, sans-serif; line-height: 1.6; color: #1e293b; max-width: 480px; margin: 0 auto; padding: 24px;">
  <p>Olá${userName ? ` ${userName}` : ""},</p>
  <p>Você solicitou a redefinição de senha do painel Xpress Solutions. Use o código abaixo para continuar:</p>
  <p style="font-size: 28px; font-weight: 700; letter-spacing: 6px; color: #0ea5e9; margin: 20px 0;">${code}</p>
  <p style="color: #64748b; font-size: 14px;">Este código expira em <strong>15 minutos</strong>. Se você não solicitou essa alteração, ignore este e-mail.</p>
  <p style="margin-top: 32px;">— Xpress Solutions</p>
</body>
</html>
`.trim()

  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    if (process.env.NODE_ENV === "development") {
      console.log("[DEV] Código de redefinição de senha para", to, ":", code)
    }
    return { ok: true }
  }

  try {
    const res = await fetch(RESEND_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: from,
        to: [to],
        subject,
        html,
      }),
    })
    const data = (await res.json().catch(() => ({}))) as { message?: string }
    if (!res.ok) {
      return { ok: false, error: data?.message ?? `Falha ao enviar e-mail (${res.status})` }
    }
    return { ok: true }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro ao enviar e-mail"
    return { ok: false, error: msg }
  }
}
