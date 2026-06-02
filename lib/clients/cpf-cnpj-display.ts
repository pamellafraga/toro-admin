import { formatCpfCnpj } from "@/lib/format/br"

/** Identificadores internos (sem documento real informado). */
export function isPlaceholderCpfCnpj(value: string | null | undefined): boolean {
  const v = String(value ?? "").trim()
  return !v || v.startsWith("sem-cpf-") || v.startsWith("import-")
}

/** Valor para exibir em inputs e listas — vazio quando não há CPF/CNPJ real. */
export function formatCpfCnpjForDisplay(value: string | null | undefined): string {
  if (isPlaceholderCpfCnpj(value)) return ""
  return formatCpfCnpj(String(value))
}

export function formatCpfCnpjForDisplayOrDash(value: string | null | undefined): string {
  const formatted = formatCpfCnpjForDisplay(value)
  return formatted || "—"
}

/** Dígitos válidos para gravar (11 ou 14); null se vazio/placeholder. */
export function normalizeCpfCnpjForSave(value: string | null | undefined): string | null {
  if (isPlaceholderCpfCnpj(value)) return null
  const digits = String(value ?? "").replace(/\D/g, "")
  if (digits.length === 11 || digits.length === 14) return digits
  return null
}
