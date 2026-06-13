import { formatCnpj, formatCpfCnpj } from "@/lib/format/br"
import { findClientByCpfCnpjDigits, findClientByEmailNormalized } from "@/lib/db/repositories/clients.repository"
import {
  findLiticaProContractByClientId,
  findLiticaProTrialByLinkedCnpj,
} from "@/lib/db/repositories/contracts.repository"
import { findOrCreateProductFromCatalog } from "@/lib/db/repositories/products.repository"
import { getProductBySlug } from "@/lib/products/catalog"

export type TrialEligibilityResult =
  | { ok: true }
  | { ok: false; error: string; status: number }

function formatDocumentLabel(digits: string): string {
  if (digits.length === 11) return formatCpfCnpj(digits)
  if (digits.length === 14) return formatCnpj(digits)
  return digits
}

async function hasLiticaProTrial(clientId: string, productId: string): Promise<boolean> {
  const contract = await findLiticaProContractByClientId(clientId, productId)
  return Boolean(contract?.id)
}

/** Impede novo teste grátis para CPF/CNPJ, e-mail ou CNPJs vinculados já utilizados. */
export async function assertLiticaProTrialEligible(input: {
  customer_type: "empresa" | "profissional_liberal"
  cpf_cnpj: string
  email?: string | null
  linked_cnpjs?: string[]
  excludeClientId?: string | null
  user_emails?: string[]
  user_cpfs?: string[]
}): Promise<TrialEligibilityResult> {
  const catalog = getProductBySlug("liticapro")
  if (!catalog) {
    return { ok: false, error: "Produto LicitaPregão não configurado.", status: 500 }
  }

  const product = await findOrCreateProductFromCatalog(catalog)
  const docDigits = String(input.cpf_cnpj ?? "").replace(/\D/g, "")
  const excludeClientId = input.excludeClientId ?? null

  if (docDigits.length === 11 || docDigits.length === 14) {
    const byDoc = await findClientByCpfCnpjDigits(docDigits, excludeClientId)
    if (byDoc && (await hasLiticaProTrial(byDoc.id, product.id))) {
      const label = input.customer_type === "profissional_liberal" ? "CPF" : "CNPJ"
      return {
        ok: false,
        error: `Este ${label} (${formatDocumentLabel(docDigits)}) já utilizou o teste grátis do LicitaPregão. Não é possível cadastrar novamente.`,
        status: 409,
      }
    }
  }

  const email = String(input.email ?? "").trim().toLowerCase()
  if (email) {
    const byEmail = await findClientByEmailNormalized(email, excludeClientId)
    if (byEmail && (await hasLiticaProTrial(byEmail.id, product.id))) {
      return {
        ok: false,
        error:
          "Este e-mail já está vinculado a um teste grátis do LicitaPregão. Não é possível cadastrar novamente.",
        status: 409,
      }
    }
  }

  const extraEmails = [...new Set((input.user_emails ?? []).map((e) => e.trim().toLowerCase()).filter(Boolean))]
  for (const userEmail of extraEmails) {
    const byEmail = await findClientByEmailNormalized(userEmail, excludeClientId)
    if (byEmail && (await hasLiticaProTrial(byEmail.id, product.id))) {
      return {
        ok: false,
        error: `O e-mail ${userEmail} já está vinculado a um teste grátis do LicitaPregão.`,
        status: 409,
      }
    }
  }

  const extraCpfs = [...new Set((input.user_cpfs ?? []).map((c) => c.replace(/\D/g, "")).filter((c) => c.length === 11))]
  for (const cpf of extraCpfs) {
    const byDoc = await findClientByCpfCnpjDigits(cpf, excludeClientId)
    if (byDoc && (await hasLiticaProTrial(byDoc.id, product.id))) {
      return {
        ok: false,
        error: `O CPF ${formatDocumentLabel(cpf)} já utilizou o teste grátis do LicitaPregão.`,
        status: 409,
      }
    }
  }

  const linkedCnpjs = [...new Set((input.linked_cnpjs ?? []).map((c) => c.replace(/\D/g, "")).filter((c) => c.length === 14))]
  for (const cnpj of linkedCnpjs) {
    const match = await findLiticaProTrialByLinkedCnpj(cnpj, excludeClientId)
    if (match) {
      return {
        ok: false,
        error: `O CNPJ ${formatCnpj(cnpj)} já foi utilizado em outro teste grátis (${match.client_name}). Não é possível cadastrar novamente.`,
        status: 409,
      }
    }
  }

  if (input.customer_type === "empresa" && docDigits.length === 14) {
    const match = await findLiticaProTrialByLinkedCnpj(docDigits, excludeClientId)
    if (match) {
      return {
        ok: false,
        error: `Este CNPJ (${formatCnpj(docDigits)}) já foi utilizado em outro teste grátis. Não é possível cadastrar novamente.`,
        status: 409,
      }
    }
  }

  return { ok: true }
}
