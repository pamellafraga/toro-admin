/** Status de contato (etapa comercial) — fonte única para UI e filtros */

export const STATUS_LEAD_OPTIONS = [
  { id: "", label: "—" },
  { id: "tentando_contato", label: "Tentando contato" },
  { id: "em_conversa", label: "Em conversa" },
  { id: "agendado", label: "Agendado" },
  { id: "enviado_dados_pamella", label: "Enviado os Dados para Pamella" },
  { id: "contratando", label: "Contratando" },
  { id: "negociando", label: "Negociando" },
  { id: "ativo", label: "Ativo" },
  { id: "perdido", label: "Perdido" },
  { id: "bloqueado", label: "Bloqueado" },
  { id: "sem_interesse", label: "Sem interesse" },
] as const

/** Abas de filtro (inclui "Todos") */
export const STATUS_LEAD_FILTER_TABS = [
  { id: "all", label: "Todos", btn: "bg-primary hover:bg-primary/90 text-white", inactive: "bg-gray-100 text-gray-800 border border-gray-200 hover:bg-gray-200" },
  { id: "", label: "—", btn: "bg-gray-600 hover:bg-gray-500 text-white", inactive: "bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200" },
  { id: "tentando_contato", label: "Tentando contato", btn: "bg-slate-600 hover:bg-slate-500 text-white", inactive: "bg-slate-100 text-slate-800 border border-slate-200 hover:bg-slate-200" },
  { id: "em_conversa", label: "Em conversa", btn: "bg-sky-600 hover:bg-sky-500 text-white", inactive: "bg-sky-100 text-sky-800 border border-sky-200 hover:bg-sky-200" },
  { id: "agendado", label: "Agendado", btn: "bg-indigo-600 hover:bg-indigo-500 text-white", inactive: "bg-indigo-100 text-indigo-800 border border-indigo-200 hover:bg-indigo-200" },
  {
    id: "enviado_dados_pamella",
    label: "Enviado p/ Pamella",
    btn: "bg-teal-600 hover:bg-teal-500 text-white",
    inactive: "bg-teal-100 text-teal-900 border border-teal-200 hover:bg-teal-200",
  },
  { id: "contratando", label: "Contratando", btn: "bg-amber-600 hover:bg-amber-500 text-white", inactive: "bg-amber-100 text-amber-800 border border-amber-200 hover:bg-amber-200" },
  { id: "negociando", label: "Negociando", btn: "bg-violet-600 hover:bg-violet-500 text-white", inactive: "bg-violet-100 text-violet-800 border border-violet-200 hover:bg-violet-200" },
  { id: "ativo", label: "Ativo", btn: "bg-emerald-600 hover:bg-emerald-500 text-white", inactive: "bg-emerald-100 text-emerald-800 border border-emerald-200 hover:bg-emerald-200" },
  { id: "perdido", label: "Perdido", btn: "bg-red-600 hover:bg-red-500 text-white", inactive: "bg-red-100 text-red-800 border border-red-200 hover:bg-red-200" },
  { id: "bloqueado", label: "Bloqueado", btn: "bg-black hover:bg-gray-800 text-white border-2 border-black", inactive: "bg-gray-800 text-white border-2 border-gray-800 hover:bg-gray-700" },
  { id: "sem_interesse", label: "Sem interesse", btn: "bg-gray-500 hover:bg-gray-600 text-white border-2 border-gray-500", inactive: "bg-gray-400 text-white border-2 border-gray-400 hover:bg-gray-500" },
] as const

export const STATUS_LEAD_PICKER_OPTIONS = STATUS_LEAD_OPTIONS.map((o) => ({
  id: o.id,
  label: o.label,
}))

export const STATUS_LEAD_COLOR_MAP: Record<string, string> = {
  "": "bg-secondary text-muted-foreground border-border",
  tentando_contato: "bg-slate-500/10 text-slate-400 border-slate-500/30",
  em_conversa: "bg-sky-500/10 text-sky-400 border-sky-500/30",
  agendado: "bg-indigo-500/10 text-indigo-400 border-indigo-500/30",
  enviado_dados_pamella: "bg-teal-500/10 text-teal-600 border-teal-500/30",
  contratando: "bg-amber-500/10 text-amber-400 border-amber-500/30",
  negociando: "bg-violet-500/10 text-violet-400 border-violet-500/30",
  ativo: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
  perdido: "bg-red-500/10 text-red-400 border-red-500/30",
  bloqueado: "bg-black/15 text-gray-900 border-gray-800/40",
  sem_interesse: "bg-gray-500/10 text-gray-700 border-gray-500/30",
}

export const STATUS_LEAD_KANBAN_COLUMNS = [
  { id: "", label: "—", header: "bg-gray-100 border-gray-200" },
  { id: "tentando_contato", label: "Tentando", header: "bg-slate-100 border-slate-200" },
  { id: "em_conversa", label: "Em conversa", header: "bg-sky-100 border-sky-200" },
  { id: "agendado", label: "Agendado", header: "bg-indigo-100 border-indigo-200" },
  { id: "enviado_dados_pamella", label: "Enviado p/ Pamella", header: "bg-teal-100 border-teal-200" },
  { id: "contratando", label: "Contratando", header: "bg-amber-100 border-amber-200" },
  { id: "negociando", label: "Negociando", header: "bg-violet-100 border-violet-200" },
  { id: "ativo", label: "Ativo", header: "bg-emerald-100 border-emerald-200" },
  { id: "perdido", label: "Perdido", header: "bg-red-100 border-red-200" },
  { id: "bloqueado", label: "Bloqueado", header: "bg-gray-800 border-gray-900 text-white" },
  { id: "sem_interesse", label: "Sem interesse", header: "bg-gray-200 border-gray-300" },
] as const

export function normalizeStatusLead(raw: string | null | undefined): string {
  const s = (raw ?? "").trim().toLowerCase()
  if (!s || s === "novo") return ""
  return s
}

export function getStatusLeadLabel(statusId: string): string {
  if (!statusId) return "—"
  return STATUS_LEAD_OPTIONS.find((x) => x.id === statusId)?.label ?? statusId
}
