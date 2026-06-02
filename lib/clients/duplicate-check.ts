import {
  findClientByCpfCnpjDigits,
  findClientByEmailNormalized,
  findClientByPhoneDigits,
} from "@/lib/db/repositories/clients.repository"
import { isPlaceholderCpfCnpj, normalizeCpfCnpjForSave } from "@/lib/clients/cpf-cnpj-display"

export type DuplicateField = "cpf_cnpj" | "phone" | "email"

export type DuplicateClientResult = {
  field: DuplicateField
  existingId: string
  existingName: string
}

/** Telefone com pelo menos 10 dígitos (fixo/celular BR). */
export function normalizePhoneDigits(phone: string | null | undefined): string | null {
  const digits = String(phone ?? "").replace(/\D/g, "")
  if (digits.length < 10) return null
  return digits
}

export function normalizeEmailForDuplicate(email: string | null | undefined): string | null {
  const e = String(email ?? "").trim().toLowerCase()
  if (!e || !e.includes("@")) return null
  return e
}

/** Pelo menos um identificador para evitar cadastros “soltos” duplicados só por nome. */
export function hasClientIdentity(params: {
  cpfCnpj?: string | null
  phone?: string | null
  email?: string | null
}): boolean {
  if (normalizeCpfCnpjForSave(params.cpfCnpj) && !isPlaceholderCpfCnpj(params.cpfCnpj)) {
    return true
  }
  if (normalizePhoneDigits(params.phone)) return true
  if (normalizeEmailForDuplicate(params.email)) return true
  return false
}

export function duplicateClientMessage(match: DuplicateClientResult): string {
  const who = match.existingName ? `"${match.existingName}"` : "outro contato"
  if (match.field === "cpf_cnpj") {
    return `Já existe um contato com este CPF/CNPJ: ${who}.`
  }
  if (match.field === "phone") {
    return `Já existe um contato com este telefone: ${who}.`
  }
  return `Já existe um contato com este e-mail: ${who}.`
}

/** Retorna o primeiro conflito encontrado (CPF → telefone → e-mail). */
export async function findDuplicateClient(params: {
  cpfCnpj?: string | null
  phone?: string | null
  email?: string | null
  excludeClientId?: string | null
}): Promise<DuplicateClientResult | null> {
  const exclude = params.excludeClientId ?? null

  const cpfDigits = normalizeCpfCnpjForSave(params.cpfCnpj)
  if (cpfDigits && !isPlaceholderCpfCnpj(params.cpfCnpj)) {
    const byCpf = await findClientByCpfCnpjDigits(cpfDigits, exclude)
    if (byCpf) {
      return { field: "cpf_cnpj", existingId: byCpf.id, existingName: byCpf.name }
    }
  }

  const phoneDigits = normalizePhoneDigits(params.phone)
  if (phoneDigits) {
    const byPhone = await findClientByPhoneDigits(phoneDigits, exclude)
    if (byPhone) {
      return { field: "phone", existingId: byPhone.id, existingName: byPhone.name }
    }
  }

  const emailNorm = normalizeEmailForDuplicate(params.email)
  if (emailNorm) {
    const byEmail = await findClientByEmailNormalized(emailNorm, exclude)
    if (byEmail) {
      return { field: "email", existingId: byEmail.id, existingName: byEmail.name }
    }
  }

  return null
}
