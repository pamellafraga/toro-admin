"use client"

import { useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { cn } from "@/lib/utils"
import { AppSidebar } from "@/components/dashboard/app-sidebar"
import { TopBar } from "@/components/dashboard/top-bar"

const SIDEBAR_COLLAPSED_KEY = "xpress_sidebar_collapsed"

const COMERCIAL_FORBIDDEN_PATHS = [
  "/dashboard/financeiro",
  "/dashboard/nfe",
  "/dashboard/relatorios",
  "/dashboard/notificacoes",
  "/dashboard/atividades",
  "/dashboard/gastos-empresa",
  "/dashboard/senhas",
  "/dashboard/usuarios",
]

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const { loading, profile, isComercial } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    try {
      const stored = localStorage.getItem(SIDEBAR_COLLAPSED_KEY)
      if (stored !== null) setCollapsed(stored === "true")
    } catch {}
  }, [])

  const toggleSidebar = () => {
    setCollapsed((prev) => {
      const next = !prev
      try {
        localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(next))
      } catch {}
      return next
    })
  }

  useEffect(() => {
    if (!loading && !profile) {
      router.push("/login")
      return
    }
    if (!loading && isComercial && pathname) {
      const forbidden = COMERCIAL_FORBIDDEN_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))
      if (forbidden) router.replace("/dashboard")
    }
  }, [loading, profile, isComercial, pathname, router])

  // Sempre renderiza o layout com sidebar - ela se popula quando auth carrega
  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar collapsed={collapsed} onToggleCollapse={toggleSidebar} />
      <div
        className={cn(
          "flex flex-1 flex-col transition-[margin-left] duration-200 ease-out",
          collapsed ? "ml-[6rem]" : "ml-[16rem]"
        )}
      >
        <TopBar />
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
