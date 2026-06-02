import type { Client } from "@/lib/types"

type ClientRow = {
  id: string
  name: string
  email: string | null
  phone: string | null
  cpf_cnpj: string | null
  company: string | null
  address: string | null
  number?: string | null
  district?: string | null
  city: string | null
  state: string | null
  zip_code?: string | null
  origem_captacao?: string | null
  status_lead?: string | null
  created_at: string
  updated_at: string
}

export function mapClientRow(row: ClientRow): Client {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    cpf_cnpj: row.cpf_cnpj,
    company_name: row.company,
    address: row.address,
    number: row.number ?? null,
    district: row.district ?? null,
    city: row.city,
    state: row.state,
    zip_code: row.zip_code ?? null,
    notes: null,
    is_active: true,
    origem_captacao: row.origem_captacao ?? null,
    status_lead: row.status_lead ?? null,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
}
