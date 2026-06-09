"use client"

import { Loader2, Mail, MailX, RefreshCw } from "lucide-react"
import { cn } from "@/lib/utils"
import type { LiticaProWelcomeEmailInfo } from "@/lib/liticapro/welcome-email-display"

export function LiticaProWelcomeEmailBadge({
  info,
  compact = false,
  className,
  onResend,
  resending = false,
  showResendButton = false,
}: {
  info: LiticaProWelcomeEmailInfo
  compact?: boolean
  className?: string
  onResend?: () => void
  resending?: boolean
  showResendButton?: boolean
}) {
  const canResend = showResendButton && info.provisioned && Boolean(onResend)

  const resendButton = canResend ? (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        onResend?.()
      }}
      disabled={resending}
      className={cn(
        "inline-flex items-center gap-1 rounded-md border border-primary/40 bg-primary/5 px-2 py-0.5 font-medium text-primary transition-colors hover:bg-primary/10 disabled:opacity-50",
        compact ? "text-[10px]" : "text-[11px]",
      )}
      title="Reenviar e-mail de acesso com credenciais da ferramenta"
    >
      {resending ? (
        <Loader2 className={cn("animate-spin", compact ? "h-3 w-3" : "h-3.5 w-3.5")} />
      ) : (
        <RefreshCw className={cn(compact ? "h-3 w-3" : "h-3.5 w-3.5")} />
      )}
      Reenviar e-mail
    </button>
  ) : null

  if (info.sent && info.sentAtLabel) {
    return (
      <div className={cn("flex flex-wrap items-center gap-2", className)}>
        <p
          className={cn(
            "flex items-start gap-1 text-emerald-600 dark:text-emerald-400",
            compact ? "text-[11px]" : "text-xs",
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
        {resendButton}
      </div>
    )
  }

  if (info.provisioned) {
    return (
      <div className={cn("flex flex-wrap items-center gap-2", className)}>
        <p
          className={cn(
            "flex items-start gap-1 text-amber-600 dark:text-amber-400",
            compact ? "text-[11px]" : "text-xs",
          )}
          title="Conta criada na ferramenta, mas o e-mail de acesso ainda não foi registrado como enviado"
        >
          <MailX className={cn("shrink-0", compact ? "h-3 w-3 mt-0.5" : "h-3.5 w-3.5 mt-0.5")} />
          <span>E-mail de acesso pendente</span>
        </p>
        {resendButton}
      </div>
    )
  }

  return null
}
