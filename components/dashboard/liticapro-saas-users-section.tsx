"use client"

import { Users } from "lucide-react"
import { formatCpfCnpj } from "@/lib/format/br"
import type { LiticaProSaaSUser } from "@/lib/liticapro/types"
import { cn } from "@/lib/utils"

function formatBirthDate(value: string): string {
  const trimmed = value.trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const [year, month, day] = trimmed.split("-")
    return `${day}/${month}/${year}`
  }
  return trimmed || "—"
}

export function LiticaProSaasUsersSection({
  users,
  showCredentials = false,
}: {
  users: LiticaProSaaSUser[]
  showCredentials?: boolean
}) {
  if (!users.length) return null

  return (
    <div className="rounded-xl border border-border bg-muted/10 p-4">
      <div className="flex items-center gap-2 mb-3 pb-2 border-b border-primary/20">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          <Users className="h-3.5 w-3.5 text-primary" />
        </div>
        <h4 className="text-xs font-semibold text-primary uppercase tracking-wide">
          Usuários da empresa ({users.length})
        </h4>
      </div>

      <div className="space-y-3">
        {users.map((user, index) => (
          <div
            key={`${user.email}-${user.cpf}-${index}`}
            className="rounded-lg border border-border bg-background/60 p-3"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-semibold text-foreground">{user.full_name || "—"}</p>
                {user.is_owner ? (
                  <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold text-primary uppercase">
                    Admin
                  </span>
                ) : null}
              </div>
              {user.welcome_email_sent_at ? (
                <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                  E-mail enviado
                </span>
              ) : null}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 text-sm">
              <div>
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1">
                  CPF
                </p>
                <p className="font-mono text-[13px]">{formatCpfCnpj(user.cpf) || "—"}</p>
              </div>
              <div>
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1">
                  Data de nascimento
                </p>
                <p>{formatBirthDate(user.birth_date)}</p>
              </div>
              <div>
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1">
                  E-mail
                </p>
                <p className="break-all">{user.email || "—"}</p>
              </div>
              {user.saas_usuario_id ? (
                <div>
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1">
                    ID SaaS
                  </p>
                  <p className="font-mono text-[11px] text-muted-foreground break-all">
                    {user.saas_usuario_id}
                  </p>
                </div>
              ) : null}
            </div>

            {showCredentials && user.credentials ? (
              <div
                className={cn(
                  "mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3 rounded-lg bg-zinc-950 border border-zinc-800 px-3 py-2",
                )}
              >
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-zinc-400 mb-1 font-light">
                    Empresa (login)
                  </p>
                  <p className="text-sm text-white/90 break-words font-light">
                    {user.credentials.empresa || "—"}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-zinc-400 mb-1 font-light">
                    Usuário
                  </p>
                  <p className="text-sm text-white/90 break-words font-light">
                    {user.credentials.usuario || "—"}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-zinc-400 mb-1 font-light">
                    Senha
                  </p>
                  <p className="text-sm text-white/90 break-words font-mono font-light">
                    {user.credentials.senha || "—"}
                  </p>
                </div>
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  )
}
