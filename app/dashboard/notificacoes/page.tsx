"use client"

import Link from "next/link"
import { useAuth } from "@/lib/auth-context"
import { Bell, Check, Info, AlertTriangle, AlertCircle, CheckCircle2, Trash2 } from "lucide-react"
import useSWR from "swr"
import type { Notification } from "@/lib/types"
import { cn } from "@/lib/utils"
import { formatDistanceToNow } from "date-fns"
import { ptBR } from "date-fns/locale"
import { toast } from "sonner"

const NOTIFICATIONS_API = "/api/notifications"

const TYPE_ICONS = { info: Info, warning: AlertTriangle, error: AlertCircle, success: CheckCircle2 }
const TYPE_COLORS = {
  info: "text-sky-400 bg-sky-500/10",
  warning: "text-amber-400 bg-amber-500/10",
  error: "text-red-400 bg-red-500/10",
  success: "text-emerald-400 bg-emerald-500/10",
}

type ApiNotification = Notification & { audience?: string }

async function fetchNotifications(): Promise<ApiNotification[]> {
  const res = await fetch(NOTIFICATIONS_API, { credentials: "include", cache: "no-store" })
  if (!res.ok) {
    const json = (await res.json().catch(() => ({}))) as { error?: string }
    throw new Error(json.error || "Erro ao carregar notificações")
  }
  return res.json() as Promise<ApiNotification[]>
}

export default function NotificacoesPage() {
  const { hasPermission } = useAuth()

  const { data: notifications, mutate } = useSWR(
    hasPermission("notificacoes") ? NOTIFICATIONS_API : null,
    fetchNotifications,
    { refreshInterval: 60_000 },
  )

  const markRead = async (id: string) => {
    await fetch(NOTIFICATIONS_API, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    })
    mutate()
  }

  const markAllRead = async () => {
    await fetch(NOTIFICATIONS_API, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ all: true }),
    })
    mutate()
    toast.success("Todas marcadas como lidas")
  }

  const deleteNotification = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta notificação?")) return
    await fetch(`${NOTIFICATIONS_API}?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
      credentials: "include",
    })
    mutate()
  }

  const unreadCount = notifications?.filter((n) => !n.is_read).length || 0

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Notificações</h2>
          <p className="mt-1 text-sm text-muted-foreground">{unreadCount} não lidas</p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            className="flex items-center gap-2 rounded-lg bg-primary/10 px-4 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/20"
          >
            <Check className="h-4 w-4" /> Marcar todas como lidas
          </button>
        )}
      </div>

      <div className="flex flex-col gap-3">
        {notifications && notifications.length > 0 ? (
          notifications.map((notif) => {
            const Icon = TYPE_ICONS[notif.type] ?? Info
            const content = (
              <div
                className={cn(
                  "glass flex items-start gap-4 rounded-xl p-4 transition-all",
                  !notif.is_read && "border-l-2 border-l-primary",
                )}
              >
                <div
                  className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
                    TYPE_COLORS[notif.type] ?? TYPE_COLORS.info,
                  )}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p
                      className={cn(
                        "text-sm font-medium",
                        notif.is_read ? "text-muted-foreground" : "text-foreground",
                      )}
                    >
                      {notif.title}
                    </p>
                    <span className="whitespace-nowrap text-[11px] text-muted-foreground">
                      {formatDistanceToNow(new Date(notif.created_at), {
                        addSuffix: true,
                        locale: ptBR,
                      })}
                    </span>
                  </div>
                  <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">{notif.message}</p>
                </div>
                <div className="flex items-center gap-1">
                  {!notif.is_read && (
                    <button
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        markRead(notif.id)
                      }}
                      className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
                      title="Marcar como lida"
                    >
                      <Check className="h-4 w-4" />
                    </button>
                  )}
                  <button
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      deleteNotification(notif.id)
                    }}
                    className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                    title="Excluir"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )

            if (notif.link) {
              return (
                <Link
                  key={notif.id}
                  href={notif.link}
                  onClick={() => {
                    if (!notif.is_read) markRead(notif.id)
                  }}
                  className="block"
                >
                  {content}
                </Link>
              )
            }

            return <div key={notif.id}>{content}</div>
          })
        ) : (
          <div className="flex flex-col items-center justify-center py-20">
            <Bell className="mb-3 h-12 w-12 text-muted-foreground/20" />
            <p className="text-muted-foreground">Nenhuma notificação</p>
          </div>
        )}
      </div>
    </div>
  )
}
