"use client"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"

/** Estilo padrão de selects de formulário (paleta Toro) */
export const formSelectTriggerClassName =
  "h-10 w-full rounded-lg border border-border bg-card px-3 text-sm font-medium text-foreground shadow-none focus:border-primary focus:ring-[3px] focus:ring-ring/15 data-[placeholder]:text-muted-foreground"

export type FormSelectOption = {
  value: string
  label: string
  disabled?: boolean
}

type FormSelectProps = {
  id?: string
  value: string
  onValueChange: (value: string) => void
  options: FormSelectOption[]
  className?: string
  triggerClassName?: string
  disabled?: boolean
  placeholder?: string
  "aria-label"?: string
  title?: string
}

export function FormSelect({
  id,
  value,
  onValueChange,
  options,
  className,
  triggerClassName,
  disabled,
  placeholder,
  "aria-label": ariaLabel,
  title,
}: FormSelectProps) {
  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger
        id={id}
        title={title}
        aria-label={ariaLabel}
        className={cn(formSelectTriggerClassName, triggerClassName, className)}
      >
        <SelectValue placeholder={placeholder ?? "Selecione"} />
      </SelectTrigger>
      <SelectContent className="border-border bg-popover">
        {options.map((opt) => (
          <SelectItem key={opt.value} value={opt.value} disabled={opt.disabled}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
