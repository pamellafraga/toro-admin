"use client"

import { usePathname } from "next/navigation"
import { EllipsisVertical } from "lucide-react"
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
    <header className="sticky top-0 z-40 shrink-0 border-b border-border/50 bg-background/95 backdrop-blur-md pt-[max(0.75rem,env(safe-area-inset-top))] lg:border-b-0 lg:bg-background/80 lg:pt-0">
      <div className="flex h-12 items-center gap-3 px-3 lg:h-16 lg:px-6">
        <h1 className="min-w-0 flex-1 truncate text-base font-semibold text-foreground lg:text-lg">{title}</h1>

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
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary shadow-sm active:bg-primary/20 lg:hidden"
          aria-label="Abrir menu do painel"
        >
          <EllipsisVertical className="h-6 w-6 text-primary" strokeWidth={2.5} />
        </button>
      </div>
    </header>
  )
}
