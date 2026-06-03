"use client"

import { useState } from "react"
import { Check, SlidersHorizontal } from "lucide-react"
import { cn } from "@/lib/utils"
import { STATUS_LEAD_FILTER_TABS } from "@/lib/clients/status-lead"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"

type Props = {
  filterTab: string
  onSelect: (id: string) => void
  countByTab: (id: string) => number
  className?: string
}

export function ClientsStatusFilterSheet({ filterTab, onSelect, countByTab, className }: Props) {
  const [open, setOpen] = useState(false)
  const activeCount = countByTab(filterTab)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          type="button"
          className={cn(
            "relative flex h-10 shrink-0 flex-col items-center justify-center rounded-lg border border-primary/30 bg-primary/5 px-3 text-primary transition-colors hover:bg-primary/10 active:scale-[0.98]",
            className,
          )}
          aria-label="Filtrar por status do contato"
        >
          <SlidersHorizontal className="h-4 w-4" />
          <span className="text-[10px] font-semibold leading-none mt-0.5">Filtrar</span>
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground tabular-nums">
            {activeCount}
          </span>
        </button>
      </SheetTrigger>
      <SheetContent side="bottom" className="rounded-t-2xl px-4 pb-[env(safe-area-inset-bottom)] max-h-[min(85vh,520px)]">
        <SheetHeader className="text-left pb-2">
          <SheetTitle className="text-base">Status do contato</SheetTitle>
          <p className="text-xs text-muted-foreground font-normal">
            Toque para filtrar. Quantidade de contatos em cada etapa.
          </p>
        </SheetHeader>
        <ul className="flex flex-col gap-1.5 overflow-y-auto max-h-[min(60vh,400px)] pr-1 -mx-1 px-1">
          {STATUS_LEAD_FILTER_TABS.map((tab) => {
            const count = countByTab(tab.id)
            const selected = filterTab === tab.id
            return (
              <li key={tab.id === "" ? "status-blank" : tab.id}>
                <button
                  type="button"
                  onClick={() => {
                    onSelect(tab.id)
                    setOpen(false)
                  }}
                  className={cn(
                    "flex w-full items-center justify-between gap-3 rounded-xl border px-3.5 py-3 text-left transition-colors",
                    selected
                      ? "border-primary bg-primary/10 ring-1 ring-primary/20"
                      : "border-border/60 bg-background hover:bg-secondary/50",
                  )}
                >
                  <div className="flex min-w-0 flex-1 items-center gap-2.5">
                    {selected ? (
                      <Check className="h-4 w-4 shrink-0 text-primary" />
                    ) : (
                      <span className="h-4 w-4 shrink-0" />
                    )}
                    <span className={cn("text-sm font-medium truncate", selected && "text-primary")}>
                      {tab.label}
                    </span>
                  </div>
                  <span
                    className={cn(
                      "shrink-0 min-w-[2rem] rounded-full px-2.5 py-0.5 text-center text-xs font-bold tabular-nums",
                      selected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                    )}
                  >
                    {count}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      </SheetContent>
    </Sheet>
  )
}

/** Resumo do filtro ativo (mobile) */
export function ClientsStatusFilterSummary({
  filterTab,
  countByTab,
}: {
  filterTab: string
  countByTab: (id: string) => number
}) {
  const activeTab = STATUS_LEAD_FILTER_TABS.find((t) => t.id === filterTab) ?? STATUS_LEAD_FILTER_TABS[0]
  const count = countByTab(filterTab)

  return (
    <div className="flex items-center justify-between rounded-lg border border-border/50 bg-secondary/30 px-3 py-2 lg:hidden">
      <span className="text-xs text-muted-foreground">Exibindo</span>
      <span className="text-sm font-semibold text-foreground">
        {activeTab.label}{" "}
        <span className="ml-1 inline-flex min-w-[1.75rem] justify-center rounded-full bg-primary px-2 py-0.5 text-xs font-bold text-primary-foreground tabular-nums">
          {count}
        </span>
      </span>
    </div>
  )
}
