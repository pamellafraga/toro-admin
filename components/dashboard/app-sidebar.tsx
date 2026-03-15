"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { createClient } from "@/lib/supabase/client"
import { useChatUnreadCount } from "@/hooks/use-chat-unread"
import { cn } from "@/lib/utils"
import {
  Home,
  Package,
  Users,
  MessageCircle,
  FileText,
  Bell,
  Activity,
  Settings,
  LogOut,
  DollarSign,
  CreditCard,
  Key,
  FileText as InvoiceIcon,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
} from "lucide-react"
import type { Permission } from "@/lib/types"

const navItems: { label: string; href: string; icon: typeof Home; permission: Permission }[] = [
  { label: "Home", href: "/dashboard", icon: Home, permission: "home" },
  { label: "Produtos", href: "/dashboard/produtos", icon: Package, permission: "produtos" },
  { label: "Clientes", href: "/dashboard/clientes", icon: Users, permission: "clientes" },
  { label: "Financeiro", href: "/dashboard/financeiro", icon: DollarSign, permission: "financeiro" },
  { label: "NF-e", href: "/dashboard/nfe", icon: InvoiceIcon, permission: "financeiro" },
  { label: "Chat Interno", href: "/dashboard/chat", icon: MessageCircle, permission: "chat" },
  { label: "Relatórios", href: "/dashboard/relatorios", icon: FileText, permission: "relatorios" },
  { label: "Notificações", href: "/dashboard/notificacoes", icon: Bell, permission: "notificacoes" },
  { label: "Atividades", href: "/dashboard/atividades", icon: Activity, permission: "atividades" },
  { label: "Gastos da Empresa", href: "/dashboard/gastos-empresa", icon: CreditCard, permission: "admin" },
]

type AppSidebarProps = { collapsed?: boolean; onToggleCollapse?: () => void }

export function AppSidebar({ collapsed = false, onToggleCollapse }: AppSidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { profile, hasPermission, isAdmin } = useAuth()
  const supabase = createClient()
  const chatUnreadCount = useChatUnreadCount()
  const [notificationUnread, setNotificationUnread] = useState(0)

  useEffect(() => {
    const fetchUnread = async () => {
      if (!profile?.id) return
      const { count } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", profile.id)
        .eq("is_read", false)
      setNotificationUnread(count ?? 0)
    }
    fetchUnread()
    const interval = setInterval(fetchUnread, 30000)
    return () => clearInterval(interval)
  }, [profile?.id, supabase])

  const handleLogout = async () => {
    localStorage.removeItem("xpress_auth")
    localStorage.removeItem("xpress_remember")
    try {
      await fetch("/api/logout", { method: "POST" })
    } catch {}
    try {
      await supabase.auth.signOut()
    } catch {}
    router.push("/login")
    router.refresh()
  }

  const filteredNav = navItems.filter((item) => hasPermission(item.permission))
  const [configOpen, setConfigOpen] = useState(pathname.startsWith("/dashboard/usuarios") || pathname.startsWith("/dashboard/senhas"))

  return (
    <aside
      className={cn(
        "fixed left-6 top-10 bottom-10 z-40 flex flex-col border border-sidebar-border bg-sidebar shadow-sm transition-[width] duration-200 ease-out rounded-2xl",
        collapsed ? "w-16" : "w-56"
      )}
    >
      {/* Navigation (logo/nome da empresa ficam no topo do dashboard) */}
      <nav className="flex-1 overflow-y-auto px-2 pt-4 pb-2">
        <ul className="flex flex-col gap-1">
          {filteredNav.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/dashboard" && pathname.startsWith(item.href))
            const isChat = item.href === "/dashboard/chat"
            const showUnread = isChat && chatUnreadCount > 0
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  title={collapsed ? item.label : undefined}
                  className={cn(
                    "group/nav flex items-center rounded-lg text-sm font-medium transition-all duration-200",
                    collapsed ? "justify-center p-2.5" : "gap-3 px-3 py-2.5",
                    isActive
                      ? "bg-sidebar-primary/30 text-sidebar-primary-foreground"
                      : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground hover:translate-x-0.5"
                  )}
                >
                  <span className="relative inline-flex shrink-0">
                    <item.icon className={cn("h-4 w-4 transition-transform duration-200 group-hover/nav:scale-110", isActive ? "text-sidebar-primary-foreground" : "text-sidebar-foreground")} />
                    {showUnread && (
                      <span className="absolute -top-1.5 -right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground ring-2 ring-sidebar">
                        {chatUnreadCount > 99 ? "99+" : chatUnreadCount}
                      </span>
                    )}
                  </span>
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </Link>
              </li>
            )
          })}

          {isAdmin && (
            <>
              {collapsed ? (
                <>
                  <li>
                    <Link
                      href="/dashboard/usuarios"
                      title="Configurações – Usuários"
                      className={cn(
                        "group/nav flex items-center justify-center rounded-lg p-2.5 text-sm font-medium transition-all duration-200",
                        pathname.startsWith("/dashboard/usuarios")
                          ? "bg-sidebar-primary/30 text-sidebar-primary-foreground"
                          : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground"
                      )}
                    >
                      <Users className="h-4 w-4" />
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/dashboard/senhas"
                      title="Configurações – Sistemas"
                      className={cn(
                        "group/nav flex items-center justify-center rounded-lg p-2.5 text-sm font-medium transition-all duration-200",
                        pathname.startsWith("/dashboard/senhas")
                          ? "bg-sidebar-primary/30 text-sidebar-primary-foreground"
                          : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground"
                      )}
                    >
                      <Key className="h-4 w-4" />
                    </Link>
                  </li>
                </>
              ) : (
                <>
                  <li>
                    <button
                      type="button"
                      onClick={() => setConfigOpen((o) => !o)}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                        "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground"
                      )}
                    >
                      <Settings className="h-4 w-4 shrink-0" />
                      <span className="truncate flex-1 text-left">Configurações</span>
                      <ChevronDown className={cn("h-4 w-4 shrink-0 transition-transform", configOpen && "rotate-180")} />
                    </button>
                  </li>
                  {configOpen && (
                    <>
                      <li className="pl-6">
                        <Link
                          href="/dashboard/usuarios"
                          title="Usuários"
                          className={cn(
                            "group/nav flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200",
                            pathname.startsWith("/dashboard/usuarios")
                              ? "bg-sidebar-primary/30 text-sidebar-primary-foreground"
                              : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground hover:translate-x-0.5"
                          )}
                        >
                          <Users className="h-4 w-4 shrink-0" />
                          <span className="truncate">Usuários</span>
                        </Link>
                      </li>
                      <li className="pl-6">
                        <Link
                          href="/dashboard/senhas"
                          title="Sistemas (login, senha, link das ferramentas)"
                          className={cn(
                            "group/nav flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200",
                            pathname.startsWith("/dashboard/senhas")
                              ? "bg-sidebar-primary/30 text-sidebar-primary-foreground"
                              : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground hover:translate-x-0.5"
                          )}
                        >
                          <Key className="h-4 w-4 shrink-0" />
                          <span className="truncate">Sistemas</span>
                        </Link>
                      </li>
                    </>
                  )}
                </>
              )}
            </>
          )}
        </ul>
      </nav>

      {/* Sair em cima, Notificações embaixo; depois usuário logado */}
      <div className="border-t border-sidebar-border p-3 space-y-2">
        <div className="flex flex-col gap-1">
          <button
            onClick={handleLogout}
            title={collapsed ? "Sair" : undefined}
            className={cn(
              "group/logout flex w-full items-center text-sm font-medium text-sidebar-foreground hover:bg-destructive/10 hover:text-destructive transition-all duration-200 rounded-lg",
              collapsed ? "justify-center p-2.5" : "gap-3 px-3 py-2.5"
            )}
          >
            <LogOut className="h-4 w-4 shrink-0 transition-transform duration-200 group-hover/logout:scale-110 group-hover/logout:-translate-x-0.5" />
            {!collapsed && <span>Sair</span>}
          </button>
          <Link
            href="/dashboard/notificacoes"
            title={collapsed ? "Notificações" : undefined}
            className={cn(
              "group/bell relative flex w-full items-center rounded-lg text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-primary transition-all duration-200",
              collapsed ? "justify-center p-2.5" : "gap-2 px-3 py-2.5"
            )}
          >
            <Bell className="h-4 w-4 shrink-0 transition-transform duration-200 group-hover/bell:scale-110" />
            {!collapsed && <span>Notificações</span>}
            {notificationUnread > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground ring-2 ring-sidebar">
                {notificationUnread > 9 ? "9+" : notificationUnread}
              </span>
            )}
          </Link>
        </div>
        {/* Usuário logado: nome + perfil (para todos os usuários) */}
        <div
          className={cn(
            "flex items-center rounded-lg border border-sidebar-border/50 bg-sidebar-accent/50 p-2",
            collapsed ? "justify-center" : "gap-3"
          )}
          title={collapsed ? `${profile?.name ?? ""} · ${profile?.role ?? ""}` : undefined}
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sidebar-primary/40 text-sidebar-primary-foreground font-semibold text-sm">
            {profile?.name?.charAt(0)?.toUpperCase() || "U"}
          </div>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-sidebar-foreground truncate">{profile?.name}</p>
              <p className="text-xs text-sidebar-foreground/80 capitalize truncate">{profile?.role}</p>
            </div>
          )}
        </div>
      </div>

      {/* Botão minimizar / expandir */}
      {onToggleCollapse && (
        <button
          type="button"
          onClick={onToggleCollapse}
          title={collapsed ? "Expandir menu" : "Recolher menu"}
          className="absolute -right-3 top-1/2 z-50 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full border border-sidebar-border bg-sidebar shadow-md text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors"
        >
          {collapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
        </button>
      )}
    </aside>
  )
}
