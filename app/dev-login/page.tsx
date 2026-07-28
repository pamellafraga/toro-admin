"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

/** Rota só para desenvolvimento local — entra direto no painel. */
export default function DevLoginPage() {
  const router = useRouter()

  useEffect(() => {
    if (process.env.NODE_ENV !== "development") {
      router.replace("/login")
      return
    }

    const run = async () => {
      try {
        const res = await fetch("/api/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: "Toro", password: "toro@101029" }),
        })
        let data = await res.json()
        let ok = res.ok

        if (!ok) {
          const fallback = await fetch("/api/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username: "Admin", password: "Xpress@101029" }),
          })
          data = await fallback.json()
          ok = fallback.ok
        }

        if (!ok) {
          router.replace("/login")
          return
        }
        localStorage.setItem(
          "toro_auth",
          JSON.stringify({
            user: data.user ?? "Toro",
            displayName: data.displayName ?? "Toro",
            role: data.role ?? "admin",
            authenticated: true,
          }),
        )
        router.replace("/dashboard")
        router.refresh()
      } catch {
        router.replace("/login")
      }
    }

    void run()
  }, [router])

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#101010] text-[#FDFCF8]">
      <p className="text-sm tracking-wider">Entrando no painel Toro…</p>
    </div>
  )
}
