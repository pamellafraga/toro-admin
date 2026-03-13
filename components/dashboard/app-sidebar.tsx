"use client"

import Link from "next/link"
import Image from "next/image"
import { usePathname, useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"
import {
  Home,
  Package,
  Users,
  Shield,
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
  { label: "Senhas", href: "/dashboard/senhas", icon: Key, permission: "admin" },
]

export function AppSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { profile, hasPermission, isAdmin } = useAuth()
  const supabase = createClient()

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

  return (
    <aside
      className="fixed left-0 top-0 z-40 h-screen w-56 flex flex-col border-r border-sidebar-border bg-sidebar"
    >
      {/* Logo / Brand */}
      <div className="relative flex items-center gap-3 border-b border-sidebar-border px-4 py-3 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/8 via-transparent to-transparent pointer-events-none" />
        <Link href="/dashboard" className="relative flex items-center gap-3 group">
          {/* Logo em moldura redonda */}
          <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-primary/30 bg-sidebar-accent overflow-hidden logo-glow group-hover:scale-105 transition-all duration-300">
            <Image
              src="/images/logo.png"
              alt="Xpress Solutions"
              width={32}
              height={32}
              className="object-cover scale-125"
              priority
            />
          </div>
          {/* Nome */}
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-bold text-foreground tracking-wide">Xpress</span>
            <span className="text-[10px] font-medium text-primary tracking-widest uppercase">Solutions</span>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-2 py-4">
        <ul className="flex flex-col gap-1">
          {filteredNav.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/dashboard" && pathname.startsWith(item.href))
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "group/nav flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                    isActive
                      ? "bg-primary/10 text-primary shadow-[inset_0_0_12px_rgba(14,165,233,0.08)]"
                      : "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground hover:shadow-[inset_0_0_10px_rgba(14,165,233,0.06)] hover:translate-x-0.5"
                  )}
                >
                  <item.icon className={cn("h-4 w-4 shrink-0 transition-transform duration-200 group-hover/nav:scale-110", isActive && "text-primary")} />
                  <span className="truncate">{item.label}</span>
                </Link>
              </li>
            )
          })}

          {isAdmin && (
            <li>
              <Link
                href="/dashboard/usuarios"
                className={cn(
                  "group/nav flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                  pathname.startsWith("/dashboard/usuarios")
                    ? "bg-primary/10 text-primary shadow-[inset_0_0_12px_rgba(14,165,233,0.08)]"
                    : "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground hover:translate-x-0.5"
                )}
              >
                <Settings
                  className={cn(
                    "h-4 w-4 shrink-0 transition-transform duration-200 group-hover/nav:scale-110",
                    pathname.startsWith("/dashboard/usuarios") && "text-primary"
                  )}
                />
                <span className="truncate">Usuários</span>
              </Link>
            </li>
          )}
        </ul>
      </nav>

      {/* Logout */}
      <div className="border-t border-sidebar-border p-3">
        <button
          onClick={handleLogout}
          className="group/logout flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all duration-200"
        >
          <LogOut className="h-4 w-4 shrink-0 transition-transform duration-200 group-hover/logout:scale-110 group-hover/logout:-translate-x-0.5" />
          <span>Sair</span>
        </button>
      </div>
    </aside>
  )
}
