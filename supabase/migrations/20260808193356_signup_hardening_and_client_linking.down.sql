-- WARNING: this restores the pre-hardening trigger, which reintroduces a
-- real security hole — supabase.auth.signUp()'s `options.data` object is
-- client-controlled input, and the version below lets a caller self-elevate
-- to 'trainer' by passing data.role = "trainer" directly to the public
-- signup API, bypassing this app's server action entirely. Only run this
-- down migration if you specifically intend to reopen that hole (e.g.
-- rolling back to debug something pre-009), not as a routine rollback.

create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)),
    coalesce((new.raw_user_meta_data ->> 'role')::public.user_role, 'client'::public.user_role)
  )
  on conflict (id) do nothing;

  return new;
end;
$$;
