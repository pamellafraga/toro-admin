/**
 * Mapeamento interno: usuário (login) → e-mail onde enviar o código.
 * Não expor na interface; só o backend usa. Evita que alguém digite e-mail alheio.
 */
const USERNAME_TO_EMAIL: Record<string, string> = {
  roberto: "rcf.fraga@gmail.com",
  pamella: "ti.pamellafraga@gmail.com",
  stefanie: "rcf.fraga@gmail.com",
  lisete: "rcf.fraga@gmail.com",
  admin: "rcf.fraga@gmail.com",
}

export function getEmailForUsername(username: string): string | null {
  const key = username.trim().toLowerCase()
  return USERNAME_TO_EMAIL[key] ?? null
}

export function hasMapping(username: string): boolean {
  return getEmailForUsername(username) != null
}
