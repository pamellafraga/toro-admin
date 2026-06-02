import type { CnpjGovData } from "@/lib/liticapro/types"

export interface CnaeEntry {
  codigo: number
  descricao: string
  tipo: "principal" | "secundario"
}

export function getCnaeEntries(gov: CnpjGovData | null | undefined): CnaeEntry[] {
  if (!gov) return []
  const entries: CnaeEntry[] = []
  if (gov.cnae_fiscal || gov.cnae_fiscal_descricao) {
    entries.push({
      codigo: gov.cnae_fiscal ?? 0,
      descricao: gov.cnae_fiscal_descricao ?? "",
      tipo: "principal",
    })
  }
  for (const c of gov.cnaes_secundarios ?? []) {
    if (!c.descricao && !c.codigo) continue
    entries.push({ codigo: c.codigo, descricao: c.descricao, tipo: "secundario" })
  }
  return entries
}
