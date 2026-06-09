import type { LiticaProDeveloperCredentials } from "@/lib/liticapro/types"

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

export function buildLiticaProWelcomeEmailHtml(params: {
  clientName: string
  credentials: LiticaProDeveloperCredentials
  portalUrl: string
  customerType: "empresa" | "profissional_liberal"
  statesOfInterest?: string[]
}): string {
  const { clientName, credentials, portalUrl, customerType, statesOfInterest = [] } = params
  const isEmpresa = customerType === "empresa"
  const accessLabel = isEmpresa ? "EMPRESA" : "PROFISSIONAL LIBERAL"
  const identificadorLabel = isEmpresa ? "Empresa" : "CPF"
  const estados =
    statesOfInterest.length > 0
      ? statesOfInterest.join(", ")
      : "conforme configurado no seu cadastro"

  const empresa = escapeHtml(credentials.empresa)
  const usuario = escapeHtml(credentials.usuario)
  const senha = escapeHtml(credentials.senha)
  const nome = escapeHtml(clientName)
  const url = escapeHtml(portalUrl)

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Seu acesso à LicitaPro está liberado</title>
</head>
<body style="margin:0;padding:0;background:#eef2f7;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1e293b;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#eef2f7;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;background:#ffffff;border-radius:18px;overflow:hidden;box-shadow:0 18px 48px rgba(15,23,42,0.12);">
          <tr>
            <td style="background:linear-gradient(135deg,#0f172a 0%,#1d4ed8 55%,#0ea5e9 100%);padding:32px 36px;color:#ffffff;">
              <p style="margin:0 0 8px;font-size:13px;letter-spacing:0.12em;text-transform:uppercase;opacity:0.85;">Xpress Solutions</p>
              <h1 style="margin:0;font-size:28px;line-height:1.25;font-weight:700;">🚀 Seu acesso já está liberado!</h1>
              <p style="margin:14px 0 0;font-size:15px;line-height:1.6;opacity:0.92;">Olá, <strong>${nome}</strong>. A plataforma <strong>LicitaPro</strong> foi configurada com sucesso.</p>
            </td>
          </tr>

          <tr>
            <td style="padding:34px 36px 10px;">
              <p style="margin:0 0 18px;font-size:16px;line-height:1.7;color:#334155;">
                A plataforma LicitaPro foi configurada com sucesso e já está pronta para monitorar oportunidades de licitação em tempo real.
              </p>
              <p style="margin:0 0 18px;font-size:16px;line-height:1.7;color:#334155;">
                Acesse o portal como <strong>${accessLabel}</strong> com os seguintes dados:
              </p>

              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f8fafc;border:1px solid #dbeafe;border-radius:14px;">
                <tr>
                  <td style="padding:22px 24px;">
                    <p style="margin:0 0 12px;font-size:15px;line-height:1.6;"><span style="font-size:18px;">💼</span> <strong>${identificadorLabel}:</strong> ${empresa}</p>
                    <p style="margin:0 0 12px;font-size:15px;line-height:1.6;"><span style="font-size:18px;">🔑</span> <strong>Usuário:</strong> ${usuario}</p>
                    <p style="margin:0 0 12px;font-size:15px;line-height:1.6;"><span style="font-size:18px;">🔒</span> <strong>Senha:</strong> <span style="font-family:Consolas,'Courier New',monospace;background:#e2e8f0;padding:2px 8px;border-radius:6px;">${senha}</span></p>
                    <p style="margin:0;font-size:14px;line-height:1.6;color:#64748b;"><strong>Estados monitorados:</strong> ${escapeHtml(estados)}</p>
                  </td>
                </tr>
              </table>

              <table role="presentation" cellspacing="0" cellpadding="0" style="margin:28px 0 8px;">
                <tr>
                  <td style="border-radius:10px;background:#0ea5e9;">
                    <a href="${url}" style="display:inline-block;padding:14px 28px;color:#ffffff;text-decoration:none;font-size:16px;font-weight:700;">🌐 Acessar LicitaPro</a>
                  </td>
                </tr>
              </table>
              <p style="margin:8px 0 0;font-size:14px;color:#64748b;word-break:break-all;">${url}</p>
            </td>
          </tr>

          <tr>
            <td style="padding:8px 36px 24px;">
              <p style="margin:0 0 16px;font-size:16px;line-height:1.7;color:#334155;">
                Agora você já pode acompanhar editais, receber alertas automáticos, monitorar oportunidades do seu segmento e receber atualizações em tempo real diretamente pela plataforma.
              </p>

              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#fff7ed;border:1px solid #fed7aa;border-radius:12px;">
                <tr>
                  <td style="padding:18px 20px;">
                    <p style="margin:0;font-size:14px;line-height:1.7;color:#9a3412;">
                      <strong>⏳ Importante:</strong> na primeira configuração, a plataforma pode levar até <strong>12 horas</strong> para localizar e indexar todos os editais de acordo com os filtros definidos. Durante esse período, novos resultados continuarão sendo encontrados e adicionados automaticamente.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding:0 36px 30px;">
              <p style="margin:0 0 16px;font-size:16px;line-height:1.7;color:#334155;">
                ⭐ Como este é o início da sua operação na LicitaPro, gostaríamos de contar com seu feedback. Explore a plataforma e, caso sinta falta de alguma funcionalidade, filtro, alerta ou recurso que possa agregar valor ao seu processo de licitações, nos informe por aqui mesmo.
              </p>
              <p style="margin:0 0 16px;font-size:16px;line-height:1.7;color:#334155;">
                Somos uma empresa de tecnologia e acreditamos que uma ferramenta de alto desempenho está em constante evolução. Por isso, analisamos e implementamos melhorias com base nas necessidades reais dos nossos clientes, muitas vezes sem qualquer custo adicional.
              </p>
              <p style="margin:0;font-size:16px;line-height:1.7;color:#334155;">
                Seu retorno é extremamente importante para continuarmos aperfeiçoando a plataforma e entregando a melhor experiência possível.
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding:24px 36px 34px;background:#f8fafc;border-top:1px solid #e2e8f0;">
              <p style="margin:0 0 8px;font-size:15px;line-height:1.6;color:#475569;">
                Estamos à disposição para qualquer suporte, dúvida ou sugestão.
              </p>
              <p style="margin:0;font-size:15px;font-weight:700;color:#0f172a;">Equipe Xpress Solutions</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}
