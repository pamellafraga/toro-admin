-- Chat Messages table
create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles(id) on delete cascade,
  message text not null,
  created_at timestamptz not null default now()
);

alter table public.chat_messages enable row level security;

create policy "chat_messages_select" on public.chat_messages for select using (true);
create policy "chat_messages_insert" on public.chat_messages for insert with check (true);

-- Enable realtime for chat
alter publication supabase_realtime add table public.chat_messages;
