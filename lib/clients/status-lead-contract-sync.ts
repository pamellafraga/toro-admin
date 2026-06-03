/**
 * Vínculo interno Contato (status_lead) ↔ Produtos (contracts.status).
 * Rótulos na UI permanecem: "Contratando" em Contatos e "Aguardando produto" em Produtos.
 */

/** status_lead do contato → status do contrato em Produtos */
export function statusLeadToContractStatus(statusLead: string | null | undefined): string | null {
  const s = String(statusLead ?? "").trim()
  if (s === "contratando") return "aguardando_produto"
  return null
}

/** status do contrato em Produtos → status_lead do contato */
export function contractStatusToStatusLead(contractStatus: string | null | undefined): string | null {
  const t = String(contractStatus ?? "").toLowerCase().trim()
  if (t === "aguardando_produto") return "contratando"
  return null
}

export function shouldSyncContractFromStatusLead(statusLead: string | null | undefined): boolean {
  return statusLeadToContractStatus(statusLead) !== null
}

export function shouldSyncStatusLeadFromContract(contractStatus: string | null | undefined): boolean {
  return contractStatusToStatusLead(contractStatus) !== null
}
