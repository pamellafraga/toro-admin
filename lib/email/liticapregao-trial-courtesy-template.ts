function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

export function buildLiticaProTrialCourtesyEmailHtml(params: {
  clientName: string
  previousEndLabel: string
  newEndLabel: string
  extraDays: number
  portalUrl: string
}): string {
  const nome = escapeHtml(params.clientName)
  const previousEnd = escapeHtml(params.previousEndLabel)
  const newEnd = escapeHtml(params.newEndLabel)
  const extraDays = String(params.extraDays)
  const portalUrl = escapeHtml(params.portalUrl)

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Cortesia LicitaPregão — +${extraDays} dias</title>
</head>
<body style="margin:0;padding:0;background:#eef2f7;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1e293b;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#eef2f7;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#ffffff;border-radius:18px;overflow:hidden;box-shadow:0 18px 48px rgba(15,23,42,0.12);">
          <tr>
            <td style="background:linear-gradient(135deg,#0f172a 0%,#1e3a8a 52%,#2563eb 100%);padding:34px 38px;color:#ffffff;">
              <p style="margin:0 0 8px;font-size:12px;letter-spacing:0.14em;text-transform:uppercase;opacity:0.82;">Xpress Solutions</p>
              <h1 style="margin:0;font-size:28px;line-height:1.25;font-weight:700;">Seu acesso foi reativado por cortesia</h1>
              <p style="margin:14px 0 0;font-size:15px;line-height:1.65;opacity:0.94;">Prezado(a) <strong>${nome}</strong>, liberamos mais <strong>${extraDays} dias gratuitos</strong> para você continuar utilizando a LicitaPregão.</p>
            </td>
          </tr>

          <tr>
            <td style="padding:34px 38px 8px;">
              <p style="margin:0 0 18px;font-size:16px;line-height:1.75;color:#334155;">
                Identificamos que o seu período de teste gratuito encerrou em <strong>${previousEnd}</strong>.
                Como forma de cortesia comercial, reativamos sua conta com mais <strong>${extraDays} dias de acesso</strong>,
                sem custo adicional neste intervalo.
              </p>

              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f8fafc;border:1px solid #dbeafe;border-radius:14px;margin-bottom:22px;">
                <tr>
                  <td style="padding:22px 24px;">
                    <p style="margin:0 0 14px;font-size:13px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#1d4ed8;">Resumo da cortesia</p>
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="padding:8px 0;border-bottom:1px solid #e2e8f0;font-size:14px;color:#64748b;width:42%;">Teste anterior encerrado em</td>
                        <td style="padding:8px 0;border-bottom:1px solid #e2e8f0;font-size:14px;color:#0f172a;font-weight:600;">${previousEnd}</td>
                      </tr>
                      <tr>
                        <td style="padding:8px 0;border-bottom:1px solid #e2e8f0;font-size:14px;color:#64748b;">Dias de cortesia concedidos</td>
                        <td style="padding:8px 0;border-bottom:1px solid #e2e8f0;font-size:14px;color:#0f172a;font-weight:600;">+${extraDays} dias</td>
                      </tr>
                      <tr>
                        <td style="padding:8px 0;font-size:14px;color:#64748b;">Novo prazo de acesso gratuito</td>
                        <td style="padding:8px 0;font-size:14px;color:#0f172a;font-weight:700;">${newEnd}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 18px;font-size:16px;line-height:1.75;color:#334155;">
                Seu ambiente já está liberado novamente. Utilize as mesmas credenciais de acesso enviadas anteriormente.
                Caso precise de apoio, nossa equipe comercial permanece à disposição.
              </p>

              <table role="presentation" cellspacing="0" cellpadding="0" style="margin:8px 0 0;">
                <tr>
                  <td style="border-radius:10px;background:#2563eb;">
                    <a href="${portalUrl}" style="display:inline-block;padding:14px 28px;color:#ffffff;text-decoration:none;font-size:16px;font-weight:700;">Acessar LicitaPregão</a>
                  </td>
                </tr>
              </table>
              <p style="margin:10px 0 0;font-size:13px;color:#64748b;word-break:break-all;">${portalUrl}</p>
            </td>
          </tr>

          <tr>
            <td style="padding:8px 38px 28px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#fff7ed;border:1px solid #fed7aa;border-radius:12px;">
                <tr>
                  <td style="padding:18px 20px;">
                    <p style="margin:0;font-size:14px;line-height:1.7;color:#9a3412;">
                      <strong>Importante:</strong> ao final deste novo período de cortesia, será necessário escolher um plano
                      para continuidade do serviço. Entre em contato conosco para orientação comercial personalizada.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding:24px 38px 34px;background:#f8fafc;border-top:1px solid #e2e8f0;">
              <p style="margin:0 0 8px;font-size:15px;line-height:1.6;color:#475569;">
                Agradecemos a confiança em nossa plataforma e desejamos excelentes resultados em suas licitações.
              </p>
              <p style="margin:0;font-size:15px;font-weight:700;color:#0f172a;">Equipe Xpress Solutions</p>
              <p style="margin:8px 0 0;font-size:13px;color:#64748b;">suporte@xpresssolutions.com.br</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}
