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
  const { loading, profile, isComercial, hasPermission } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  useEffect(() => {
    try {
      const stored = localStorage.getItem(SIDEBAR_COLLAPSED_KEY)
      if (stored !== null) setCollapsed(stored === "true")
    } catch {}
  }, [])

  useEffect(() => {
    setMobileNavOpen(false)
  }, [pathname])

  useEffect(() => {
    if (!mobileNavOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = prev
    }
  }, [mobileNavOpen])

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
    if (!loading && profile && pathname?.startsWith("/dashboard/chamados") && !hasPermission("chamados")) {
      router.replace("/dashboard")
    }
  }, [loading, profile, isComercial, pathname, router, hasPermission])

  return (
    <div className="flex min-h-[100dvh] bg-background">
      <AppSidebar collapsed={collapsed} onToggleCollapse={toggleSidebar} />

      {mobileNavOpen && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-[55] bg-black/50 lg:hidden"
            aria-label="Fechar menu"
            onClick={() => setMobileNavOpen(false)}
          />
          <AppSidebar mobile onMobileClose={() => setMobileNavOpen(false)} />
        </>
      )}

      <div
        className={cn(
          "flex min-w-0 flex-1 flex-col transition-[margin-left] duration-200 ease-out",
          "ml-0",
          collapsed ? "lg:ml-[6rem]" : "lg:ml-[16rem]",
        )}
      >
        <TopBar onOpenMobileMenu={() => setMobileNavOpen(true)} />
        <main className="flex-1 overflow-x-hidden overflow-y-auto p-3 sm:p-4 lg:p-6">{children}</main>
      </div>
    </div>
  )
}
