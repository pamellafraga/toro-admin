import type { LucideIcon } from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"

interface StatCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon: LucideIcon
  trend?: { value: number; positive: boolean }
  /** Cor de destaque no valor (ex: text-primary para Receita) */
  valueClassName?: string
  className?: string
  /** Quando informado, o card inteiro vira link para a seção correspondente */
  href?: string
}

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  valueClassName,
  className,
  href,
}: StatCardProps) {
  const inner = (
    <>
      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-1">
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className={cn("text-xl font-bold lg:text-2xl", valueClassName ?? "text-foreground")}>{value}</p>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
          {trend && (
            <p className={cn("text-xs font-medium", trend.positive ? "text-emerald-400" : "text-red-400")}>
              {trend.positive ? "+" : ""}{trend.value}% vs mês anterior
            </p>
          )}
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 transition-all duration-300 group-hover:bg-primary/20 group-hover:scale-110 group-hover:shadow-[0_0_16px_rgba(0,81,118,0.3)]">
          <Icon className="h-5 w-5 text-primary transition-transform duration-300 group-hover:scale-110" />
        </div>
      </div>
    </>
  )

  const cardClass = cn(
    "glass rounded-xl p-4 lg:p-5 glow-blue-sm hover:glow-blue transition-all duration-300 group block",
    "hover:-translate-y-1 hover:border-primary/30",
    href ? "cursor-pointer active:scale-[0.99]" : "cursor-default",
    className,
  )

  if (href) {
    return (
      <Link href={href} className={cardClass} aria-label={`${title} — abrir ${title}`}>
        {inner}
      </Link>
    )
  }

  return <div className={cardClass}>{inner}</div>
}
