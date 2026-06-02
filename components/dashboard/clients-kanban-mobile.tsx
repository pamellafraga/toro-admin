"use client"

import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { Mail, Pencil, Phone, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { ClientTypeAvatar } from "@/components/dashboard/client-type-avatar"
import { ClientStatusBadge } from "@/components/dashboard/client-status-badge"
import { STATUS_LEAD_KANBAN_COLUMNS } from "@/lib/clients/status-lead"
import type { Client } from "@/lib/types"

type ClientRow = Client & {
  primary_contract?: { status: string; product_name: string } | null
}

type Props = {
  clients: ClientRow[]
  filterTab: string
  getStatusLead: (c: Client) => string
  onEdit: (c: Client) => void
  onDelete: (c: Client) => void
  onStatusChange: (client: Client, statusId: string) => Promise<void>
  statusUpdatingId?: string | null
  emptyMessage?: string
}

export function ClientsKanbanMobile({
  clients,
  filterTab,
  getStatusLead,
  onEdit,
  onDelete,
  onStatusChange,
  statusUpdatingId,
  emptyMessage = "Nenhum contato",
}: Props) {
  const columns =
    filterTab === "all"
      ? STATUS_LEAD_KANBAN_COLUMNS
      : STATUS_LEAD_KANBAN_COLUMNS.filter((col) => col.id === filterTab)

  const byColumn = (colId: string) =>
    clients.filter((c) => getStatusLead(c) === colId)

  if (!clients.length) {
    return (
      <p className="py-12 text-center text-sm text-muted-foreground">{emptyMessage}</p>
    )
  }

  return (
    <div className="-mx-1 flex gap-2 overflow-x-auto pb-2 snap-x snap-mandatory">
      {columns.map((col) => {
        const items = byColumn(col.id)
        return (
          <div
            key={col.id || "blank"}
            className="flex w-[min(85vw,280px)] shrink-0 snap-start flex-col rounded-xl border border-border/60 bg-secondary/20"
          >
            <div
              className={cn(
                "flex items-center justify-between rounded-t-xl border-b px-2.5 py-2",
                col.header,
              )}
            >
              <span className="text-xs font-semibold truncate">{col.label}</span>
              <span className="ml-1 rounded-full bg-background/80 px-1.5 py-0.5 text-[10px] font-bold">
                {items.length}
              </span>
            </div>
            <div className="flex max-h-[min(65vh,520px)] flex-col gap-2 overflow-y-auto p-2">
              {items.length === 0 ? (
                <p className="py-6 text-center text-[11px] text-muted-foreground">Vazio</p>
              ) : (
                items.map((client) => {
                  const etapa = getStatusLead(client)
                  return (
                    <article
                      key={client.id}
                      className="rounded-lg border border-border/50 bg-background p-2.5 shadow-sm"
                    >
                      <div className="flex items-start gap-2">
                        <ClientTypeAvatar
                          customerType={client.customer_type}
                          cpfCnpj={client.cpf_cnpj}
                          liticaproData={client.liticapro_data}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium leading-tight text-foreground line-clamp-2">
                            {client.name}
                          </p>
                          {client.origem_captacao && (
                            <p className="mt-0.5 text-[10px] text-muted-foreground truncate">
                              {client.origem_captacao}
                            </p>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => onEdit(client)}
                          className="shrink-0 rounded-md p-1.5 text-primary hover:bg-primary/10"
                          aria-label="Editar contato"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                      </div>
                      {client.phone && (
                        <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                          <Phone className="h-3 w-3 shrink-0" />
                          <span className="truncate">{client.phone}</span>
                        </p>
                      )}
                      {client.email && (
                        <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                          <Mail className="h-3 w-3 shrink-0" />
                          <span className="truncate">{client.email}</span>
                        </p>
                      )}
                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        <span className="text-[10px] text-muted-foreground">Contato:</span>
                        <ClientStatusBadge
                          statusId={etapa}
                          saving={statusUpdatingId === client.id}
                          onSelect={(id) => onStatusChange(client, id)}
                        />
                      </div>
                      <p className="mt-1.5 text-[10px] text-muted-foreground/70">
                        {format(new Date(client.created_at), "dd/MM/yyyy", { locale: ptBR })}
                      </p>
                      <div className="mt-2 flex justify-end border-t border-border/40 pt-2">
                        <button
                          type="button"
                          onClick={() => onDelete(client)}
                          className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                          aria-label="Excluir"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </article>
                  )
                })
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
