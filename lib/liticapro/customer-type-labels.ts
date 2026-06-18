export type LiticaProCustomerType = "empresa" | "profissional_liberal"

/** Rótulos oficiais dos tipos de cadastro LicitaPregão. */
export const LITICAPRO_CUSTOMER_TYPE_LABEL: Record<LiticaProCustomerType, string> = {
  empresa: "EMPRESAS",
  profissional_liberal: "ASSESSORIA DE LICITAÇÃO",
}

export function liticaproCustomerTypeLabel(
  type: LiticaProCustomerType | string | null | undefined,
): string {
  if (type === "profissional_liberal") return LITICAPRO_CUSTOMER_TYPE_LABEL.profissional_liberal
  return LITICAPRO_CUSTOMER_TYPE_LABEL.empresa
}

export function liticaproCustomerTypeShortLabel(
  type: LiticaProCustomerType | string | null | undefined,
): string {
  return liticaproCustomerTypeLabel(type)
}
