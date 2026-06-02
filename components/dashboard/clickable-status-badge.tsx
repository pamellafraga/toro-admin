"use client"

import { useState } from "react"
import { Loader2 } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

export type StatusOption = { id: string; label: string; className?: string }

type ClickableStatusBadgeProps = {
  options: StatusOption[]
  value: string
  onSelect: (id: string) => Promise<void>
  disabled?: boolean
  saving?: boolean
  title?: string
  className?: string
  children: React.ReactNode
}

export function ClickableStatusBadge({
  options,
  value,
  onSelect,
  disabled,
  saving,
  title = "Clique para alterar o status",
  className,
  children,
}: ClickableStatusBadgeProps) {
  const [open, setOpen] = useState(false)
  const [localSaving, setLocalSaving] = useState(false)
  const isSaving = saving || localSaving

  const handleSelect = async (id: string) => {
    if (disabled || isSaving || id === value) {
      setOpen(false)
      return
    }
    setLocalSaving(true)
    try {
      await onSelect(id)
      setOpen(false)
    } finally {
      setLocalSaving(false)
    }
  }

  return (
    <Popover open={open} onOpenChange={(next) => !disabled && !isSaving && setOpen(next)}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled || isSaving}
          title={title}
          className={cn(
            "inline-flex items-center justify-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium transition-all",
            "cursor-pointer hover:ring-2 hover:ring-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/50",
            disabled && "cursor-not-allowed opacity-60 hover:ring-0",
            isSaving && "opacity-70",
            className,
          )}
        >
          {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" /> : children}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[min(18rem,92vw)] max-h-[min(70vh,24rem)] overflow-y-auto p-1" align="start">
        <p className="px-2 py-1.5 text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
          Alterar status
        </p>
        {options.map((opt) => (
          <button
            key={opt.id || "__empty"}
            type="button"
            onClick={() => handleSelect(opt.id)}
            className={cn(
              "flex w-full items-center rounded-md px-2 py-2 text-left text-sm transition-colors hover:bg-secondary",
              value === opt.id && "bg-primary/10 text-primary font-medium",
              opt.className,
            )}
          >
            {opt.label}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  )
}
