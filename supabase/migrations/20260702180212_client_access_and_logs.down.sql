-- New table this migration created: drop table cascades, removes its own
-- policies/trigger/indexes too.
drop table if exists public.exercise_logs cascade;

-- Policies this migration added onto tables that already existed before it
-- (those tables aren't being dropped here, so their new policies need an
-- explicit drop rather than relying on cascade).
drop policy if exists "Clients can view assigned workout program exercises" on public.workout_program_exercises;
drop policy if exists "Clients can view assigned workout program days" on public.workout_program_days;
drop policy if exists "Clients can view assigned workout programs" on public.workout_programs;
drop policy if exists "Clients can view their linked client record" on public.clients;

drop index if exists public.clients_auth_user_id_unique_idx;

alter table public.clients
drop column if exists auth_user_id;
