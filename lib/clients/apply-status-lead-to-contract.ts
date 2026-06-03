import { statusLeadToContractStatus } from "@/lib/clients/status-lead-contract-sync"
import {
  insertContract,
  updateLatestContractStatusByClientId,
} from "@/lib/db/repositories/contracts.repository"
import { findOrCreateProductFromCatalog } from "@/lib/db/repositories/products.repository"
import { getProductBySlug } from "@/lib/products/catalog"
import { queryMany } from "@/lib/db/pool"

/**
 * Contratando (Contatos) → aguardando_produto (Produtos).
 * Atualiza o contrato mais recente; se não existir, cria um LiticaPro em aguardando.
 */
export async function applyStatusLeadToContracts(
  clientId: string,
  statusLead: string | null | undefined,
): Promise<void> {
  const contractStatus = statusLeadToContractStatus(statusLead)
  if (!contractStatus) return

  const updated = await updateLatestContractStatusByClientId(clientId, contractStatus)
  if (updated) return

  const catalog = getProductBySlug("liticapro")
  if (!catalog) return

  const product = await findOrCreateProductFromCatalog(catalog)
  const today = new Date().toISOString().slice(0, 10)

  await insertContract({
    client_id: clientId,
    product_id: product.id,
    status: contractStatus,
    payment_status: "pendente",
    start_date: today,
    monthly_value: 0,
    notes: "Vínculo Contratando → Aguardando produto",
    origem_comercial: null,
  })
}

/** Contatos já em Contratando sem contrato em aguardando — corrige contagem em Produtos. */
export async function backfillContratandoAguardandoProduto(): Promise<number> {
  const rows = await queryMany<{ id: string }>(
    `SELECT c.id
     FROM clients c
     WHERE lower(trim(coalesce(c.status_lead, ''))) = 'contratando'
       AND NOT EXISTS (
         SELECT 1 FROM contracts ct
         WHERE ct.client_id = c.id
           AND lower(trim(ct.status)) = 'aguardando_produto'
       )`,
  )

  for (const row of rows) {
    await applyStatusLeadToContracts(row.id, "contratando")
  }
  return rows.length
}
