drop policy if exists "Trainers can delete their own clients" on public.clients;
create policy "Trainers can delete their own clients"
on public.clients
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