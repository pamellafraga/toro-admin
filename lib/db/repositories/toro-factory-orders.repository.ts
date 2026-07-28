import { randomUUID } from "crypto"
import { queryMany, queryOne } from "@/lib/db/pool"
import { incrementProductStockBySize } from "@/lib/db/repositories/toro-products.repository"

export type FactoryOrderStatus =
  | "encomendado"
  | "em_producao"
  | "a_caminho"
  | "recebido"
  | "cancelado"

export interface FactoryOrderRow {
  id: string
  product_slug: string
  product_name: string
  supplier_name: string
  stock_by_size: Record<string, number>
  quantity_total: number
  unit_cost: number | null
  total_cost: number | null
  ordered_at: string
  expected_at: string | null
  received_at: string | null
  status: FactoryOrderStatus
  stock_applied: boolean
  notes: string | null
  created_at: string
  updated_at: string
}

const SELECT_FIELDS = `
  id, product_slug, product_name, supplier_name, stock_by_size,
  quantity_total, unit_cost, total_cost,
  CAST(ordered_at AS CHAR) AS ordered_at,
  CAST(expected_at AS CHAR) AS expected_at,
  CAST(received_at AS CHAR) AS received_at,
  status, stock_applied, notes, created_at, updated_at
`

function parseStockBySize(raw: unknown): Record<string, number> {
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw) as Record<string, number>
    } catch {
      return {}
    }
  }
  if (raw && typeof raw === "object") return raw as Record<string, number>
  return {}
}

function sumStock(stockBySize: Record<string, number>): number {
  return Object.values(stockBySize).reduce((s, n) => s + (Number(n) || 0), 0)
}

function mapRow(row: FactoryOrderRow & { stock_by_size: unknown; stock_applied?: number | boolean }): FactoryOrderRow {
  return {
    ...row,
    stock_by_size: parseStockBySize(row.stock_by_size),
    quantity_total: Number(row.quantity_total),
    unit_cost: row.unit_cost != null ? Number(row.unit_cost) : null,
    total_cost: row.total_cost != null ? Number(row.total_cost) : null,
    stock_applied: Boolean(row.stock_applied),
  }
}

async function ensureFactoryOrdersTable(): Promise<void> {
  await queryOne(`
    CREATE TABLE IF NOT EXISTS toro_factory_orders (
      id CHAR(36) NOT NULL PRIMARY KEY,
      product_slug VARCHAR(100) NOT NULL,
      product_name VARCHAR(255) NOT NULL,
      supplier_name VARCHAR(255) NOT NULL,
      stock_by_size JSON NOT NULL,
      quantity_total INT NOT NULL DEFAULT 0,
      unit_cost DECIMAL(12,2) NULL,
      total_cost DECIMAL(12,2) NULL,
      ordered_at DATE NOT NULL,
      expected_at DATE NULL,
      received_at DATE NULL,
      status ENUM('encomendado', 'em_producao', 'a_caminho', 'recebido', 'cancelado') NOT NULL DEFAULT 'encomendado',
      stock_applied TINYINT(1) NOT NULL DEFAULT 0,
      notes TEXT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      KEY idx_factory_orders_status (status),
      KEY idx_factory_orders_product (product_slug)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `)
}

export async function listFactoryOrders(): Promise<FactoryOrderRow[]> {
  await ensureFactoryOrdersTable()
  const rows = await queryMany<FactoryOrderRow & { stock_by_size: unknown; stock_applied: number }>(
    `SELECT ${SELECT_FIELDS} FROM toro_factory_orders ORDER BY ordered_at DESC, created_at DESC LIMIT 500`,
  )
  return rows.map(mapRow)
}

export async function createFactoryOrder(input: {
  productSlug: string
  productName: string
  supplierName: string
  stockBySize: Record<string, number>
  unitCost?: number | null
  orderedAt: string
  expectedAt?: string | null
  status?: FactoryOrderStatus
  notes?: string | null
}): Promise<FactoryOrderRow> {
  await ensureFactoryOrdersTable()

  const supplierName = input.supplierName.trim()
  if (!supplierName) throw new Error("Informe a costureira ou fábrica.")
  if (!input.productSlug) throw new Error("Selecione o produto.")

  const stockBySize: Record<string, number> = {}
  for (const [size, qty] of Object.entries(input.stockBySize)) {
    const n = Number(qty)
    if (n > 0) stockBySize[size] = n
  }
  if (Object.keys(stockBySize).length === 0) {
    throw new Error("Informe a quantidade por tamanho.")
  }

  const quantityTotal = sumStock(stockBySize)
  const unitCost = input.unitCost != null && input.unitCost > 0 ? input.unitCost : null
  const totalCost = unitCost != null ? unitCost * quantityTotal : null
  const id = randomUUID()

  await queryOne(
    `INSERT INTO toro_factory_orders (
      id, product_slug, product_name, supplier_name, stock_by_size, quantity_total,
      unit_cost, total_cost, ordered_at, expected_at, status, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      input.productSlug,
      input.productName,
      supplierName,
      JSON.stringify(stockBySize),
      quantityTotal,
      unitCost,
      totalCost,
      input.orderedAt.slice(0, 10),
      input.expectedAt?.slice(0, 10) ?? null,
      input.status ?? "encomendado",
      input.notes?.trim() || null,
    ],
  )

  const row = await queryOne<FactoryOrderRow & { stock_by_size: unknown; stock_applied: number }>(
    `SELECT ${SELECT_FIELDS} FROM toro_factory_orders WHERE id = ?`,
    [id],
  )
  if (!row) throw new Error("Falha ao registrar encomenda.")
  return mapRow(row)
}

export async function updateFactoryOrder(
  id: string,
  input: Partial<{
    supplierName: string
    stockBySize: Record<string, number>
    unitCost: number | null
    orderedAt: string
    expectedAt: string | null
    receivedAt: string | null
    status: FactoryOrderStatus
    notes: string | null
    applyStock: boolean
  }>,
): Promise<FactoryOrderRow> {
  await ensureFactoryOrdersTable()

  const existing = await queryOne<FactoryOrderRow & { stock_by_size: unknown; stock_applied: number }>(
    `SELECT ${SELECT_FIELDS} FROM toro_factory_orders WHERE id = ?`,
    [id],
  )
  if (!existing) throw new Error("Encomenda não encontrada.")

  const current = mapRow(existing)
  let stockBySize = current.stock_by_size
  if (input.stockBySize) {
    stockBySize = {}
    for (const [size, qty] of Object.entries(input.stockBySize)) {
      const n = Number(qty)
      if (n > 0) stockBySize[size] = n
    }
  }

  const quantityTotal = sumStock(stockBySize)
  const unitCost = input.unitCost !== undefined ? input.unitCost : current.unit_cost
  const totalCost = unitCost != null && unitCost > 0 ? unitCost * quantityTotal : null
  const status = input.status ?? current.status
  const receivedAt =
    input.receivedAt !== undefined
      ? input.receivedAt
      : status === "recebido" && !current.received_at
        ? new Date().toISOString().slice(0, 10)
        : current.received_at

  let stockApplied = current.stock_applied
  if (input.applyStock && !stockApplied && (status === "recebido" || receivedAt)) {
    await incrementProductStockBySize(current.product_slug, stockBySize)
    stockApplied = true
  }

  await queryOne(
    `UPDATE toro_factory_orders SET
      supplier_name = COALESCE(?, supplier_name),
      stock_by_size = ?,
      quantity_total = ?,
      unit_cost = ?,
      total_cost = ?,
      ordered_at = COALESCE(?, ordered_at),
      expected_at = ?,
      received_at = ?,
      status = ?,
      stock_applied = ?,
      notes = COALESCE(?, notes)
     WHERE id = ?`,
    [
      input.supplierName?.trim() || null,
      JSON.stringify(stockBySize),
      quantityTotal,
      unitCost,
      totalCost,
      input.orderedAt?.slice(0, 10) ?? null,
      input.expectedAt !== undefined ? input.expectedAt?.slice(0, 10) ?? null : current.expected_at,
      receivedAt?.slice(0, 10) ?? null,
      status,
      stockApplied ? 1 : 0,
      input.notes !== undefined ? input.notes?.trim() || null : null,
      id,
    ],
  )

  const row = await queryOne<FactoryOrderRow & { stock_by_size: unknown; stock_applied: number }>(
    `SELECT ${SELECT_FIELDS} FROM toro_factory_orders WHERE id = ?`,
    [id],
  )
  if (!row) throw new Error("Encomenda não encontrada.")
  return mapRow(row)
}

export async function deleteFactoryOrder(id: string): Promise<void> {
  await ensureFactoryOrdersTable()
  await queryOne(`DELETE FROM toro_factory_orders WHERE id = ?`, [id])
}
