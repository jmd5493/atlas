drop policy if exists "Trainers can delete their own workout programs" on public.workout_programs;
create policy "Trainers can delete their own workout programs"
on public.workout_programs
for delete
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

drop policy if exists "Trainers can delete workout program days" on public.workout_program_days;
create policy "Trainers can delete workout program days"
on public.workout_program_days
for delete
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

drop policy if exists "Trainers can delete workout program exercises" on public.workout_program_exercises;
create policy "Trainers can delete workout program exercises"
on public.workout_program_exercises
for delete
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