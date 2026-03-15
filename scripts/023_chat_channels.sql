-- Canais do chat: Geral, Comercial e canais por contato (ex.: Roberto ↔ Stefanie)
alter table public.chat_messages
  add column if not exists channel text not null default 'general';

alter table public.chat_messages
  add column if not exists sender_name text;

-- Índice para listar mensagens por canal
create index if not exists idx_chat_messages_channel on public.chat_messages (channel);
create index if not exists idx_chat_messages_channel_created on public.chat_messages (channel, created_at);

-- Listar canais de contato (ex.: Roberto ↔ Stefanie) para a sidebar
create or replace function public.get_chat_contact_channels()
returns table (channel text)
language sql
stable
security definer
set search_path = public
as $$
  select distinct c.channel
  from public.chat_messages c
  where c.channel like 'contact:%'
  order by 1;
$$;
