-- Two changes to the new-user trigger, both in support of public self-signup:
--
-- 1. SECURITY: role is now hard-coded to 'client' and never read from
--    raw_user_meta_data. supabase.auth.signUp() accepts an arbitrary `data`
--    object from the caller, which lands in raw_user_meta_data — that's
--    client-controlled input reachable by anyone with the public anon key,
--    not just through this app's UI. The previous version of this trigger
--    did `coalesce((raw_user_meta_data ->> 'role')::user_role, 'client')`,
--    which let any caller of the public signUp API self-elevate to
--    'trainer' by passing options.data.role = "trainer" directly, bypassing
--    the Next.js server action entirely. Trainer accounts must now be
--    provisioned out-of-band (a direct SQL update on profiles.role by
--    someone with DB access) — public signup can never create one.
--
-- 2. New-client auto-link: when a new auth user's email matches an existing
--    clients row that the trainer already created but hasn't linked yet
--    (auth_user_id is null), claim it for them. Runs inside this trigger
--    (security definer, already bypassing RLS for the profile insert) so no
--    new RLS policy or service-role key is needed to let a brand-new user
--    claim their own client record.

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
    'client'::public.user_role
  )
  on conflict (id) do nothing;

  if new.email is not null then
    update public.clients
    set auth_user_id = new.id
    where auth_user_id is null
      and email is not null
      and lower(email) = lower(new.email);
  end if;

  return new;
end;
$$;
