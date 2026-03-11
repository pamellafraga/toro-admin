"use client"

import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/lib/auth-context"
import { Bell, Check, Info, AlertTriangle, AlertCircle, CheckCircle2, Trash2 } from "lucide-react"
import useSWR from "swr"
import type { Notification } from "@/lib/types"
import { cn } from "@/lib/utils"
import { formatDistanceToNow } from "date-fns"
import { ptBR } from "date-fns/locale"
import { toast } from "sonner"

const TYPE_ICONS = { info: Info, warning: AlertTriangle, error: AlertCircle, success: CheckCircle2 }
const TYPE_COLORS = {
  info: "text-sky-400 bg-sky-500/10",
  warning: "text-amber-400 bg-amber-500/10",
  error: "text-red-400 bg-red-500/10",
  success: "text-emerald-400 bg-emerald-500/10",
}

export default function NotificacoesPage() {
  const supabase = createClient()
  const { profile } = useAuth()

  const { data: notifications, mutate } = useSWR(
    profile ? "notifications" : null,
    async () => {
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", profile!.id)
        .order("created_at", { ascending: false })
      return (data || []) as Notification[]
    }
  )

  const markRead = async (id: string) => {
    await supabase.from("notifications").update({ is_read: true }).eq("id", id)
    mutate()
  }

  const markAllRead = async () => {
    if (!profile) return
    await supabase.from("notifications").update({ is_read: true }).eq("user_id", profile.id).eq("is_read", false)
    mutate()
    toast.success("Todas marcadas como lidas")
  }

  const deleteNotification = async (id: string) => {
    await supabase.from("notifications").delete().eq("id", id)
    mutate()
  }

  const unreadCount = notifications?.filter(n => !n.is_read).length || 0

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Notificacoes</h2>
          <p className="text-sm text-muted-foreground mt-1">{unreadCount} nao lidas</p>
        </div>
        {unreadCount > 0 && (
          <button onClick={markAllRead} className="flex items-center gap-2 rounded-lg bg-primary/10 px-4 py-2 text-sm font-medium text-primary hover:bg-primary/20 transition-colors">
            <Check className="h-4 w-4" /> Marcar todas como lidas
          </button>
        )}
      </div>

      <div className="flex flex-col gap-3">
        {notifications && notifications.length > 0 ? (
          notifications.map((notif) => {
            const Icon = TYPE_ICONS[notif.type]
            return (
              <div key={notif.id} className={cn("glass rounded-xl p-4 flex items-start gap-4 transition-all", !notif.is_read && "border-l-2 border-l-primary")}>
                <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg", TYPE_COLORS[notif.type])}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className={cn("text-sm font-medium", notif.is_read ? "text-muted-foreground" : "text-foreground")}>{notif.title}</p>
                    <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                      {formatDistanceToNow(new Date(notif.created_at), { addSuffix: true, locale: ptBR })}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5 leading-relaxed">{notif.message}</p>
                </div>
                <div className="flex items-center gap-1">
                  {!notif.is_read && (
                    <button onClick={() => markRead(notif.id)} className="rounded-lg p-1.5 text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors" title="Marcar como lida">
                      <Check className="h-4 w-4" />
                    </button>
                  )}
                  <button onClick={() => deleteNotification(notif.id)} className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors" title="Excluir">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )
          })
        ) : (
          <div className="flex flex-col items-center justify-center py-20">
            <Bell className="h-12 w-12 text-muted-foreground/20 mb-3" />
            <p className="text-muted-foreground">Nenhuma notificacao</p>
          </div>
        )}
      </div>
    </div>
  )
}
