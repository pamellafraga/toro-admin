-- Histórico de atividades: quem fez a ação (adm ou comercial)
alter table public.activity_log
  add column if not exists user_name text;

comment on column public.activity_log.user_name is 'Nome do usuário que realizou a ação (ex: Pamella, Lisete, Stefanie)';
