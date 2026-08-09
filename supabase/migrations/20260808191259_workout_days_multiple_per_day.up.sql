-- Lets a single calendar day (1-7) hold more than one workout block.
-- Previously sort_order doubled as "which day is this" (1, 2, 3...) with a
-- one-workout-per-day assumption baked in via unique(workout_program_id, sort_order).
-- day_number now owns "which day", sort_order becomes "order of this workout
-- within that day", so multiple workouts can share the same day_number.

alter table public.workout_program_days
add column if not exists day_number integer;

update public.workout_program_days
set day_number = sort_order
where day_number is null;

alter table public.workout_program_days
alter column day_number set not null;

alter table public.workout_program_days
drop constraint if exists workout_program_days_day_number_check;

alter table public.workout_program_days
add constraint workout_program_days_day_number_check check (day_number between 1 and 7);

alter table public.workout_program_days
drop constraint if exists workout_program_days_workout_program_id_sort_order_key;

alter table public.workout_program_days
add constraint workout_program_days_program_day_sort_key
unique (workout_program_id, day_number, sort_order);
