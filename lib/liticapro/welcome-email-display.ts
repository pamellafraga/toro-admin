import { format } from "date-fns"
import { ptBR } from "date-fns/locale"

export type LiticaProMetaLike = {
  welcome_email_sent_at?: string | null
  welcome_email_channel?: string | null
  saas_provisioned_at?: string | null
  saas_empresa_id?: string | null
} | null | undefined

export type LiticaProWelcomeEmailInfo = {
  sent: boolean
  sentAtLabel: string | null
  channelLabel: string | null
  provisioned: boolean
  provisionedAtLabel: string | null
}

function formatMetaDate(value: string | null | undefined): string | null {
  if (!value?.trim()) return null
  try {
    return format(new Date(value), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
  } catch {
    return null
  }
}

function channelLabel(channel: string | null | undefined): string | null {
  if (!channel) return null
  if (channel === "resend") return "Resend"
  if (channel === "smtp") return "SMTP"
  if (channel === "dev") return "Desenvolvimento"
  return channel
}

export function getLiticaProWelcomeEmailInfo(meta: LiticaProMetaLike): LiticaProWelcomeEmailInfo {
  const sentAt = meta?.welcome_email_sent_at ?? null
  const provisionedAt = meta?.saas_provisioned_at ?? null
  const provisioned = Boolean(provisionedAt || meta?.saas_empresa_id)

  return {
    sent: Boolean(sentAt),
    sentAtLabel: formatMetaDate(sentAt),
    channelLabel: channelLabel(meta?.welcome_email_channel),
    provisioned,
    provisionedAtLabel: formatMetaDate(provisionedAt),
  }
}
