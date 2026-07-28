"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"
import {
  Home,
  Headphones,
  Package,
  Warehouse,
  Users,
  ShoppingBag,
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
  X,
} from "lucide-react"
import type { Permission } from "@/lib/types"

const navItems: { label: string; href: string; icon: typeof Home; permission: Permission }[] = [
  { label: "Home", href: "/dashboard", icon: Home, permission: "home" },
  { label: "SAC", href: "/dashboard/chamados", icon: Headphones, permission: "chamados" },
  { label: "Produtos", href: "/dashboard/produtos", icon: Package, permission: "produtos" },
  { label: "Estoque", href: "/dashboard/estoque", icon: Warehouse, permission: "estoque" },
  { label: "Pedidos", href: "/dashboard/pedidos", icon: ShoppingBag, permission: "financeiro" },
  { label: "Clientes", href: "/dashboard/clientes", icon: Users, permission: "clientes" },
  { label: "Financeiro", href: "/dashboard/financeiro", icon: DollarSign, permission: "financeiro" },
  { label: "NF-e", href: "/dashboard/nfe", icon: InvoiceIcon, permission: "financeiro" },
  { label: "Gastos da Empresa", href: "/dashboard/gastos-empresa", icon: CreditCard, permission: "admin" },
]

const configItems: { label: string; href: string; icon: typeof Users; permission: Permission }[] = [
  { label: "Usuários", href: "/dashboard/usuarios", icon: Users, permission: "usuarios" },
  { label: "Sistemas", href: "/dashboard/senhas", icon: Key, permission: "admin" },
  { label: "Relatórios", href: "/dashboard/relatorios", icon: FileText, permission: "relatorios" },
  { label: "Notificações", href: "/dashboard/notificacoes", icon: Bell, permission: "notificacoes" },
  { label: "Atividades", href: "/dashboard/atividades", icon: Activity, permission: "atividades" },
]

const CONFIG_PATHS = configItems.map((item) => item.href)

type AppSidebarProps = {
  collapsed?: boolean
  onToggleCollapse?: () => void
  /** Drawer de navegação no celular */
  mobile?: boolean
  onMobileClose?: () => void
}

export function AppSidebar({
  collapsed = false,
  onToggleCollapse,
  mobile = false,
  onMobileClose,
}: AppSidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { profile, hasPermission, isAdmin } = useAuth()
  const supabase = createClient()
  const [configOpen, setConfigOpen] = useState(CONFIG_PATHS.some((path) => pathname.startsWith(path)))
  const showLabels = mobile || !collapsed
  const closeMobile = () => onMobileClose?.()

  const filteredNav = navItems.filter((item) => hasPermission(item.permission))
  const filteredConfig = configItems.filter((item) => hasPermission(item.permission))

  const handleLogout = async () => {
    localStorage.removeItem("toro_auth")
    localStorage.removeItem("toro_remember")
    try {
      await fetch("/api/logout", { method: "POST" })
    } catch {}
    try {
      await supabase.auth.signOut()
    } catch {}
    router.push("/login")
    router.refresh()
  }

  const linkClass = (isActive: boolean, compact = false) =>
    cn(
      "group/nav flex items-center rounded-lg font-medium transition-all duration-200",
      mobile ? "gap-3 px-3 py-2 text-sm" : "text-sm",
      showLabels && !compact ? "gap-3 px-3 py-2.5" : compact ? "gap-3 px-3 py-2 text-sm" : "justify-center p-2.5",
      isActive
        ? "bg-[#FDFCF8] text-[#101010] font-semibold shadow-sm ring-1 ring-[#E3DBCC]/60"
        : "text-[#FDFCF8] hover:bg-white/10 hover:text-[#FDFCF8] hover:translate-x-0.5",
    )

  return (
    <aside
      className={cn(
        "flex flex-col border border-sidebar-border bg-sidebar shadow-sm transition-[width] duration-200 ease-out",
        mobile
          ? "fixed inset-y-0 right-0 z-[60] w-[min(18rem,92vw)] rounded-l-2xl border-r-0 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]"
          : "hidden lg:flex fixed left-6 top-10 bottom-10 z-40 rounded-2xl",
        !mobile && (collapsed ? "w-16" : "w-56"),
      )}
    >
      {mobile && (
        <div className="flex shrink-0 items-center justify-between border-b border-sidebar-border px-3 py-3">
          <span className="text-sm font-semibold text-sidebar-foreground pr-2">Menu</span>
          <button
            type="button"
            onClick={closeMobile}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-sidebar-foreground hover:bg-sidebar-accent"
            aria-label="Fechar menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      )}

      <nav className={cn("flex-1 overflow-y-auto px-2 pb-2", mobile ? "pt-2" : "pt-4")}>
        <ul className="flex flex-col gap-1">
          {filteredNav.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/dashboard" && pathname.startsWith(item.href))
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  title={!showLabels ? item.label : undefined}
                  onClick={mobile ? closeMobile : undefined}
                  className={linkClass(isActive)}
                >
                  <item.icon className={cn("h-4 w-4 shrink-0 transition-transform duration-200 group-hover/nav:scale-110", isActive ? "text-[#101010]" : "text-[#FDFCF8]/90")} />
                  {showLabels && <span className="truncate">{item.label}</span>}
                </Link>
              </li>
            )
          })}

          {isAdmin && filteredConfig.length > 0 && (
            <>
              {!showLabels && !mobile ? (
                filteredConfig.map((item) => {
                  const isActive = pathname.startsWith(item.href)
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={mobile ? closeMobile : undefined}
                        title={`Configurações – ${item.label}`}
                        className={linkClass(isActive)}
                      >
                        <item.icon className="h-4 w-4" />
                      </Link>
                    </li>
                  )
                })
              ) : (
                <>
                  <li>
                    <button
                      type="button"
                      onClick={() => setConfigOpen((o) => !o)}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                        "text-[#FDFCF8] hover:bg-white/10 hover:text-[#FDFCF8]",
                      )}
                    >
                      <Settings className="h-4 w-4 shrink-0" />
                      <span className="truncate flex-1 text-left">Configurações</span>
                      <ChevronDown className={cn("h-4 w-4 shrink-0 transition-transform", configOpen && "rotate-180")} />
                    </button>
                  </li>
                  {configOpen &&
                    filteredConfig.map((item) => {
                      const isActive = pathname.startsWith(item.href)
                      return (
                        <li key={item.href} className="pl-6">
                          <Link
                            href={item.href}
                            onClick={mobile ? closeMobile : undefined}
                            title={item.label}
                            className={linkClass(isActive, true)}
                          >
                            <item.icon className="h-4 w-4 shrink-0" />
                            <span className="truncate">{item.label}</span>
                          </Link>
                        </li>
                      )
                    })}
                </>
              )}
            </>
          )}
        </ul>
      </nav>

      <div className={cn("border-t border-sidebar-border space-y-2 shrink-0", mobile ? "p-2" : "p-3")}>
        <button
          onClick={() => {
            closeMobile()
            void handleLogout()
          }}
          title={!showLabels ? "Sair" : undefined}
          className={cn(
            "group/logout flex w-full items-center text-sm font-medium text-sidebar-foreground hover:bg-destructive/10 hover:text-destructive transition-all duration-200 rounded-lg",
            showLabels ? "gap-3 px-3 py-2.5" : "justify-center p-2.5",
          )}
        >
          <LogOut className="h-4 w-4 shrink-0 transition-transform duration-200 group-hover/logout:scale-110 group-hover/logout:-translate-x-0.5" />
          {showLabels && <span>Sair</span>}
        </button>

        <div
          className={cn(
            "flex items-center rounded-lg border border-sidebar-border/50 bg-sidebar-accent/50 p-2",
            showLabels ? "gap-3" : "justify-center",
          )}
          title={!showLabels ? `${profile?.name ?? ""} · ${profile?.role ?? ""}` : undefined}
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sidebar-primary/40 text-sidebar-primary-foreground font-semibold text-sm">
            {profile?.name?.charAt(0)?.toUpperCase() || "U"}
          </div>
          {showLabels && (
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-sidebar-foreground truncate">{profile?.name}</p>
              <p className="text-xs text-sidebar-foreground/80 capitalize truncate">{profile?.role}</p>
            </div>
          )}
        </div>
      </div>

      {onToggleCollapse && !mobile && (
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
