"use client"

import { Activity } from "lucide-react"
import useSWR from "swr"
import { formatDistanceToNow } from "date-fns"
import { ptBR } from "date-fns/locale"
import { fetchDashboardOverview } from "@/lib/dashboard/fetch-overview"

export function RecentActivity() {
  const { data } = useSWR("dashboard-overview", fetchDashboardOverview)
  const activities = data?.recentActivities ?? []

  return (
    <div className="glass rounded-xl p-6 h-full min-h-[280px] flex flex-col">
      <h3 className="mb-4 text-lg font-semibold text-foreground shrink-0">Atividades Recentes</h3>
      {activities.length > 0 ? (
        <div className="flex flex-col gap-3 flex-1 min-h-0">
          {activities.map((act) => (
            <div key={act.id} className="flex items-start gap-3 rounded-lg bg-secondary/30 p-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <Activity className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground truncate">{act.action}</p>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  <span className="text-xs text-muted-foreground">{act.user_name || "Sistema"}</span>
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(act.created_at), { addSuffix: true, locale: ptBR })}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-10 text-center flex-1">
          <Activity className="h-10 w-10 text-muted-foreground/30 mb-2" />
          <p className="text-sm text-muted-foreground">Nenhuma atividade recente</p>
        </div>
      )}
    </div>
  )
}
