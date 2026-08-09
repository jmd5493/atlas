-- Child-first, and each drop table cascades: also removes that table's own
-- policies, trigger, and indexes, so those don't need separate statements.
drop table if exists public.workout_program_exercises cascade;
drop table if exists public.workout_program_days cascade;
drop table if exists public.workout_programs cascade;
