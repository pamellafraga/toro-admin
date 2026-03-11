"use client"

import { createClient } from "@/lib/supabase/client"
import { Activity, User, Clock } from "lucide-react"
import useSWR from "swr"
import type { ActivityLog } from "@/lib/types"
import { format, formatDistanceToNow } from "date-fns"
import { ptBR } from "date-fns/locale"

export default function AtividadesPage() {
  const supabase = createClient()

  const { data: activities } = useSWR("all-activities", async () => {
    const { data } = await supabase
      .from("activity_log")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50)
    return (data || []) as ActivityLog[]
  })

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Historico de Atividades</h2>
        <p className="text-sm text-muted-foreground mt-1">Registro de acoes realizadas no sistema</p>
      </div>

      <div className="glass rounded-xl p-6">
        {activities && activities.length > 0 ? (
          <div className="relative">
            <div className="absolute left-5 top-0 bottom-0 w-px bg-border" />
            <div className="flex flex-col gap-6">
              {activities.map((act) => (
                <div key={act.id} className="relative flex gap-4 pl-12">
                  <div className="absolute left-3 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary/20 ring-4 ring-background">
                    <Activity className="h-3 w-3 text-primary" />
                  </div>
                  <div className="flex-1 rounded-lg bg-secondary/30 p-4">
                    <p className="text-sm font-medium text-foreground">{act.action}</p>
                    {act.details && <p className="text-xs text-muted-foreground mt-1">{act.details}</p>}
                    <div className="flex items-center gap-4 mt-2">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <User className="h-3 w-3" />
                        {act.user_name || "Sistema"}
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {format(new Date(act.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                        {" - "}
                        {formatDistanceToNow(new Date(act.created_at), { addSuffix: true, locale: ptBR })}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20">
            <Activity className="h-12 w-12 text-muted-foreground/20 mb-3" />
            <p className="text-muted-foreground">Nenhuma atividade registrada</p>
          </div>
        )}
      </div>
    </div>
  )
}
