import type { DashboardOverview } from "@/lib/db/repositories/dashboard.repository"

export async function fetchDashboardOverview(): Promise<DashboardOverview> {
  const res = await fetch("/api/dashboard/overview", { credentials: "include", cache: "no-store" })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error || "Erro ao carregar dashboard")
  }
  return res.json() as Promise<DashboardOverview>
}
