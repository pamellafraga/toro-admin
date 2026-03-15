-- Esqueci minha senha: identificar por usuário (não expor e-mail na tela)
alter table public.password_reset_codes
  add column if not exists username text;

create index if not exists idx_password_reset_codes_username on public.password_reset_codes (username);

comment on column public.password_reset_codes.username is 'Login do usuário que solicitou o código (busca por usuário, e-mail só interno).';
