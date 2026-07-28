"use client"

import { useState } from "react"
import useSWR from "swr"
import { useRouter } from "next/navigation"
import { formatDistanceToNow } from "date-fns"
import { ptBR } from "date-fns/locale"
import { Headphones, Loader2, Mail, User, Wrench } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import type { InternalSupportTicket, SupportTicketStatus } from "@/lib/types"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { FormSelect } from "@/components/ui/form-select"

const STATUS_OPTIONS: { value: SupportTicketStatus | ""; label: string }[] = [
  { value: "", label: "Todos" },
  { value: "aberto", label: "Aberto" },
  { value: "em_andamento", label: "Em andamento" },
  { value: "resolvido", label: "Resolvido" },
  { value: "fechado", label: "Fechado" },
]

const STATUS_STYLE: Record<SupportTicketStatus, string> = {
  aberto: "bg-[#F3F0E9] text-[#101010] border-[#E3DBCC]",
  em_andamento: "bg-[#E3DBCC]/40 text-[#101010] border-[#E3DBCC]",
  resolvido: "bg-[#101010]/10 text-[#101010] border-[#E3DBCC]",
  fechado: "bg-muted text-muted-foreground border-border",
}

const PRIORITY_LABEL: Record<string, string> = {
  baixa: "Baixa",
  normal: "Normal",
  alta: "Alta",
  urgente: "Urgente",
}

async function fetchChamados(url: string): Promise<InternalSupportTicket[]> {
  const res = await fetch(url, { credentials: "include" })
  if (!res.ok) {
    const j = await res.json().catch(() => ({}))
    throw new Error((j as { error?: string }).error || "Erro ao carregar chamados")
  }
  return res.json()
}

export default function ChamadosPage() {
  const { hasPermission, loading: authLoading, profile } = useAuth()
  const router = useRouter()
  const [filter, setFilter] = useState<SupportTicketStatus | "">("")
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  const canView = !authLoading && !!profile && hasPermission("chamados")
  const qs = filter ? `?status=${encodeURIComponent(filter)}` : ""
  const { data, error, isLoading, mutate } = useSWR(canView ? `/api/chamados${qs}` : null, fetchChamados)

  if (!authLoading && profile && !hasPermission("chamados")) {
    router.replace("/dashboard")
    return null
  }

  if (authLoading) {
    return (
      <div className="flex items-center justify-center gap-2 py-24 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" />
        Carregando…
      </div>
    )
  }

  if (!profile) return null

  const onStatusChange = async (id: string, status: SupportTicketStatus) => {
    setUpdatingId(id)
    try {
      const res = await fetch(`/api/chamados/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error((j as { error?: string }).error || "Falha ao atualizar")
      }
      await mutate()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível atualizar o status.")
    } finally {
      setUpdatingId(null)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">SAC — Atendimento ao Cliente</h2>
        <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
          Solicitações de clientes da loja Toro. Use o token{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 text-xs">CHAMADOS_INGEST_TOKEN</code> nas integrações
          para abrir tickets automaticamente.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <label className="text-sm text-muted-foreground">Filtrar por status</label>
        <FormSelect
          value={filter || "all"}
          onValueChange={(value) => setFilter(value === "all" ? "" : (value as SupportTicketStatus))}
          triggerClassName="h-9"
          options={STATUS_OPTIONS.map((o) => ({
            value: o.value || "all",
            label: o.label,
          }))}
        />
      </div>

      <div className="glass rounded-xl border border-border/60 p-6">
        {isLoading && (
          <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            Carregando…
          </div>
        )}
        {error && (
          <p className="text-center text-sm text-destructive py-12">{error.message}</p>
        )}
        {!isLoading && !error && data && data.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Headphones className="h-14 w-14 text-muted-foreground/25 mb-4" />
            <p className="text-foreground font-medium">Nenhum chamado ainda</p>
            <p className="text-sm text-muted-foreground mt-2 max-w-md">
              Quando os usuários das ferramentas enviarem suporte pelo chat interno, cada solicitação será listada aqui
              para acompanhamento e mudança de status.
            </p>
          </div>
        )}
        {!isLoading && !error && data && data.length > 0 && (
          <ul className="flex flex-col gap-4">
            {data.map((t) => (
              <li
                key={t.id}
                className="rounded-xl border border-border/80 bg-card/40 p-4 shadow-sm transition-colors hover:bg-card/60"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
                          STATUS_STYLE[t.status]
                        )}
                      >
                        {STATUS_OPTIONS.find((o) => o.value === t.status)?.label ?? t.status}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        Prioridade: {PRIORITY_LABEL[t.priority] ?? t.priority}
                      </span>
                      {t.source_tool && (
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                          <Wrench className="h-3 w-3" />
                          {t.source_tool}
                        </span>
                      )}
                    </div>
                    <h3 className="font-semibold text-foreground leading-snug">{t.subject}</h3>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{t.message}</p>
                    <div className="flex flex-wrap gap-4 text-xs text-muted-foreground pt-1">
                      {(t.client_identifier || t.client_email) && (
                        <span className="inline-flex items-center gap-1.5">
                          <User className="h-3.5 w-3.5 shrink-0" />
                          {t.client_identifier || "—"}
                          {t.client_email && (
                            <span className="inline-flex items-center gap-1 ml-1">
                              <Mail className="h-3 w-3" />
                              {t.client_email}
                            </span>
                          )}
                        </span>
                      )}
                      <span title={t.created_at}>
                        {formatDistanceToNow(new Date(t.created_at), { addSuffix: true, locale: ptBR })}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {updatingId === t.id ? (
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    ) : (
                      <FormSelect
                        aria-label="Alterar status do chamado"
                        value={t.status}
                        onValueChange={(value) => onStatusChange(t.id, value as SupportTicketStatus)}
                        triggerClassName="h-9 min-w-[9.5rem] px-2"
                        options={STATUS_OPTIONS.filter((o) => o.value !== "").map((o) => ({
                          value: o.value,
                          label: o.label,
                        }))}
                      />
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
