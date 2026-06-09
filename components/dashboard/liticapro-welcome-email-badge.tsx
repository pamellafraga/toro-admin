"use client"

import { Mail, MailX } from "lucide-react"
import { cn } from "@/lib/utils"
import type { LiticaProWelcomeEmailInfo } from "@/lib/liticapro/welcome-email-display"

export function LiticaProWelcomeEmailBadge({
  info,
  compact = false,
  className,
}: {
  info: LiticaProWelcomeEmailInfo
  compact?: boolean
  className?: string
}) {
  if (info.sent && info.sentAtLabel) {
    return (
      <p
        className={cn(
          "flex items-start gap-1 text-emerald-600 dark:text-emerald-400",
          compact ? "text-[11px]" : "text-xs",
          className,
        )}
        title={
          info.channelLabel
            ? `E-mail de acesso enviado via ${info.channelLabel}`
            : "E-mail de acesso enviado"
        }
      >
        <Mail className={cn("shrink-0", compact ? "h-3 w-3 mt-0.5" : "h-3.5 w-3.5 mt-0.5")} />
        <span>
          E-mail de acesso enviado em <strong>{info.sentAtLabel}</strong>
        </span>
      </p>
    )
  }

  if (info.provisioned) {
    return (
      <p
        className={cn(
          "flex items-start gap-1 text-amber-600 dark:text-amber-400",
          compact ? "text-[11px]" : "text-xs",
          className,
        )}
        title="Conta criada na ferramenta, mas o e-mail de acesso ainda não foi registrado como enviado"
      >
        <MailX className={cn("shrink-0", compact ? "h-3 w-3 mt-0.5" : "h-3.5 w-3.5 mt-0.5")} />
        <span>E-mail de acesso pendente</span>
      </p>
    )
  }

  return null
}
