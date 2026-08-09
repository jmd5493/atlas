create table if not exists public.workout_programs (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid not null references public.profiles (id) on delete cascade,
  client_id uuid not null references public.clients (id) on delete cascade,
  title text not null,
  description text,
  start_date date not null,
  duration_weeks integer not null default 4 check (duration_weeks > 0 and duration_weeks <= 52),
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists workout_programs_trainer_id_idx
on public.workout_programs (trainer_id);

create index if not exists workout_programs_client_id_idx
on public.workout_programs (client_id);

drop trigger if exists set_workout_programs_updated_at on public.workout_programs;
create trigger set_workout_programs_updated_at
before update on public.workout_programs
for each row
execute function public.set_current_timestamp_updated_at();

create table if not exists public.workout_program_days (
  id uuid primary key default gen_random_uuid(),
  workout_program_id uuid not null references public.workout_programs (id) on delete cascade,
  day_label text not null,
  sort_order integer not null check (sort_order > 0),
  created_at timestamptz not null default timezone('utc'::text, now()),
  unique (workout_program_id, sort_order)
);

create table if not exists public.workout_program_exercises (
  id uuid primary key default gen_random_uuid(),
  workout_program_day_id uuid not null references public.workout_program_days (id) on delete cascade,
  exercise_name text not null,
  sets integer not null check (sets > 0),
  reps integer not null check (reps > 0),
  target_weight numeric,
  notes text,
  sort_order integer not null check (sort_order > 0),
  created_at timestamptz not null default timezone('utc'::text, now()),
  unique (workout_program_day_id, sort_order)
);

alter table public.workout_programs enable row level security;
alter table public.workout_program_days enable row level security;
alter table public.workout_program_exercises enable row level security;

drop policy if exists "Trainers can view their own workout programs" on public.workout_programs;
create policy "Trainers can view their own workout programs"
on public.workout_programs
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

drop policy if exists "Trainers can create their own workout programs" on public.workout_programs;
create policy "Trainers can create their own workout programs"
on public.workout_programs
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

drop policy if exists "Trainers can update their own workout programs" on public.workout_programs;
create policy "Trainers can update their own workout programs"
on public.workout_programs
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

drop policy if exists "Trainers can view workout program days" on public.workout_program_days;
create policy "Trainers can view workout program days"
on public.workout_program_days
for select
to authenticated
using (
  exists (
    select 1
    from public.workout_programs wp
    join public.profiles p on p.id = auth.uid()
    where wp.id = workout_program_id
      and wp.trainer_id = auth.uid()
      and p.role = 'trainer'
  )
);

drop policy if exists "Trainers can create workout program days" on public.workout_program_days;
create policy "Trainers can create workout program days"
on public.workout_program_days
for insert
to authenticated
with check (
  exists (
    select 1
    from public.workout_programs wp
    join public.profiles p on p.id = auth.uid()
    where wp.id = workout_program_id
      and wp.trainer_id = auth.uid()
      and p.role = 'trainer'
  )
);

drop policy if exists "Trainers can update workout program days" on public.workout_program_days;
create policy "Trainers can update workout program days"
on public.workout_program_days
for update
to authenticated
using (
  exists (
    select 1
    from public.workout_programs wp
    join public.profiles p on p.id = auth.uid()
    where wp.id = workout_program_id
      and wp.trainer_id = auth.uid()
      and p.role = 'trainer'
  )
)
with check (
  exists (
    select 1
    from public.workout_programs wp
    join public.profiles p on p.id = auth.uid()
    where wp.id = workout_program_id
      and wp.trainer_id = auth.uid()
      and p.role = 'trainer'
  )
);

drop policy if exists "Trainers can view workout program exercises" on public.workout_program_exercises;
create policy "Trainers can view workout program exercises"
on public.workout_program_exercises
for select
to authenticated
using (
  exists (
    select 1
    from public.workout_program_days wd
    join public.workout_programs wp on wp.id = wd.workout_program_id
    join public.profiles p on p.id = auth.uid()
    where wd.id = workout_program_day_id
      and wp.trainer_id = auth.uid()
      and p.role = 'trainer'
  )
);

drop policy if exists "Trainers can create workout program exercises" on public.workout_program_exercises;
create policy "Trainers can create workout program exercises"
on public.workout_program_exercises
for insert
to authenticated
with check (
  exists (
    select 1
    from public.workout_program_days wd
    join public.workout_programs wp on wp.id = wd.workout_program_id
    join public.profiles p on p.id = auth.uid()
    where wd.id = workout_program_day_id
      and wp.trainer_id = auth.uid()
      and p.role = 'trainer'
  )
);

drop policy if exists "Trainers can update workout program exercises" on public.workout_program_exercises;
create policy "Trainers can update workout program exercises"
on public.workout_program_exercises
for update
to authenticated
using (
  exists (
    select 1
    from public.workout_program_days wd
    join public.workout_programs wp on wp.id = wd.workout_program_id
    join public.profiles p on p.id = auth.uid()
    where wd.id = workout_program_day_id
      and wp.trainer_id = auth.uid()
      and p.role = 'trainer'
  )
)
with check (
  exists (
    select 1
    from public.workout_program_days wd
    join public.workout_programs wp on wp.id = wd.workout_program_id
    join public.profiles p on p.id = auth.uid()
    where wd.id = workout_program_day_id
      and wp.trainer_id = auth.uid()
      and p.role = 'trainer'
  )
);