import { getProductStatusBucket } from "@/lib/contracts/product-status-display"
import { normalizeStatusLead } from "@/lib/clients/status-lead"

export type ClientListFilterRow = {
  status_lead?: string | null
  name?: string | null
  cpf_cnpj?: string | null
  email?: string | null
  phone?: string | null
  primary_contract?: { status: string } | null
}

export function matchesClientSearch(client: ClientListFilterRow, search: string): boolean {
  const q = search.trim()
  if (!q) return true
  const lower = q.toLowerCase()
  return (
    (client.name || "").toLowerCase().includes(lower) ||
    (client.cpf_cnpj || "").includes(q) ||
    (client.email || "").toLowerCase().includes(lower) ||
    (client.phone || "").includes(q)
  )
}

/**
 * Filtro de status na listagem Contatos.
 * Contratando inclui aguardando_produto; Ativo inclui trial/contratado no produto.
 */
export function clientMatchesStatusFilter(
  client: ClientListFilterRow,
  filterTab: string,
): boolean {
  if (filterTab === "all") return true

  const lead = normalizeStatusLead(client.status_lead)
  const bucket = getProductStatusBucket(client.primary_contract?.status)

  if (filterTab === "contratando") {
    return lead === "contratando" || bucket === "aguardando_produto"
  }

  if (filterTab === "ativo") {
    return lead === "ativo" || bucket === "contratado" || bucket === "trial"
  }

  if (filterTab === "") {
    return !lead && bucket === "inativo"
  }

  return lead === filterTab
}

export function filterClientsForList<T extends ClientListFilterRow>(
  clients: T[],
  options: { search: string; filterTab: string; skipStatusFilter?: boolean },
): T[] {
  return clients.filter((client) => {
    if (!matchesClientSearch(client, options.search)) return false
    if (options.skipStatusFilter) return true
    return clientMatchesStatusFilter(client, options.filterTab)
  })
}

export function countClientsForStatusTab<T extends ClientListFilterRow>(
  clients: T[],
  filterTabId: string,
  search: string,
  skipStatusFilter?: boolean,
): number {
  if (filterTabId === "all" && !search.trim()) return clients.length
  return filterClientsForList(clients, {
    search,
    filterTab: filterTabId,
    skipStatusFilter,
  }).length
}
