import { randomUUID } from "crypto"
import { queryMany, queryOne } from "@/lib/db/pool"

export type StoreCustomerSegment = "comprou" | "pendente" | "recorrente" | "cancelado" | "novo"

export interface StoreCustomerRow {
  customer_key: string
  name: string | null
  email: string | null
  phone: string | null
  cpf_cnpj: string | null
  order_count: number
  paid_count: number
  total_spent: number
  last_order_at: string
  last_order_number: string | null
  last_order_status: string | null
  last_payment_status: string | null
  last_order_total: number
  source?: "checkout" | "manual"
  notes?: string | null
}

export interface ManualStoreCustomerInput {
  name: string
  email?: string | null
  phone?: string | null
  cpf_cnpj?: string | null
  notes?: string | null
}

export function computeStoreCustomerSegment(row: StoreCustomerRow): StoreCustomerSegment {
  if (row.paid_count >= 2) return "recorrente"
  if (row.paid_count >= 1) return "comprou"
  if (row.last_order_status === "cancelled" || row.last_payment_status === "rejected") return "cancelado"
  if (row.last_payment_status === "pending" || row.last_order_status === "pending_payment") return "pendente"
  return "novo"
}

function customerKeyFromFields(input: {
  email?: string | null
  cpf_cnpj?: string | null
  fallback: string
}): string {
  const email = input.email?.trim().toLowerCase()
  if (email) return email
  const cpf = input.cpf_cnpj?.replace(/\D/g, "")
  if (cpf) return cpf
  return input.fallback
}

function customerKey(order: {
  customer_email: string | null
  customer_cpf_cnpj: string | null
  order_number: string
}): string {
  return customerKeyFromFields({
    email: order.customer_email,
    cpf_cnpj: order.customer_cpf_cnpj,
    fallback: `pedido-${order.order_number}`,
  })
}

async function ensureManualCustomersTable(): Promise<void> {
  await queryOne(`
    CREATE TABLE IF NOT EXISTS toro_store_customers (
      id CHAR(36) NOT NULL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) NULL,
      phone VARCHAR(64) NULL,
      cpf_cnpj VARCHAR(32) NULL,
      notes TEXT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      KEY idx_toro_store_customers_email (email),
      KEY idx_toro_store_customers_phone (phone)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `)
}

async function listManualStoreCustomers(): Promise<StoreCustomerRow[]> {
  try {
    await ensureManualCustomersTable()
    const rows = await queryMany<{
      id: string
      name: string
      email: string | null
      phone: string | null
      cpf_cnpj: string | null
      notes: string | null
      created_at: string
    }>(`
      SELECT id, name, email, phone, cpf_cnpj, notes, created_at
      FROM toro_store_customers
      ORDER BY created_at DESC
      LIMIT 5000
    `)

    return rows.map((row) => ({
      customer_key: customerKeyFromFields({
        email: row.email,
        cpf_cnpj: row.cpf_cnpj,
        fallback: `manual-${row.id}`,
      }),
      name: row.name,
      email: row.email?.trim() || null,
      phone: row.phone?.trim() || null,
      cpf_cnpj: row.cpf_cnpj?.trim() || null,
      order_count: 0,
      paid_count: 0,
      total_spent: 0,
      last_order_at: row.created_at,
      last_order_number: null,
      last_order_status: null,
      last_payment_status: null,
      last_order_total: 0,
      source: "manual" as const,
      notes: row.notes,
    }))
  } catch {
    return []
  }
}

export async function createManualStoreCustomer(input: ManualStoreCustomerInput): Promise<StoreCustomerRow> {
  await ensureManualCustomersTable()

  const name = input.name.trim()
  if (!name) throw new Error("Nome é obrigatório.")

  const email = input.email?.trim() || null
  const phone = input.phone?.trim() || null
  const cpf_cnpj = input.cpf_cnpj?.trim() || null
  const notes = input.notes?.trim() || null

  if (!email && !phone && !cpf_cnpj) {
    throw new Error("Informe ao menos e-mail, telefone ou CPF/CNPJ.")
  }

  const cpfDigits = cpf_cnpj?.replace(/\D/g, "") || null

  if (email || cpfDigits) {
    const existingOrders = await queryOne<{ n: number }>(
      `SELECT COUNT(*) AS n FROM toro_orders
       WHERE (? IS NOT NULL AND LOWER(TRIM(customer_email)) = LOWER(?))
          OR (? IS NOT NULL AND REPLACE(REPLACE(REPLACE(COALESCE(customer_cpf_cnpj, ''), '.', ''), '-', ''), '/', '') = ?)`,
      [email, email, cpfDigits, cpfDigits],
    )
    if (Number(existingOrders?.n ?? 0) > 0) {
      throw new Error("Já existe um cliente com este e-mail ou CPF/CNPJ nos pedidos da loja.")
    }

    const existingManual = await queryOne<{ id: string }>(
      `SELECT id FROM toro_store_customers
       WHERE (? IS NOT NULL AND LOWER(TRIM(email)) = LOWER(?))
          OR (? IS NOT NULL AND REPLACE(REPLACE(REPLACE(COALESCE(cpf_cnpj, ''), '.', ''), '-', ''), '/', '') = ?)
       LIMIT 1`,
      [email, email, cpfDigits, cpfDigits],
    )
    if (existingManual) {
      throw new Error("Já existe um cliente manual com este e-mail ou CPF/CNPJ.")
    }
  }

  const id = randomUUID()
  await queryOne(
    `INSERT INTO toro_store_customers (id, name, email, phone, cpf_cnpj, notes)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [id, name, email, phone, cpf_cnpj, notes],
  )

  const row = await queryOne<{
    id: string
    name: string
    email: string | null
    phone: string | null
    cpf_cnpj: string | null
    notes: string | null
    created_at: string
  }>(
    `SELECT id, name, email, phone, cpf_cnpj, notes, created_at FROM toro_store_customers WHERE id = ?`,
    [id],
  )
  if (!row) throw new Error("Falha ao cadastrar cliente.")

  return {
    customer_key: customerKeyFromFields({
      email: row.email,
      cpf_cnpj: row.cpf_cnpj,
      fallback: `manual-${row.id}`,
    }),
    name: row.name,
    email: row.email,
    phone: row.phone,
    cpf_cnpj: row.cpf_cnpj,
    order_count: 0,
    paid_count: 0,
    total_spent: 0,
    last_order_at: row.created_at,
    last_order_number: null,
    last_order_status: null,
    last_payment_status: null,
    last_order_total: 0,
    source: "manual",
    notes: row.notes,
  }
}

export async function listStoreCustomers(): Promise<StoreCustomerRow[]> {
  let orders: {
    order_number: string
    customer_name: string | null
    customer_email: string | null
    customer_phone: string | null
    customer_cpf_cnpj: string | null
    payment_status: string
    order_status: string
    total: number
    created_at: string
  }[] = []

  try {
    orders = await queryMany(`
      SELECT order_number, customer_name, customer_email, customer_phone, customer_cpf_cnpj,
             payment_status, order_status, total, created_at
      FROM toro_orders
      ORDER BY created_at DESC
      LIMIT 5000
    `)
  } catch {
    orders = []
  }

  const map = new Map<string, StoreCustomerRow>()

  for (const o of orders) {
    const key = customerKey(o)
    let row = map.get(key)
    if (!row) {
      row = {
        customer_key: key,
        name: o.customer_name,
        email: o.customer_email?.trim() || null,
        phone: o.customer_phone?.trim() || null,
        cpf_cnpj: o.customer_cpf_cnpj?.trim() || null,
        order_count: 0,
        paid_count: 0,
        total_spent: 0,
        last_order_at: o.created_at,
        last_order_number: o.order_number,
        last_order_status: o.order_status,
        last_payment_status: o.payment_status,
        last_order_total: Number(o.total),
        source: "checkout",
      }
      map.set(key, row)
    }

    row.order_count += 1
    if (o.payment_status === "approved") {
      row.paid_count += 1
      row.total_spent += Number(o.total)
    }
    if (o.customer_name && !row.name) row.name = o.customer_name
    if (o.customer_email?.trim() && !row.email) row.email = o.customer_email.trim()
    if (o.customer_phone?.trim() && !row.phone) row.phone = o.customer_phone.trim()
    if (o.customer_cpf_cnpj?.trim() && !row.cpf_cnpj) row.cpf_cnpj = o.customer_cpf_cnpj.trim()
  }

  for (const manual of await listManualStoreCustomers()) {
    if (!map.has(manual.customer_key)) {
      map.set(manual.customer_key, manual)
    }
  }

  return Array.from(map.values()).sort((a, b) => (a.last_order_at < b.last_order_at ? 1 : -1))
}
