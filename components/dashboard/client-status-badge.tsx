"use client"

import { ClickableStatusBadge } from "@/components/dashboard/clickable-status-badge"
import {
  STATUS_LEAD_COLOR_MAP,
  STATUS_LEAD_PICKER_OPTIONS,
  getStatusLeadLabel,
} from "@/lib/clients/status-lead"
import { cn } from "@/lib/utils"

type Props = {
  statusId: string
  onSelect: (id: string) => Promise<void>
  disabled?: boolean
  saving?: boolean
  className?: string
}

export function ClientStatusBadge({ statusId, onSelect, disabled, saving, className }: Props) {
  const label = getStatusLeadLabel(statusId)
  const color = STATUS_LEAD_COLOR_MAP[statusId] ?? STATUS_LEAD_COLOR_MAP[""]

  return (
    <ClickableStatusBadge
      options={STATUS_LEAD_PICKER_OPTIONS}
      value={statusId}
      onSelect={onSelect}
      disabled={disabled}
      saving={saving}
      title="Clique para alterar o status do contato"
      className={cn(color, className)}
    >
      {label}
    </ClickableStatusBadge>
  )
}
