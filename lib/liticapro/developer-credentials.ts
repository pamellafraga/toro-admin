import type { LiticaProDeveloperCredentials } from "@/lib/liticapro/types"

export function parseDeveloperCredentials(raw: unknown): LiticaProDeveloperCredentials | null {
  if (!raw || typeof raw !== "object") return null
  const o = raw as Record<string, unknown>
  const empresa = String(o.empresa ?? "").trim()
  const usuario = String(o.usuario ?? "").trim()
  const senha = String(o.senha ?? "").trim()
  if (!empresa && !usuario && !senha) return null
  return { empresa, usuario, senha }
}

/** Sugere usuário a partir do nome do responsável (ex.: Guilherme Meireles Lopes → GUILHERME MEIRELES). */
export function suggestDeveloperUsername(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean)
  if (parts.length >= 2) return `${parts[0]} ${parts[1]}`.toUpperCase()
  if (parts.length === 1) return parts[0].toUpperCase()
  return ""
}

export function stripDeveloperCredentialsFromClient(client: Record<string, unknown> | null | undefined) {
  if (!client?.liticapro_data || typeof client.liticapro_data !== "object") return client
  const liticaproData = { ...(client.liticapro_data as Record<string, unknown>) }
  delete liticaproData.dados_desenvolvedor
  return { ...client, liticapro_data: liticaproData }
}
