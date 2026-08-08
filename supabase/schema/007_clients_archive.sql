alter table public.clients
add column if not exists archived_at timestamptz;

create index if not exists clients_trainer_id_active_idx
on public.clients (trainer_id)
where archived_at is null;
