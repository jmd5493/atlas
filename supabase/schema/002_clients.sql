create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid not null references public.profiles (id) on delete cascade,
  first_name text not null,
  last_name text not null,
  email text,
  notes text,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists clients_trainer_id_idx on public.clients (trainer_id);

drop trigger if exists set_clients_updated_at on public.clients;
create trigger set_clients_updated_at
before update on public.clients
for each row
execute function public.set_current_timestamp_updated_at();

alter table public.clients enable row level security;

drop policy if exists "Trainers can view their own clients" on public.clients;
create policy "Trainers can view their own clients"
on public.clients
for select
to authenticated
using (
  trainer_id = auth.uid()
  and exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'trainer'
  )
);

drop policy if exists "Trainers can create their own clients" on public.clients;
create policy "Trainers can create their own clients"
on public.clients
for insert
to authenticated
with check (
  trainer_id = auth.uid()
  and exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'trainer'
  )
);

drop policy if exists "Trainers can update their own clients" on public.clients;
create policy "Trainers can update their own clients"
on public.clients
for update
to authenticated
using (
  trainer_id = auth.uid()
  and exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'trainer'
  )
)
with check (
  trainer_id = auth.uid()
  and exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'trainer'
  )
);