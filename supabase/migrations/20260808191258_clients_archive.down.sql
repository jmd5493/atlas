drop index if exists public.clients_trainer_id_active_idx;

alter table public.clients
drop column if exists archived_at;
