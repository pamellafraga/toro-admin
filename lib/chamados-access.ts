/** Logins / nomes de exibição que enxergam o módulo Chamados (suporte interno / TI). */
const CHAMADOS_ASSIGNEE_IDENTIFIERS = new Set(["pamella"])

/**
 * Pamella (engenharia / suporte TI) — única visão do painel Chamados por enquanto.
 * Compara nome de exibição e login (case-insensitive).
 */
export function userHasChamadosAccess(
  displayName?: string | null,
  loginUsername?: string | null
): boolean {
  const n = (displayName ?? "").trim().toLowerCase()
  const u = (loginUsername ?? "").trim().toLowerCase()
  return CHAMADOS_ASSIGNEE_IDENTIFIERS.has(n) || CHAMADOS_ASSIGNEE_IDENTIFIERS.has(u)
}
