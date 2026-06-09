import { buildGovFromSiteLinkedCompany } from "@/lib/liticapro/build-gov-from-site"
import { fetchCnpjFromGov } from "@/lib/liticapro/cnpj-lookup"
import type { CnpjGovData } from "@/lib/liticapro/types"

type LinkedCnpjLike = Record<string, unknown>

function hasGovCnaes(item: LinkedCnpjLike): boolean {
  return Boolean(
    item.cnae_fiscal ||
      item.cnae_fiscal_descricao ||
      (Array.isArray(item.cnaes_secundarios) && item.cnaes_secundarios.length > 0),
  )
}

/** Garante CNAEs da Receita (ou do cadastro do site) em cada CNPJ vinculado. */
export async function enrichLinkedCnpjs(
  items: LinkedCnpjLike[],
): Promise<Array<LinkedCnpjLike & Partial<CnpjGovData>>> {
  return Promise.all(
    items.map(async (item) => {
      if (hasGovCnaes(item)) {
        return item as LinkedCnpjLike & Partial<CnpjGovData>
      }

      const cnpj = String(item.cnpj ?? "").replace(/\D/g, "")
      if (cnpj.length === 14) {
        const gov = await fetchCnpjFromGov(cnpj)
        if (gov) {
          return {
            ...gov,
            razao_social: String(item.razao_social ?? gov.razao_social ?? "").trim() || gov.razao_social,
            ramo_atuacao: String(item.ramo_atuacao ?? "").trim() || undefined,
          }
        }
      }

      const fromSite = buildGovFromSiteLinkedCompany(
        item as Parameters<typeof buildGovFromSiteLinkedCompany>[0],
      )
      if (fromSite) {
        return {
          ...fromSite,
          ramo_atuacao: String(item.ramo_atuacao ?? "").trim() || undefined,
        }
      }

      return item
    }),
  )
}
