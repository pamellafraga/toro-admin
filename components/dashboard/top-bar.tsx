"use client"

import { useAuth } from "@/lib/auth-context"
import { usePathname } from "next/navigation"
import { Bell, Menu } from "lucide-react"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import Link from "next/link"

const PAGE_TITLES: Record<string, string> = {
  "/dashboard": "Home",
  "/dashboard/produtos": "Produtos",
  "/dashboard/clientes": "Clientes",
  "/dashboard/seguradoras": "Marketing",
  "/dashboard/chat": "Chat Interno",
  "/dashboard/financeiro": "Financeiro",
  "/dashboard/relatorios": "Relatórios",
  "/dashboard/notificacoes": "Notificações",
  "/dashboard/atividades": "Atividades",
  "/dashboard/usuarios": "Gerenciamento de Usuários",
  "/dashboard/gastos-empresa": "Gastos da Empresa",
  "/dashboard/senhas": "Senhas",
}

export function TopBar({ onToggleSidebar }: { onToggleSidebar?: () => void }) {
  const { profile } = useAuth()
  const pathname = usePathname()
  const [unreadCount, setUnreadCount] = useState(0)
  const supabase = createClient()

  const title = Object.entries(PAGE_TITLES).find(
    ([path]) => pathname === path || (path !== "/dashboard" && pathname.startsWith(path))
  )?.[1] || "Dashboard"

  useEffect(() => {
    const fetchUnread = async () => {
      if (!profile) return
      const { count } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", profile.id)
        .eq("is_read", false)
      setUnreadCount(count || 0)
    }
    fetchUnread()
    const interval = setInterval(fetchUnread, 30000)
    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile])

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-background/80 backdrop-blur-xl px-6">
      <div className="flex items-center gap-4">
        <button
          onClick={onToggleSidebar}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors lg:hidden"
          aria-label="Menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-semibold text-foreground">{title}</h1>
      </div>

      <div className="flex items-center gap-4">
        <Link
          href="/dashboard/notificacoes"
          className="group relative flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-primary transition-all duration-200 hover:shadow-[0_0_12px_rgba(14,165,233,0.15)]"
        >
          <Bell className="h-5 w-5 transition-transform duration-200 group-hover:scale-110 group-hover:rotate-12" />
          {unreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground pulse-glow">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Link>

        <div className="group flex items-center gap-3 cursor-default">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 text-primary font-semibold text-sm transition-all duration-200 group-hover:bg-primary/30 group-hover:scale-110 group-hover:shadow-[0_0_14px_rgba(14,165,233,0.3)]">
            {profile?.name?.charAt(0)?.toUpperCase() || "U"}
          </div>
          <div className="hidden md:block">
            <p className="text-sm font-medium text-foreground leading-tight">{profile?.name}</p>
            <p className="text-xs text-muted-foreground capitalize">{profile?.role}</p>
          </div>
        </div>
      </div>
    </header>
  )
}
