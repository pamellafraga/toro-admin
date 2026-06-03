import { ORIGEM_CAPTACAO_OPCOES, origemCaptacaoForComercial } from "@/lib/constants/origem-captacao"

export function comercialOwnOrigem(displayName: string): string {
  return origemCaptacaoForComercial(displayName)
}

/** Comercial só edita contatos sem origem ou já atribuídos a ela. */
export function canComercialMutateClient(
  displayName: string,
  origemCaptacao: string | null | undefined,
): boolean {
  const v = (origemCaptacao ?? "").trim()
  if (!v) return true
  return v === comercialOwnOrigem(displayName)
}

export function comercialMutateDeniedMessage(): string {
  return "Este contato pertence a outra origem e não pode ser alterado."
}

export function resolveComercialOrigemOnCreate(
  displayName: string,
  requestedOrigem: string | null | undefined,
): { ok: true; value: string } | { ok: false; error: string } {
  const own = comercialOwnOrigem(displayName)
  const requested = (requestedOrigem ?? "").trim()
  if (requested && requested !== own) {
    return { ok: false, error: "Você só pode cadastrar contatos com sua origem comercial." }
  }
  return { ok: true, value: own }
}

export function resolveComercialOrigemOnUpdate(
  displayName: string,
  existingOrigem: string | null | undefined,
  requestedOrigem: string | null | undefined,
): { ok: true; value: string | null } | { ok: false; error: string } {
  const existing = (existingOrigem ?? "").trim()
  const own = comercialOwnOrigem(displayName)

  if (existing && existing !== own) {
    return { ok: false, error: comercialMutateDeniedMessage() }
  }

  if (requestedOrigem === undefined) {
    return { ok: true, value: existing || null }
  }

  const requested = (requestedOrigem ?? "").trim()
  if (requested && requested !== own) {
    return { ok: false, error: "Só é permitido atribuir sua origem comercial." }
  }

  if (existing === own) {
    return { ok: true, value: own }
  }

  return { ok: true, value: requested === own ? own : requested || null }
}

/** Opções de origem: comercial só vê o próprio nome (nunca Xpress/Website). */
export function getOrigemCaptacaoFormOptions(
  isComercial: boolean,
  comercialDisplayName: string | null,
  currentOrigem?: string | null,
): { value: string; label: string; readOnly?: boolean }[] {
  if (isComercial && comercialDisplayName) {
    const own = comercialOwnOrigem(comercialDisplayName)
    const current = (currentOrigem ?? "").trim()
    if (current && current !== own) {
      return [{ value: current, label: current, readOnly: true }]
    }
    return [{ value: own, label: own }]
  }
  return [
    { value: "", label: "—" },
    ...ORIGEM_CAPTACAO_OPCOES.map((opt) => ({ value: opt, label: opt })),
  ]
}
