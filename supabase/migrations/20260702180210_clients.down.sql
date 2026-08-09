-- drop table cascades: also removes clients' own policies, trigger, and
-- index, so those don't need separate drop statements here.
drop table if exists public.clients cascade;
