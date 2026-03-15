"use client"

import { useAuth } from "@/lib/auth-context"
import { UserCards } from "@/components/dashboard/user-cards"
import { ShieldAlert } from "lucide-react"

export default function UsuariosPage() {
  const { isAdmin } = useAuth()

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <ShieldAlert className="h-16 w-16 text-muted-foreground/20 mb-4" />
        <h2 className="text-xl font-bold text-foreground mb-2">Acesso Restrito</h2>
        <p className="text-muted-foreground">Somente administradores podem acessar esta pagina.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Gerenciamento de Usuários</h2>
        <p className="text-sm text-muted-foreground mt-1">Adicione, edite e configure permissões de acesso ao dashboard</p>
      </div>
      <UserCards />
    </div>
  )
}
