"use client"

import { Building2, User } from "lucide-react"
import { resolveClientCustomerType } from "@/lib/clients/customer-type"
import { cn } from "@/lib/utils"

type Props = {
  customerType?: "empresa" | "profissional_liberal" | null
  cpfCnpj?: string | null
  liticaproData?: { customer_type?: string } | null
  size?: "sm" | "md"
  className?: string
}

export function ClientTypeAvatar({
  customerType,
  cpfCnpj,
  liticaproData,
  size = "sm",
  className,
}: Props) {
  const type =
    customerType ?? resolveClientCustomerType(liticaproData, cpfCnpj ?? null)
  const isProfissional = type === "profissional_liberal"
  const Icon = isProfissional ? User : Building2

  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-full bg-primary/10 shrink-0",
        size === "md" ? "h-10 w-10" : "h-8 w-8",
        className,
      )}
      title={isProfissional ? "Profissional liberal" : "Empresa"}
    >
      <Icon className={cn("text-primary", size === "md" ? "h-5 w-5" : "h-4 w-4")} />
    </div>
  )
}
