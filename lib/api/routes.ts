/**
 * Mapa organizado de todas as rotas da API.
 * Agrupadas por domínio — handlers em app/api/<grupo>/route.ts
 * Dados via lib/db/repositories/* (PostgreSQL Locaweb).
 */
export const API_ROUTES = {
  auth: {
    login: { method: "POST", path: "/api/login", auth: "public", desc: "Login com dashboard_users" },
    logout: { method: "POST", path: "/api/logout", auth: "public", desc: "Encerra sessão (cookie)" },
    forgotPassword: { method: "POST", path: "/api/auth/forgot-password", auth: "public", desc: "Envia código por e-mail" },
    resetPassword: { method: "POST", path: "/api/auth/reset-password", auth: "public", desc: "Redefine senha com código" },
  },
  users: {
    list: { method: "GET", path: "/api/users", auth: "admin", desc: "Lista usuários do dashboard" },
    create: { method: "POST", path: "/api/users", auth: "admin", desc: "Cadastra usuário" },
    update: { method: "PATCH", path: "/api/users/:id", auth: "admin", desc: "Edita usuário" },
    remove: { method: "DELETE", path: "/api/users/:id", auth: "admin", desc: "Remove usuário" },
  },
  admin: {
    credentials: {
      list: { method: "GET", path: "/api/admin/credentials", auth: "admin", desc: "Lista credenciais de sistemas" },
      save: { method: "POST", path: "/api/admin/credentials", auth: "admin", desc: "Cria/atualiza credencial" },
      remove: { method: "DELETE", path: "/api/admin/credentials", auth: "admin", desc: "Remove credencial" },
    },
  },
  clients: {
    search: { method: "GET", path: "/api/clients/search", auth: "session", desc: "Busca cliente por nome" },
  },
  contracts: {
    register: { method: "POST", path: "/api/contracts/register", auth: "session", desc: "Registra assinatura/contrato" },
  },
  products: {
    updateStatus: { method: "PATCH", path: "/api/products/:slug", auth: "admin", desc: "Altera status do produto" },
    listContracts: { method: "GET", path: "/api/products/:slug/contracts", auth: "session", desc: "Contratos do produto" },
  },
  nfe: {
    listDocuments: { method: "GET", path: "/api/nfe/documents", auth: "admin", desc: "Lista NF-e e contratos" },
    issue: { method: "POST", path: "/api/nfe/issue", auth: "admin", desc: "Emite NF-e/NFS-e" },
    updateDocument: { method: "PATCH", path: "/api/nfe/documents/:id", auth: "admin", desc: "Cancela NF-e" },
    deleteDocument: { method: "DELETE", path: "/api/nfe/documents/:id", auth: "admin", desc: "Exclui NF-e" },
    viewPdf: { method: "GET", path: "/api/nfe/documents/:id/view", auth: "admin", desc: "Visualiza PDF" },
  },
  chamados: {
    list: { method: "GET", path: "/api/chamados", auth: "chamados", desc: "Lista chamados (Pamella)" },
    create: { method: "POST", path: "/api/chamados", auth: "token", desc: "Abre chamado (ferramenta externa)" },
    update: { method: "PATCH", path: "/api/chamados/:id", auth: "chamados", desc: "Atualiza status" },
  },
  activity: {
    log: { method: "POST", path: "/api/activity/log", auth: "session", desc: "Registra atividade" },
  },
  geo: {
    cep: { method: "GET", path: "/api/geo/cep", auth: "public", desc: "Consulta ViaCEP" },
    cityToUf: { method: "GET", path: "/api/geo/city-to-uf", auth: "public", desc: "Consulta IBGE" },
  },
  tenant: {
    config: { method: "GET", path: "/api/tenant-config/:slug", auth: "token", desc: "Config multi-tenant (Apolicer)" },
  },
} as const

export type ApiRouteAuth = "public" | "session" | "admin" | "chamados" | "token"
