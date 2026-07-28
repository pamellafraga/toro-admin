/** Logins / nomes de exibição que enxergam o módulo SAC. */
const SAC_ASSIGNEE_IDENTIFIERS = new Set(["toro"])

export function userHasChamadosAccess(
  displayName?: string | null,
  loginUsername?: string | null
): boolean {
  const n = (displayName ?? "").trim().toLowerCase()
  const u = (loginUsername ?? "").trim().toLowerCase()
  return SAC_ASSIGNEE_IDENTIFIERS.has(n) || SAC_ASSIGNEE_IDENTIFIERS.has(u)
}
