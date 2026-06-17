function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

export function buildLiticaProTrialUpdateBonusEmailHtml(params: {
  clientName: string
  extraDays: number
  trialEndsLabel: string
  portalUrl: string
}): string {
  const nome = escapeHtml(params.clientName)
  const extraDays = String(params.extraDays)
  const trialEnds = escapeHtml(params.trialEndsLabel)
  const portalUrl = escapeHtml(params.portalUrl)

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Novidades LicitaPregão — +${extraDays} dias de teste</title>
</head>
<body style="margin:0;padding:0;background:#eef2f7;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1e293b;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#eef2f7;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#ffffff;border-radius:18px;overflow:hidden;box-shadow:0 18px 48px rgba(15,23,42,0.12);">
          <tr>
            <td style="background:linear-gradient(135deg,#0f172a 0%,#1d4ed8 52%,#7c3aed 100%);padding:34px 38px;color:#ffffff;">
              <p style="margin:0 0 8px;font-size:12px;letter-spacing:0.14em;text-transform:uppercase;opacity:0.85;">Xpress Solutions · LicitaPregão</p>
              <h1 style="margin:0;font-size:28px;line-height:1.25;font-weight:700;">Novidades na plataforma — e mais tempo para explorar</h1>
              <p style="margin:14px 0 0;font-size:15px;line-height:1.65;opacity:0.94;">Olá, <strong>${nome}</strong>. Liberamos <strong>+${extraDays} dias de teste gratuito</strong> para você conhecer as melhorias que acabamos de publicar.</p>
            </td>
          </tr>

          <tr>
            <td style="padding:34px 38px 8px;">
              <p style="margin:0 0 18px;font-size:16px;line-height:1.75;color:#334155;">
                Atualizamos a LicitaPregão com novos recursos e melhorias na experiência de busca e acompanhamento de editais.
                Para que sua equipe tenha mais tempo de explorar tudo com calma, estendemos o período de teste gratuito
                em <strong>${extraDays} dias adicionais</strong> — somados ao prazo que você já possuía.
              </p>

              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:linear-gradient(180deg,#f8fafc 0%,#eff6ff 100%);border:1px solid #dbeafe;border-radius:14px;margin-bottom:22px;">
                <tr>
                  <td style="padding:22px 24px;">
                    <p style="margin:0 0 14px;font-size:13px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#1d4ed8;">Seu teste gratuito</p>
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="padding:8px 0;border-bottom:1px solid #e2e8f0;font-size:14px;color:#64748b;width:48%;">Dias extras liberados</td>
                        <td style="padding:8px 0;border-bottom:1px solid #e2e8f0;font-size:14px;color:#0f172a;font-weight:700;">+${extraDays} dias</td>
                      </tr>
                      <tr>
                        <td style="padding:8px 0;font-size:14px;color:#64748b;">Teste gratuito válido até</td>
                        <td style="padding:8px 0;font-size:16px;color:#1d4ed8;font-weight:800;">${trialEnds}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 14px;font-size:15px;font-weight:700;color:#0f172a;">O que há de novo para explorar:</p>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom:22px;">
                <tr>
                  <td style="padding:10px 0;font-size:15px;line-height:1.65;color:#334155;">✦ Busca de editais mais abrangente e atualizada</td>
                </tr>
                <tr>
                  <td style="padding:10px 0;font-size:15px;line-height:1.65;color:#334155;">✦ Gestão de usuários com regiões e estados de acesso</td>
                </tr>
                <tr>
                  <td style="padding:10px 0;font-size:15px;line-height:1.65;color:#334155;">✦ Participações em licitações e fluxo de acompanhamento</td>
                </tr>
                <tr>
                  <td style="padding:10px 0;font-size:15px;line-height:1.65;color:#334155;">✦ Interface refinada para equipes comerciais e licitações</td>
                </tr>
              </table>

              <p style="margin:0 0 18px;font-size:16px;line-height:1.75;color:#334155;">
                Utilize as mesmas credenciais de acesso de sempre. Se precisar de apoio, nossa equipe está à disposição.
              </p>

              <table role="presentation" cellspacing="0" cellpadding="0" style="margin:8px 0 0;">
                <tr>
                  <td style="border-radius:10px;background:linear-gradient(135deg,#2563eb 0%,#7c3aed 100%);">
                    <a href="${portalUrl}" style="display:inline-block;padding:14px 28px;color:#ffffff;text-decoration:none;font-size:16px;font-weight:700;">Acessar LicitaPregão</a>
                  </td>
                </tr>
              </table>
              <p style="margin:10px 0 0;font-size:13px;color:#64748b;word-break:break-all;">${portalUrl}</p>
            </td>
          </tr>

          <tr>
            <td style="padding:8px 38px 28px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;">
                <tr>
                  <td style="padding:18px 20px;">
                    <p style="margin:0;font-size:14px;line-height:1.7;color:#166534;">
                      <strong>Lembrete:</strong> seu teste gratuito permanece ativo até <strong>${trialEnds}</strong>.
                      Aproveite este período extra para avaliar a plataforma com sua equipe.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding:24px 38px 34px;background:#f8fafc;border-top:1px solid #e2e8f0;">
              <p style="margin:0 0 8px;font-size:15px;line-height:1.6;color:#475569;">
                Obrigado por acompanhar a evolução da LicitaPregão. Desejamos excelentes resultados em suas licitações.
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
