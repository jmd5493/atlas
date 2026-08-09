drop trigger if exists on_auth_user_created_profile on auth.users;
drop function if exists public.handle_new_user_profile();

-- drop table cascades: also removes profiles' own policies, trigger, and
-- indexes, so those don't need separate drop statements here.
drop table if exists public.profiles cascade;

-- Safe only because every other table's trigger that used this function has
-- already been dropped by this point (their down migrations run first, in
-- reverse order, before this one).
drop function if exists public.set_current_timestamp_updated_at();

drop type if exists public.user_role;
