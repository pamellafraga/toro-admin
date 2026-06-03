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

let schemaReady: Promise<void> | null = null

async function ensureCompanyExpensesSchema(): Promise<void> {
  if (!schemaReady) {
    schemaReady = (async () => {
      await query(`
        CREATE TABLE IF NOT EXISTS company_expenses (
          id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name           TEXT NOT NULL,
          category       TEXT NOT NULL,
          currency       TEXT NOT NULL DEFAULT 'usd' CHECK (currency IN ('usd', 'brl')),
          value_usd      NUMERIC(12, 2) NOT NULL DEFAULT 0,
          value_brl      NUMERIC(12, 2) NOT NULL DEFAULT 0,
          due_date       INTEGER NOT NULL DEFAULT 1,
          due_month      INTEGER CHECK (due_month IS NULL OR (due_month >= 1 AND due_month <= 12)),
          billing_period TEXT NOT NULL DEFAULT 'mensal'
            CHECK (billing_period IN ('mensal', 'anual', 'vitalicio')),
          notes          TEXT,
          created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
          updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
        )
      `)
      await query(`
        CREATE INDEX IF NOT EXISTS idx_company_expenses_category ON company_expenses (category)
      `)
    })().catch((err) => {
      schemaReady = null
      throw err
    })
  }
  await schemaReady
}

export async function listCompanyExpenses(): Promise<CompanyExpenseRow[]> {
  await ensureCompanyExpensesSchema()
  return queryMany<CompanyExpenseRow>(
    `SELECT id, name, category, currency,
            value_usd::float8 AS value_usd,
            value_brl::float8 AS value_brl,
            due_date, due_month, billing_period, notes,
            created_at, updated_at
     FROM company_expenses
     ORDER BY category, name`,
  )
}

export async function upsertCompanyExpense(payload: CompanyExpenseInput): Promise<CompanyExpenseRow> {
  await ensureCompanyExpensesSchema()

  const hasValidId = payload.id && UUID_RE.test(payload.id)

  if (hasValidId) {
    const row = await queryOne<CompanyExpenseRow>(
      `UPDATE company_expenses
       SET name = $1, category = $2, currency = $3,
           value_usd = $4, value_brl = $5,
           due_date = $6, due_month = $7, billing_period = $8, notes = $9,
           updated_at = now()
       WHERE id = $10
       RETURNING id, name, category, currency,
                 value_usd::float8 AS value_usd,
                 value_brl::float8 AS value_brl,
                 due_date, due_month, billing_period, notes,
                 created_at, updated_at`,
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
    if (!row) throw new Error("Gasto não encontrado.")
    return row
  }

  const row = await queryOne<CompanyExpenseRow>(
    `INSERT INTO company_expenses
       (name, category, currency, value_usd, value_brl, due_date, due_month, billing_period, notes)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING id, name, category, currency,
               value_usd::float8 AS value_usd,
               value_brl::float8 AS value_brl,
               due_date, due_month, billing_period, notes,
               created_at, updated_at`,
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
    ],
  )
  if (!row) throw new Error("Erro ao criar gasto.")
  return row
}

export async function deleteCompanyExpense(id: string): Promise<void> {
  await ensureCompanyExpensesSchema()
  await queryOne(`DELETE FROM company_expenses WHERE id = $1`, [id])
}
