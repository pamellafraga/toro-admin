import { NextRequest } from "next/server"
import { isAuthenticated } from "@/lib/api/auth"
import { handleApiError, jsonError, jsonOk, jsonUnauthorized } from "@/lib/api/response"
import {
  computeStoreCustomerSegment,
  createManualStoreCustomer,
  listStoreCustomers,
} from "@/lib/db/repositories/toro-customers.repository"

export const dynamic = "force-dynamic"

/** GET /api/store-customers — clientes que compraram no site Toro */
export async function GET(request: NextRequest) {
  try {
    if (!isAuthenticated(request)) return jsonUnauthorized()

    const rows = await listStoreCustomers()
    const customers = rows.map((row) => ({
      ...row,
      segment: computeStoreCustomerSegment(row),
    }))

    return jsonOk({ customers })
  } catch (e) {
    const msg = e instanceof Error ? e.message : ""
    if (/toro_orders|relation .* does not exist/i.test(msg)) {
      return jsonOk({
        customers: [],
        warning: "Tabela de pedidos não encontrada. Execute scripts/036_toro_ecommerce.sql.",
      })
    }
    return handleApiError(e, "Erro ao listar clientes da loja.")
  }
}

/** POST /api/store-customers — cadastro manual de cliente */
export async function POST(request: NextRequest) {
  try {
    if (!isAuthenticated(request)) return jsonUnauthorized()

    const body = await request.json()
    const row = await createManualStoreCustomer({
      name: String(body.name ?? ""),
      email: body.email ? String(body.email) : null,
      phone: body.phone ? String(body.phone) : null,
      cpf_cnpj: body.cpf_cnpj ? String(body.cpf_cnpj) : null,
      zip_code: body.zip_code ? String(body.zip_code) : null,
      address: body.address ? String(body.address) : null,
      address_number: body.address_number ? String(body.address_number) : null,
      address_complement: body.address_complement ? String(body.address_complement) : null,
      district: body.district ? String(body.district) : null,
      city: body.city ? String(body.city) : null,
      state: body.state ? String(body.state) : null,
      notes: body.notes ? String(body.notes) : null,
    })

    return jsonOk({
      customer: {
        ...row,
        segment: computeStoreCustomerSegment(row),
      },
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro ao cadastrar cliente."
    if (/obrigatório|Informe|Já existe/i.test(msg)) {
      return jsonError(msg, 400)
    }
    return handleApiError(e, "Erro ao cadastrar cliente.")
  }
}
