import { isPlaceholderCpfCnpj } from "@/lib/clients/cpf-cnpj-display"

export type ClientCustomerType = "empresa" | "profissional_liberal"

export function resolveClientCustomerType(
  liticaproData?: { customer_type?: string } | null,
  cpfCnpj?: string | null,
): ClientCustomerType {
  const ct = liticaproData?.customer_type
  if (ct === "profissional_liberal" || ct === "empresa") return ct
  const digits = (cpfCnpj ?? "").replace(/\D/g, "")
  if (digits.length === 11 && !isPlaceholderCpfCnpj(cpfCnpj)) {
    return "profissional_liberal"
  }
  return "empresa"
}
