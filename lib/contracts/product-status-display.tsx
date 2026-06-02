import {
  AlertCircle,
  CheckCircle,
  Clock,
  PauseCircle,
  XCircle,
  type LucideIcon,
} from "lucide-react"

/** Mesma lógica da página do produto (LiticaPro / demais). */
export function normalizeProductStatus(s: string | null | undefined): string {
  if (!s) return ""
  const t = s.toLowerCase().trim()
  if (t === "trial") return "trial"
  if (t === "active" || t === "ativa") return "ativa"
  if (t === "inactive" || t === "inativa") return "inativa"
  if (t === "cancelled" || t === "cancelada") return "cancelada"
  if (t === "suspended" || t === "pendente") return "pendente"
  return t || s
}

export type ProductStatusBucket = "aguardando_produto" | "contratado" | "trial" | "inativo"

export function getProductStatusBucket(status: string | null | undefined): ProductStatusBucket {
  const t = (status ?? "").toLowerCase().trim()
  if (t === "trial") return "trial"
  if (t === "aguardando_produto") return "aguardando_produto"
  if (t === "ativa" || t === "active") return "contratado"
  return "inativo"
}

const STATUS_MAP: Record<string, { label: string; Icon: LucideIcon; class: string }> = {
  active: { label: "Produto contratado", Icon: CheckCircle, class: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" },
  ativa: { label: "Produto contratado", Icon: CheckCircle, class: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" },
  contratado: { label: "Produto contratado", Icon: CheckCircle, class: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" },
  trial: { label: "Teste grátis", Icon: Clock, class: "bg-sky-500/10 text-sky-400 border-sky-500/30" },
  aguardando_produto: { label: "Aguardando produto", Icon: Clock, class: "bg-amber-500/10 text-amber-400 border-amber-500/30" },
  inactive: { label: "Produto inativo", Icon: PauseCircle, class: "bg-gray-500/10 text-gray-400 border-gray-500/30" },
  inativa: { label: "Produto inativo", Icon: PauseCircle, class: "bg-gray-500/10 text-gray-400 border-gray-500/30" },
  inativo: { label: "Produto inativo", Icon: PauseCircle, class: "bg-gray-500/10 text-gray-400 border-gray-500/30" },
  suspended: { label: "Produto vencido", Icon: AlertCircle, class: "bg-amber-500/10 text-amber-400 border-amber-500/30" },
  pendente: { label: "Produto vencido", Icon: AlertCircle, class: "bg-amber-500/10 text-amber-400 border-amber-500/30" },
  cancelled: { label: "Produto cancelado", Icon: XCircle, class: "bg-red-500/10 text-red-400 border-red-500/30" },
  cancelada: { label: "Produto cancelado", Icon: XCircle, class: "bg-red-500/10 text-red-400 border-red-500/30" },
}

export function resolveProductStatusDisplay(raw: string | null | undefined) {
  const status = normalizeProductStatus(raw)
  return (
    STATUS_MAP[status] ??
    STATUS_MAP[raw ?? ""] ?? {
      label: raw || "—",
      Icon: PauseCircle,
      class: "bg-secondary text-muted-foreground border-border",
    }
  )
}
