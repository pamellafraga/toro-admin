"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { AppSidebar } from "@/components/dashboard/app-sidebar"
import { TopBar } from "@/components/dashboard/top-bar"

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const { loading, profile } = useAuth()
  const router = useRouter()

  useEffect(() => {
    // Se terminou de carregar e não tem profile, redireciona para login
    if (!loading && !profile) {
      router.push("/login")
    }
  }, [loading, profile, router])

  // Sempre renderiza o layout com sidebar - ela se popula quando auth carrega
  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar />
      <div className="flex flex-1 flex-col ml-56">
        <TopBar />
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
