"use client"

import { usePathname } from "next/navigation"
import { Menu } from "lucide-react"
import Image from "next/image"
import Link from "next/link"

const PAGE_TITLES: Record<string, string> = {
  "/dashboard": "Home",
  "/dashboard/produtos": "Produtos",
  "/dashboard/clientes": "Clientes",
  "/dashboard/seguradoras": "Marketing",
  "/dashboard/chat": "Chat Interno",
  "/dashboard/financeiro": "Financeiro",
  "/dashboard/nfe": "NF-e",
  "/dashboard/relatorios": "Relatórios",
  "/dashboard/notificacoes": "Notificações",
  "/dashboard/atividades": "Atividades",
  "/dashboard/usuarios": "Usuários",
  "/dashboard/gastos-empresa": "Gastos da Empresa",
  "/dashboard/senhas": "Senhas",
}

export function TopBar({ onToggleSidebar }: { onToggleSidebar?: () => void }) {
  const pathname = usePathname()
  const title = Object.entries(PAGE_TITLES).find(
    ([path]) => pathname === path || (path !== "/dashboard" && pathname.startsWith(path))
  )?.[1] ?? "Dashboard"
  const hideTitle = pathname === "/dashboard/clientes" || pathname.startsWith("/dashboard/clientes/")

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between bg-background/80 backdrop-blur-xl px-6">
      <div className="flex items-center gap-4">
        <button
          onClick={onToggleSidebar}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors lg:hidden"
          aria-label="Menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        {!hideTitle && <h1 className="text-lg font-semibold text-foreground">{title}</h1>}
      </div>

      {/* Logo — só a imagem, sem moldura nem texto */}
      <Link href="/dashboard" className="flex items-center group">
        <Image
          src="/logox.png"
          alt="Xpress Solutions"
          width={120}
          height={40}
          className="object-contain h-8 w-auto drop-shadow-[0_1px_3px_rgba(0,0,0,0.25)] group-hover:opacity-90 transition-opacity"
          priority
        />
      </Link>
    </header>
  )
}
