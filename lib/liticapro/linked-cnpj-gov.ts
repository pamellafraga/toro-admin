import { buildGovFromSiteLinkedCompany } from "@/lib/liticapro/build-gov-from-site"
import type { CnpjGovData } from "@/lib/liticapro/types"

/** Converte um item de linked_cnpjs (admin) em dados gov para exibição de CNAEs. */
export function linkedCnpjRecordToGov(item: Record<string, unknown>): CnpjGovData | null {
  if (
    item.cnae_fiscal ||
    item.cnae_fiscal_descricao ||
    (Array.isArray(item.cnaes_secundarios) && item.cnaes_secundarios.length > 0)
  ) {
    return item as CnpjGovData
  }

  return buildGovFromSiteLinkedCompany(
    item as Parameters<typeof buildGovFromSiteLinkedCompany>[0],
  )
}
