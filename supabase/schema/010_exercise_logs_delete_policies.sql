-- exercise_logs had select/insert policies for clients and select/update for
-- trainers, but no delete policy for anyone — a typo'd log entry (wrong
-- weight, wrong day) had no way to be removed by either side. Adds delete
-- for both: a trainer deleting their own client's log, and a client (or a
-- self-tracking trainer, via the same auth_user_id-linked clients row)
-- deleting their own.

drop policy if exists "Trainers can delete their own exercise logs" on public.exercise_logs;
create policy "Trainers can delete their own exercise logs"
on public.exercise_logs
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

drop policy if exists "Clients can delete their own exercise logs" on public.exercise_logs;
create policy "Clients can delete their own exercise logs"
on public.exercise_logs
for delete
to authenticated
using (
  exists (
    select 1
    from public.clients c
    where c.id = client_id
      and c.auth_user_id = auth.uid()
  )
);
