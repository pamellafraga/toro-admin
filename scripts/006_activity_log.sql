-- Activity Log table
create table if not exists public.activity_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  action text not null,
  entity_type text not null default '',
  entity_id uuid,
  details jsonb,
  created_at timestamptz not null default now()
);

alter table public.activity_log enable row level security;

create policy "activity_log_select" on public.activity_log for select using (true);
create policy "activity_log_insert" on public.activity_log for insert with check (true);
