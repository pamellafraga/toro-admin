"use client"

import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { Mail, Pencil, Phone, ShoppingCart, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { ClientTypeAvatar } from "@/components/dashboard/client-type-avatar"
import { ClientStatusBadge } from "@/components/dashboard/client-status-badge"
import type { Client } from "@/lib/types"

type ClientRow = Client & {
  primary_contract?: { status: string; product_name: string } | null
}

type Props = {
  clients: ClientRow[]
  getStatusLead: (c: Client) => string
  onEdit: (c: Client) => void
  onDelete: (c: Client) => void
  onRegisterPurchase?: (c: Client) => void
  onStatusChange: (client: Client, statusId: string) => Promise<void>
  statusUpdatingId?: string | null
  emptyMessage?: string
}

export function ClientsMobileCardList({
  clients,
  getStatusLead,
  onEdit,
  onDelete,
  onRegisterPurchase,
  onStatusChange,
  statusUpdatingId,
  emptyMessage = "Nenhum contato",
}: Props) {
  if (!clients.length) {
    return (
      <p className="py-16 text-center text-sm text-muted-foreground">{emptyMessage}</p>
    )
  }

  return (
    <ul className="flex flex-col gap-3 pb-4">
      {clients.map((client) => {
        const etapa = getStatusLead(client)
        return (
          <li
            key={client.id}
            className="rounded-xl border border-border/60 bg-background p-3.5 shadow-sm"
          >
            <div className="flex items-start gap-3">
              <ClientTypeAvatar
                customerType={client.customer_type}
                cpfCnpj={client.cpf_cnpj}
                liticaproData={client.liticapro_data}
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold leading-snug text-foreground line-clamp-2">
                    {client.name}
                  </p>
                  <button
                    type="button"
                    onClick={() => onEdit(client)}
                    className="shrink-0 rounded-lg p-1.5 text-primary hover:bg-primary/10"
                    aria-label="Editar contato"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                </div>
                {client.origem_captacao && (
                  <p className="mt-0.5 text-[11px] text-muted-foreground truncate">
                    {client.origem_captacao}
                  </p>
                )}
              </div>
            </div>

            {client.phone && (
              <p className="mt-2.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                <Phone className="h-3.5 w-3.5 shrink-0 text-primary/70" />
                <span>{client.phone}</span>
              </p>
            )}
            {client.email && (
              <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground truncate">
                <Mail className="h-3.5 w-3.5 shrink-0 text-primary/70" />
                <span className="truncate">{client.email}</span>
              </p>
            )}

            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border/50 pt-3">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] font-medium text-muted-foreground">Contato:</span>
                <ClientStatusBadge
                  statusId={etapa}
                  saving={statusUpdatingId === client.id}
                  onSelect={(id) => onStatusChange(client, id)}
                />
              </div>
              <span className="text-[10px] text-muted-foreground/80">
                {format(new Date(client.created_at), "dd/MM/yyyy", { locale: ptBR })}
              </span>
            </div>

            <div className="mt-2 flex flex-wrap items-center justify-end gap-1.5">
              {onRegisterPurchase && (
                <button
                  type="button"
                  onClick={() => onRegisterPurchase(client)}
                  className={cn(
                    "inline-flex items-center gap-1 rounded-lg border border-emerald-600/40 bg-emerald-500/15 px-2.5 py-1.5",
                    "text-[11px] font-semibold text-emerald-800 hover:bg-emerald-500/25 dark:text-emerald-300",
                  )}
                  aria-label="Registrar compra manual"
                  title="Registrar compra manual — LiticaPro"
                >
                  <ShoppingCart className="h-3.5 w-3.5 shrink-0" />
                  Compra manual
                </button>
              )}
              <button
                type="button"
                onClick={() => onDelete(client)}
                className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                aria-label="Excluir contato"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
