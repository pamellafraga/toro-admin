import { randomUUID } from "crypto"
import { query, queryMany, queryOne } from "@/lib/db/pool"

export type CompanyExpenseRow = {
  id: string
  name: string
  category: string
  currency: "usd" | "brl"
  value_usd: number
  value_brl: number
  due_date: number
  due_month: number | null
  billing_period: "mensal" | "anual" | "vitalicio"
  notes: string | null
  created_at?: string
  updated_at?: string
}

export type CompanyExpenseInput = Omit<CompanyExpenseRow, "created_at" | "updated_at"> & {
  id?: string
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const EXPENSE_SELECT = `
  SELECT id, name, category, currency,
         CAST(value_usd AS DECIMAL(12,2)) AS value_usd,
         CAST(value_brl AS DECIMAL(12,2)) AS value_brl,
         due_date, due_month, billing_period, notes,
         created_at, updated_at
  FROM company_expenses`

let schemaReady: Promise<void> | null = null

async function ensureCompanyExpensesSchema(): Promise<void> {
  if (!schemaReady) {
    schemaReady = (async () => {
      await query(`
        CREATE TABLE IF NOT EXISTS company_expenses (
          id CHAR(36) NOT NULL PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          category VARCHAR(255) NOT NULL,
          currency ENUM('usd', 'brl') NOT NULL DEFAULT 'usd',
          value_usd DECIMAL(12, 2) NOT NULL DEFAULT 0,
          value_brl DECIMAL(12, 2) NOT NULL DEFAULT 0,
          due_date INT NOT NULL DEFAULT 1,
          due_month INT NULL,
          billing_period ENUM('mensal', 'anual', 'vitalicio') NOT NULL DEFAULT 'mensal',
          notes TEXT NULL,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          KEY idx_company_expenses_category (category)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `)
    })().catch((err) => {
      schemaReady = null
      throw err
    })
  }
  await schemaReady
}

async function findExpenseById(id: string): Promise<CompanyExpenseRow | null> {
  return queryOne<CompanyExpenseRow>(`${EXPENSE_SELECT} WHERE id = ? LIMIT 1`, [id])
}

export async function listCompanyExpenses(): Promise<CompanyExpenseRow[]> {
  await ensureCompanyExpensesSchema()
  return queryMany<CompanyExpenseRow>(`${EXPENSE_SELECT} ORDER BY category, name`)
}

export async function upsertCompanyExpense(payload: CompanyExpenseInput): Promise<CompanyExpenseRow> {
  await ensureCompanyExpensesSchema()

  const hasValidId = payload.id && UUID_RE.test(payload.id)

  if (hasValidId) {
    const existing = await findExpenseById(payload.id!)
    if (existing) {
      await queryOne(
        `UPDATE company_expenses
         SET name = ?, category = ?, currency = ?,
             value_usd = ?, value_brl = ?,
             due_date = ?, due_month = ?, billing_period = ?, notes = ?
         WHERE id = ?`,
        [
          payload.name,
          payload.category,
          payload.currency,
          payload.value_usd,
          payload.value_brl,
          payload.due_date,
          payload.due_month,
          payload.billing_period,
          payload.notes,
          payload.id,
        ],
      )
      const row = await findExpenseById(payload.id!)
      if (!row) throw new Error("Gasto não encontrado.")
      return row
    }

    await queryOne(
      `INSERT INTO company_expenses
         (id, name, category, currency, value_usd, value_brl, due_date, due_month, billing_period, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        payload.id,
        payload.name,
        payload.category,
        payload.currency,
        payload.value_usd,
        payload.value_brl,
        payload.due_date,
        payload.due_month,
        payload.billing_period,
        payload.notes,
      ],
    )
    const row = await findExpenseById(payload.id!)
    if (!row) throw new Error("Erro ao criar gasto.")
    return row
  }

  const id = randomUUID()
  await queryOne(
    `INSERT INTO company_expenses
       (id, name, category, currency, value_usd, value_brl, due_date, due_month, billing_period, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      payload.name,
      payload.category,
      payload.currency,
      payload.value_usd,
      payload.value_brl,
      payload.due_date,
      payload.due_month,
      payload.billing_period,
      payload.notes,
    ],
  )
  const row = await findExpenseById(id)
  if (!row) throw new Error("Erro ao criar gasto.")
  return row
}

export async function deleteCompanyExpense(id: string): Promise<void> {
  await ensureCompanyExpensesSchema()
  await queryOne(`DELETE FROM company_expenses WHERE id = ?`, [id])
}
