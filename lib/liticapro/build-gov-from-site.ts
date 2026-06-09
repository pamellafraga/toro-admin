import type { CnpjGovData } from "@/lib/liticapro/types"

type SiteCnae = {
  codigo?: string | number
  descricao?: string
  principal?: boolean
}

type SiteLinkedCompany = {
  cnpj?: string
  razao_social?: string
  razaoSocial?: string
  ramo_atuacao?: string
  cnaes?: SiteCnae[]
}

function normalizeCnaeCodigo(codigo: string | number | undefined): number {
  const digits = String(codigo ?? "").replace(/\D/g, "")
  return digits ? Number(digits.padStart(7, "0").slice(0, 7)) : 0
}

export function buildGovFromSiteLinkedCompany(item: SiteLinkedCompany): CnpjGovData | null {
  const cnpj = String(item.cnpj ?? "").replace(/\D/g, "")
  const razaoSocial = String(item.razao_social ?? item.razaoSocial ?? "").trim()
  const cnaes = Array.isArray(item.cnaes) ? item.cnaes : []

  if (!cnpj || !razaoSocial) return null

  const principal = cnaes.find((cnae) => cnae.principal) ?? cnaes[0]
  const secundarios = cnaes.filter((cnae) => cnae !== principal)

  return {
    cnpj,
    razao_social: razaoSocial,
    nome_fantasia: null,
    logradouro: null,
    numero: null,
    bairro: null,
    municipio: null,
    uf: null,
    cep: null,
    cnae_fiscal: principal ? normalizeCnaeCodigo(principal.codigo) : null,
    cnae_fiscal_descricao: principal?.descricao?.trim() || null,
    cnaes_secundarios: secundarios
      .filter((cnae) => cnae.codigo || cnae.descricao)
      .map((cnae) => ({
        codigo: normalizeCnaeCodigo(cnae.codigo),
        descricao: String(cnae.descricao ?? "").trim(),
      })),
    descricao_situacao_cadastral: null,
  }
}
