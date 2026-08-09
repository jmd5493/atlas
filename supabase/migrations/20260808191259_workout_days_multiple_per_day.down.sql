alter table public.workout_program_days
drop constraint if exists workout_program_days_program_day_sort_key;

-- NOTE: this can fail on real data. Post-migration, sort_order is scoped
-- "within a day," so two different day_numbers in the same program can
-- legally share a sort_order (e.g. two "workout 1"s on different days) --
-- exactly the case this migration exists to allow. Re-adding the old
-- program-wide unique(workout_program_id, sort_order) constraint will
-- reject that data if it exists. That's an inherent risk of undoing a real
-- model change, not a bug in this file — check for conflicts before running
-- this down in an environment with real multi-workout-per-day data.
alter table public.workout_program_days
add constraint workout_program_days_workout_program_id_sort_order_key
unique (workout_program_id, sort_order);

alter table public.workout_program_days
drop constraint if exists workout_program_days_day_number_check;

alter table public.workout_program_days
drop column if exists day_number;
