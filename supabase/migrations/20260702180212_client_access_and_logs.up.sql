alter table public.clients
add column if not exists auth_user_id uuid references public.profiles (id) on delete set null;

create unique index if not exists clients_auth_user_id_unique_idx
on public.clients (auth_user_id)
where auth_user_id is not null;

drop policy if exists "Clients can view their linked client record" on public.clients;
create policy "Clients can view their linked client record"
on public.clients
for select
to authenticated
using (auth_user_id = auth.uid());

drop policy if exists "Clients can view assigned workout programs" on public.workout_programs;
create policy "Clients can view assigned workout programs"
on public.workout_programs
for select
to authenticated
using (
  exists (
    select 1
    from public.clients c
    where c.id = client_id
      and c.auth_user_id = auth.uid()
  )
);

drop policy if exists "Clients can view assigned workout program days" on public.workout_program_days;
create policy "Clients can view assigned workout program days"
on public.workout_program_days
for select
to authenticated
using (
  exists (
    select 1
    from public.workout_programs wp
    join public.clients c on c.id = wp.client_id
    where wp.id = workout_program_id
      and c.auth_user_id = auth.uid()
  )
);

drop policy if exists "Clients can view assigned workout program exercises" on public.workout_program_exercises;
create policy "Clients can view assigned workout program exercises"
on public.workout_program_exercises
for select
to authenticated
using (
  exists (
    select 1
    from public.workout_program_days wd
    join public.workout_programs wp on wp.id = wd.workout_program_id
    join public.clients c on c.id = wp.client_id
    where wd.id = workout_program_day_id
      and c.auth_user_id = auth.uid()
  )
);

create table if not exists public.exercise_logs (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid not null references public.profiles (id) on delete cascade,
  client_id uuid not null references public.clients (id) on delete cascade,
  workout_program_id uuid references public.workout_programs (id) on delete set null,
  exercise_name text not null,
  sets integer not null check (sets > 0),
  reps integer not null check (reps > 0),
  weight numeric,
  notes text,
  performed_on date not null,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists exercise_logs_trainer_id_idx
on public.exercise_logs (trainer_id);

create index if not exists exercise_logs_client_id_idx
on public.exercise_logs (client_id);

create index if not exists exercise_logs_performed_on_idx
on public.exercise_logs (performed_on desc);

drop trigger if exists set_exercise_logs_updated_at on public.exercise_logs;
create trigger set_exercise_logs_updated_at
before update on public.exercise_logs
for each row
execute function public.set_current_timestamp_updated_at();

alter table public.exercise_logs enable row level security;

drop policy if exists "Trainers can view their own exercise logs" on public.exercise_logs;
create policy "Trainers can view their own exercise logs"
on public.exercise_logs
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

drop policy if exists "Trainers can update their own exercise logs" on public.exercise_logs;
create policy "Trainers can update their own exercise logs"
on public.exercise_logs
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

drop policy if exists "Clients can view their own exercise logs" on public.exercise_logs;
create policy "Clients can view their own exercise logs"
on public.exercise_logs
for select
to authenticated
using (
  exists (
    select 1
    from public.clients c
    where c.id = client_id
      and c.auth_user_id = auth.uid()
  )
);

drop policy if exists "Clients can create their own exercise logs" on public.exercise_logs;
create policy "Clients can create their own exercise logs"
on public.exercise_logs
for insert
to authenticated
with check (
  exists (
    select 1
    from public.clients c
    where c.id = client_id
      and c.auth_user_id = auth.uid()
      and c.trainer_id = trainer_id
  )
);