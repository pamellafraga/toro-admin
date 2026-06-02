"use client"

import { BR_UFS } from "@/lib/liticapro/constants"
import { cn } from "@/lib/utils"

type Props = {
  selected: string[]
  onToggle: (uf: string) => void
  compact?: boolean
}

export function LiticaProStatesSelector({ selected, onToggle, compact }: Props) {
  return (
    <div className={cn("grid gap-1.5", compact ? "grid-cols-9" : "grid-cols-9")}>
      {BR_UFS.map((uf) => {
        const active = selected.includes(uf)
        return (
          <button
            key={uf}
            type="button"
            onClick={() => onToggle(uf)}
            className={cn(
              "rounded border text-xs font-medium transition-colors",
              compact ? "px-1 py-0.5" : "px-2 py-1",
              active
                ? "bg-primary/20 border-primary text-primary"
                : "border-border text-muted-foreground hover:border-primary/60",
            )}
          >
            {uf}
          </button>
        )
      })}
    </div>
  )
}
