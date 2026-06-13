import { randomBytes } from "crypto"
import { formatCpf } from "@/lib/format/br"
import { suggestDeveloperUsername } from "@/lib/liticapro/developer-credentials"
import type { LiticaProDeveloperCredentials } from "@/lib/liticapro/types"

export function generateTemporaryPassword(length = 12): string {
  const base = randomBytes(16).toString("base64url").replace(/[^a-zA-Z0-9]/g, "")
  const core = base.slice(0, Math.max(8, length - 2))
  return `${core}1!`
}

export function buildLiticaProCredentials(input: {
  customer_type: "empresa" | "profissional_liberal"
  empresa_nome: string
  responsible_or_full_name: string
  cpf_digits?: string
  existing?: LiticaProDeveloperCredentials | null
}): LiticaProDeveloperCredentials {
  const existing = input.existing
  const senha = existing?.senha?.trim() || generateTemporaryPassword()

  if (input.customer_type === "profissional_liberal") {
    const cpf = input.cpf_digits ? formatCpf(input.cpf_digits) : existing?.empresa?.trim() || ""
    const usuario =
      existing?.usuario?.trim() ||
      suggestDeveloperUsername(input.responsible_or_full_name) ||
      input.responsible_or_full_name.trim().toUpperCase()
    return { empresa: cpf, usuario, senha }
  }

  const empresa = existing?.empresa?.trim() || input.empresa_nome.trim().toUpperCase()
  const usuario =
    existing?.usuario?.trim() ||
    suggestDeveloperUsername(input.responsible_or_full_name) ||
    input.responsible_or_full_name.trim().toUpperCase()

  return { empresa, usuario, senha }
}

export function buildLiticaProUserCredentials(input: {
  empresa_nome: string
  full_name: string
  existing?: LiticaProDeveloperCredentials | null
}): LiticaProDeveloperCredentials {
  const existing = input.existing
  const senha = existing?.senha?.trim() || generateTemporaryPassword()
  const empresa = existing?.empresa?.trim() || input.empresa_nome.trim().toUpperCase()
  const usuario =
    existing?.usuario?.trim() ||
    suggestDeveloperUsername(input.full_name) ||
    input.full_name.trim().toUpperCase()

  return { empresa, usuario, senha }
}
