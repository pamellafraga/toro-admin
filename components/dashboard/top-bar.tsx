"use client"

import { usePathname } from "next/navigation"
import { MoreVertical } from "lucide-react"
import Image from "next/image"
import Link from "next/link"

const PAGE_TITLES: Record<string, string> = {
  "/dashboard": "Home",
  "/dashboard/chamados": "Chamados",
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
  "/dashboard/gastos-empresa": "Gastos",
  "/dashboard/senhas": "Sistemas",
}

export function TopBar({ onOpenMobileMenu }: { onOpenMobileMenu?: () => void }) {
  const pathname = usePathname()
  const title = Object.entries(PAGE_TITLES).find(
    ([path]) => pathname === path || (path !== "/dashboard" && pathname.startsWith(path)),
  )?.[1] ?? "Dashboard"

  return (
    <header className="sticky top-0 z-30 flex h-12 shrink-0 items-center gap-2 border-b border-border/50 bg-background/95 backdrop-blur-md px-3 lg:h-16 lg:border-b-0 lg:bg-background/80 lg:px-6">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <Link href="/dashboard" className="shrink-0 lg:hidden">
          <Image
            src="/logox.png"
            alt="Xpress Solutions"
            width={88}
            height={28}
            className="h-6 w-auto object-contain"
            priority
          />
        </Link>
        <h1 className="truncate text-base font-semibold text-foreground lg:text-lg">{title}</h1>
      </div>

      <Link href="/dashboard" className="hidden shrink-0 items-center lg:flex">
        <Image
          src="/logox.png"
          alt="Xpress Solutions"
          width={120}
          height={40}
          className="h-8 w-auto object-contain drop-shadow-[0_1px_3px_rgba(0,0,0,0.25)] hover:opacity-90 transition-opacity"
          priority
        />
      </Link>

      <button
        type="button"
        onClick={onOpenMobileMenu}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-secondary/80 text-foreground hover:bg-secondary lg:hidden"
        aria-label="Abrir menu do painel"
      >
        <MoreVertical className="h-5 w-5" />
      </button>
    </header>
  )
}
