import { NextRequest } from "next/server"
import { isAuthenticated, parseAuthCookie } from "@/lib/api/auth"
import { handleApiError, jsonError, jsonOk, jsonUnauthorized } from "@/lib/api/response"
import { backfillContratandoAguardandoProduto } from "@/lib/clients/apply-status-lead-to-contract"
import { mapClientRow } from "@/lib/clients/map-client-row"
import {
  duplicateClientMessage,
  findDuplicateClient,
  hasClientIdentity,
} from "@/lib/clients/duplicate-check"
import { resolveComercialOrigemOnCreate } from "@/lib/clients/comercial-client-guard"
import {
  insertClient,
  listClientsForDashboard,
  type ClientesListView,
} from "@/lib/db/repositories/clients.repository"
import { LITICAPRO_CUSTOMER_TYPE_LABEL } from "@/lib/liticapro/customer-type-labels"

export const dynamic = "force-dynamic"

const VALID_VIEWS: ClientesListView[] = [
  "geral-todos",
  "geral",
  "stefanie",
  "xpress-solutions",
  "comercial-geral",
  "comercial-meu",
]

/** GET /api/clients?view=geral|stefanie|comercial-geral|comercial-meu */
export async function GET(req: NextRequest) {
  try {
    if (!isAuthenticated(req)) return jsonUnauthorized()

    const auth = parseAuthCookie(req)!
    const viewParam = req.nextUrl.searchParams.get("view") ?? "geral"
    const view = VALID_VIEWS.includes(viewParam as ClientesListView)
      ? (viewParam as ClientesListView)
      : "geral"

    if (view.startsWith("comercial-") && auth.role !== "comercial") {
      return jsonError("Visualização inválida.", 400)
    }
    if (
      (view === "geral-todos" ||
        view === "geral" ||
        view === "stefanie" ||
        view === "xpress-solutions") &&
      auth.role !== "admin"
    ) {
      return jsonError("Visualização inválida.", 400)
    }

    if (auth.role === "admin") {
      await backfillContratandoAguardandoProduto()
    }

    const rows = await listClientsForDashboard(view, auth.displayName)
    const contracts = await listPrimaryContractByClient()
    const contractByClient = new Map(contracts.map((c) => [c.client_id, c]))

    return jsonOk({
      clients: rows.map((row) => ({
        ...mapClientRow(row),
        primary_contract: contractByClient.get(row.id) ?? null,
      })),
    })
  } catch (err) {
    console.error("Erro em GET /api/clients:", err)
    return handleApiError(err, "Erro ao listar clientes.")
  }
}

/** POST /api/clients — cadastro manual na página Clientes */
export async function POST(req: NextRequest) {
  try {
    if (!isAuthenticated(req)) return jsonUnauthorized()

    const auth = parseAuthCookie(req)!
    const body = await req.json()
    const customerType = body.customer_type as string | undefined
    if (customerType !== "empresa" && customerType !== "profissional_liberal") {
      return jsonError(
        `Selecione ${LITICAPRO_CUSTOMER_TYPE_LABEL.empresa} ou ${LITICAPRO_CUSTOMER_TYPE_LABEL.profissional_liberal}.`,
        400,
      )
    }

    const name = String(body.name ?? "").trim()
    if (!name) return jsonError("Nome obrigatório.", 400)

    const cpfRaw = String(body.cpf_cnpj ?? "").trim()
    let cpfCnpj: string

    if (cpfRaw.startsWith("sem-cpf-")) {
      cpfCnpj = cpfRaw
    } else {
      cpfCnpj = cpfRaw.replace(/\D/g, "")
    }

    if (customerType === "profissional_liberal") {
      if (cpfCnpj.length === 11) {
        // CPF informado
      } else if (!cpfCnpj) {
        cpfCnpj = `sem-cpf-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
      } else {
        // CPF incompleto ou inválido — opcional: ignora e gera identificador interno
        cpfCnpj = `sem-cpf-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
      }
    } else if (cpfCnpj.length === 14) {
      // CNPJ informado
    } else if (!cpfCnpj) {
      cpfCnpj = `sem-cpf-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
    } else {
      return jsonError("CNPJ inválido.", 400)
    }

    const email = String(body.email ?? "").trim()
    const phone = String(body.phone ?? "").trim() || null

    if (!hasClientIdentity({ cpfCnpj: cpfCnpj, phone, email })) {
      return jsonError(
        "Informe CPF/CNPJ, telefone ou e-mail. Contatos precisam de um identificador único.",
        400,
      )
    }

    const duplicate = await findDuplicateClient({
      cpfCnpj: cpfCnpj,
      phone,
      email,
    })
    if (duplicate) {
      return jsonError(duplicateClientMessage(duplicate), 409)
    }

    let origemCaptacao: string | null = body.origem_captacao || null
    if (auth.role === "comercial" && auth.displayName) {
      const resolved = resolveComercialOrigemOnCreate(auth.displayName, origemCaptacao)
      if (!resolved.ok) return jsonError(resolved.error, 403)
      origemCaptacao = resolved.value
    }

    const inserted = await insertClient({
      name,
      email,
      phone,
      cpf_cnpj: cpfCnpj,
      company: customerType === "empresa" ? String(body.company ?? body.company_name ?? "").trim() || null : null,
      address: body.address ?? null,
      number: body.number ?? null,
      district: body.district ?? null,
      city: body.city ?? null,
      state: body.state ?? null,
      zip_code: body.zip_code ?? null,
      origem_captacao: origemCaptacao,
      status_lead: body.status_lead || null,
      liticapro_data: { customer_type: customerType },
    })

    return jsonOk({ id: inserted.id }, 201)
  } catch (err: unknown) {
    console.error("Erro em POST /api/clients:", err)
    const code = (err as { code?: string })?.code
    if (code === "23505") {
      return jsonError("Já existe um contato com este CPF/CNPJ.", 409)
    }
    return handleApiError(err, "Erro ao criar cliente.")
  }
}
