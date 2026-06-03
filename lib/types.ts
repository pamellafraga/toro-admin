export type UserRole = 'admin' | 'comercial' | 'marketing' | 'captacao' | 'financeiro' | 'custom'

export type Permission = 'home' | 'chamados' | 'produtos' | 'clientes' | 'seguradoras' | 'financeiro' | 'chat' | 'relatorios' | 'notificacoes' | 'atividades' | 'usuarios' | 'admin'

/** Chamados de suporte interno (ferramentas dos clientes → painel da TI). */
export type SupportTicketStatus = 'aberto' | 'em_andamento' | 'resolvido' | 'fechado'
export type SupportTicketPriority = 'baixa' | 'normal' | 'alta' | 'urgente'

export interface InternalSupportTicket {
  id: string
  created_at: string
  updated_at: string
  source_tool: string | null
  client_identifier: string | null
  client_email: string | null
  subject: string
  message: string
  status: SupportTicketStatus
  priority: SupportTicketPriority
  external_user_id: string | null
}

export interface Profile {
  id: string
  name: string
  email?: string
  role: UserRole
  is_active: boolean
  permissions: Permission[]
  avatar_url: string | null
  created_at: string
  updated_at: string
}

export interface Product {
  id: string
  name: string
  slug: string
  description: string | null
  icon: string
  monthly_price: number
  is_active: boolean
  created_at: string
}

export interface Client {
  id: string
  name: string
  email: string | null
  phone: string | null
  cpf_cnpj: string | null
  company_name: string | null
  address: string | null
  zip_code?: string | null
  city: string | null
  state: string | null
  district?: string | null
  number?: string | null
  notes: string | null
  is_active: boolean
  origem_captacao?: string | null
  status_lead?: string | null
  customer_type?: "empresa" | "profissional_liberal"
  liticapro_data?: { customer_type?: string } | null
  created_at: string
  updated_at: string
}

export interface Contract {
  id: string
  client_id: string
  product_id: string
  status: 'active' | 'inactive' | 'suspended' | 'cancelled'
  start_date: string
  end_date: string | null
  monthly_value: number
  payment_status: 'paid' | 'pending' | 'overdue'
  payment_day: number
  notes: string | null
  created_at: string
  updated_at: string
  origem_comercial?: string | null
  clients?: Client
  products?: Product
}

export interface Seguradora {
  id: string
  name: string
  cnpj: string | null
  phone: string | null
  email: string | null
  city: string | null
  state: string | null
  contact_status: 'pending' | 'in_progress' | 'contacted' | 'converted' | 'rejected'
  assigned_to: string | null
  assigned_name: string | null
  notes: string | null
  kanban_column: 'novo' | 'contatando' | 'negociando' | 'convertido' | 'perdido'
  created_at: string
  updated_at: string
}

export interface ActivityLog {
  id: string
  user_id: string | null
  user_name: string | null
  action: string
  entity_type: string | null
  entity_id: string | null
  /** JSONB no banco: pode vir como objeto ou string */
  details: Record<string, unknown> | string | null
  created_at: string
}

export interface Notification {
  id: string
  user_id: string | null
  title: string
  message: string
  type: 'info' | 'warning' | 'success' | 'error'
  is_read: boolean
  link: string | null
  created_at: string
}

export interface ChatMessage {
  id: string
  sender_id: string
  sender_name: string
  message: string
  channel: string
  created_at: string
}

export interface ProductStats {
  product: Product
  active_count: number
  inactive_count: number
  total_count: number
}

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Administrador',
  comercial: 'Comercial',
  marketing: 'Marketing',
  captacao: 'Captacao',
  financeiro: 'Financeiro',
  custom: 'Personalizado',
}

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  admin: ['home', 'produtos', 'clientes', 'seguradoras', 'financeiro', 'chat', 'relatorios', 'notificacoes', 'atividades', 'usuarios', 'admin'],
  comercial: ['home', 'produtos', 'clientes', 'chat'],
  marketing: ['home', 'seguradoras', 'chat', 'notificacoes'],
  captacao: ['home', 'seguradoras', 'clientes', 'chat', 'notificacoes'],
  financeiro: ['home', 'produtos', 'clientes', 'financeiro', 'relatorios', 'notificacoes'],
  custom: ['home'],
}

export const PERMISSION_LABELS: Record<Permission, string> = {
  home: 'Home',
  chamados: 'Chamados',
  produtos: 'Produtos',
  clientes: 'Contatos',
  seguradoras: 'Seguradoras',
  chat: 'Chat Interno',
  financeiro: 'Financeiro',
  relatorios: 'Relatorios',
  notificacoes: 'Notificacoes',
  atividades: 'Atividades',
  usuarios: 'Usuarios',
  admin: 'Admin',
}

export const KANBAN_COLUMNS = [
  { id: 'novo', label: 'Novo', color: 'bg-sky-500/20 text-sky-400 border-sky-500/30' },
  { id: 'contatando', label: 'Contatando', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
  { id: 'negociando', label: 'Negociando', color: 'bg-violet-500/20 text-violet-400 border-violet-500/30' },
  { id: 'convertido', label: 'Convertido', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
  { id: 'perdido', label: 'Perdido', color: 'bg-red-500/20 text-red-400 border-red-500/30' },
] as const
