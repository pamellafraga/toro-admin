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

/** Lê credenciais salvas em liticapro_data do contato. */
export function readDeveloperCredentialsFromLiticaProData(
  liticaproData: unknown,
): LiticaProDeveloperCredentials | null {
  if (!liticaproData || typeof liticaproData !== "object") return null
  return parseDeveloperCredentials((liticaproData as Record<string, unknown>).dados_desenvolvedor)
}

/** Mantém senha/usuário/empresa já salvos quando o formulário veio parcialmente vazio. */
export function mergeDeveloperCredentials(
  existing: LiticaProDeveloperCredentials | null | undefined,
  incoming: LiticaProDeveloperCredentials | null | undefined,
): LiticaProDeveloperCredentials | null {
  if (!existing && !incoming) return null
  const base = existing ?? { empresa: "", usuario: "", senha: "" }
  const next = incoming ?? { empresa: "", usuario: "", senha: "" }
  const merged = {
    empresa: next.empresa || base.empresa,
    usuario: next.usuario || base.usuario,
    senha: next.senha || base.senha,
  }
  if (!merged.empresa && !merged.usuario && !merged.senha) return null
  return merged
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
