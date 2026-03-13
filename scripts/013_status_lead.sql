-- Etapa do lead/cliente: contratando, negociando, ativo, perdido (para abas coloridas)
alter table public.clients add column if not exists status_lead text default 'contratando';
