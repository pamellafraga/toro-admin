import { NextRequest } from "next/server"
import { isAuthenticated } from "@/lib/api/auth"
import { handleApiError, jsonOk, jsonUnauthorized } from "@/lib/api/response"
import {
  computeStoreCustomerSegment,
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
