import { formatCnpj } from "@/lib/format/br"

type LiticaProDataLike = {
  customer_type?: string
  linked_cnpjs?: Array<Record<string, unknown>>
} | null | undefined

export type PrimaryLinkedCompany = {
  razaoSocial: string
  cnpj: string
  cnpjFormatted: string
}

export function getPrimaryLinkedCompany(
  liticaproData: LiticaProDataLike,
): PrimaryLinkedCompany | null {
  if (liticaproData?.customer_type !== "profissional_liberal") return null
  const first = liticaproData.linked_cnpjs?.[0]
  if (!first) return null

  const cnpj = String(first.cnpj ?? "").replace(/\D/g, "")
  const razaoSocial = String(first.razao_social ?? "").trim()
  if (!razaoSocial && cnpj.length !== 14) return null

  return {
    razaoSocial: razaoSocial || "—",
    cnpj,
    cnpjFormatted: cnpj.length === 14 ? formatCnpj(cnpj) : "—",
  }
}

export function formatLinkedCompanyLine(company: PrimaryLinkedCompany | null): string {
  if (!company) return ""
  if (company.cnpjFormatted !== "—") {
    return `${company.razaoSocial} · ${company.cnpjFormatted}`
  }
  return company.razaoSocial
}

export function getLiticaProClientListSubtitle(
  client: {
    email?: string | null
    liticapro_data?: LiticaProDataLike
  } | null | undefined,
): string {
  if (!client) return ""

  const lp = client.liticapro_data
  if (lp?.customer_type === "profissional_liberal") {
    const linked = formatLinkedCompanyLine(getPrimaryLinkedCompany(lp))
    if (linked) return linked
  }

  if (lp?.customer_type === "empresa") {
    const responsible = String(lp.responsible_name ?? "").trim()
    if (responsible) return responsible
  }

  return client.email || ""
}
