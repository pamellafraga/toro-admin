/** Opções de origem da captação (LiticaPro, SEGURA, Clientes). */
export const ORIGEM_CAPTACAO_OPCOES = [
  "Comercial Stefanie",
  "Xpress Solutions",
  "Website",
] as const

export type OrigemCaptacao = (typeof ORIGEM_CAPTACAO_OPCOES)[number]

/** Preenche origem quando o usuário logado é comercial (ex.: Stefanie). */
export function origemCaptacaoForComercial(displayName: string): string {
  const n = displayName.trim()
  if (n.toLowerCase() === "stefanie") return "Comercial Stefanie"
  return n ? `Comercial ${n}` : ""
}

/** Valores legados de origem da Stefanie (cliente e contrato). */
export const STEFANIE_ORIGEM_CAPTACAO = ["Comercial Stefanie", "Comercial - Stefanie"] as const
export const STEFANIE_ORIGEM_COMERCIAL = "Comercial - Stefanie"

/** Origem de captação Xpress Solutions (aba dedicada no painel Contatos). */
export const XPRESS_ORIGEM_CAPTACAO = "Xpress Solutions"

export const XPRESS_ORIGEM_CAPTACAO_VALUES = [
  XPRESS_ORIGEM_CAPTACAO,
  "Xpress solutions",
  "XPRESS SOLUTIONS",
] as const

export function isXpressOrigem(origem: string | null | undefined): boolean {
  const v = (origem ?? "").trim().toLowerCase()
  if (!v) return false
  if (v === "xpress solutions") return true
  return v.includes("xpress") && v.includes("solution")
}

export function isStefanieOrigem(origem: string | null | undefined): boolean {
  const v = (origem ?? "").trim()
  return STEFANIE_ORIGEM_CAPTACAO.some((o) => o === v)
}

/** Converte origem_captacao do cliente em origem_comercial do contrato (comissões / abas). */
export function origemComercialFromCaptacao(origemCaptacao: string): string | null {
  const v = origemCaptacao.trim()
  if (!v) return null
  if (isStefanieOrigem(v)) return STEFANIE_ORIGEM_COMERCIAL
  if (v.startsWith("Comercial ")) {
    const name = v.replace(/^Comercial\s+/, "").trim()
    return name ? `Comercial - ${name}` : null
  }
  return null
}
