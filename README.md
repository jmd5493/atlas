# Atlas

Atlas is a web-based fitness coaching platform for a trainer and their clients.
This repository is being built as a simple MVP first, with enough structure to
support later Docker, deployment, monitoring, and Kubernetes work.

## MVP scope

- Authentication and login
- Trainer-managed clients
- Workout program creation
- Workout assignment to clients
- Client exercise logging
- Client workout history
- Trainer review of client workout logs

## Current stack

- Next.js with TypeScript
- Tailwind CSS
- App Router with mobile-first UI
- Supabase for authentication and Postgres

## Recommended folder layout

```text
src/
  app/
    (auth)/
    (dashboard)/
    (public)/
    globals.css
    layout.tsx
    page.tsx
  components/
    ui/
  lib/
    auth/
    supabase/
    programs/
```

## Development

Run the local dev server:

```bash
npm run dev
```

Run linting:

```bash
npm run lint
```

## Testing

Unit tests (pure logic, no server/browser needed):

```bash
npm run test:unit          # single run
npm run test:unit:watch    # watch mode
```

End-to-end tests (Playwright, drives a real browser against a running dev
server and the real dev Supabase project):

```bash
cp .env.test.example .env.test.local   # fill in the trainer/client test accounts
npm run test:e2e
```

The e2e suite reuses two real accounts in the dev Supabase project — one
`trainer`-role account and one `client`-role account already linked to a
`clients` row — rather than a fully isolated test database. It creates and
cleans up its own clients/programs/logs under clearly `E2E`-tagged names, but
two things are worth knowing:

- The self-tracking test (`e2e/self-tracking.spec.ts`) permanently claims the
  trainer account's one self-link slot (`clients_auth_user_id_unique_idx`
  allows exactly one) with a client named `Trainer Self E2E …` — this is
  intentional and reused across runs, not cleaned up, since there's no
  delete-client action to free the slot afterward (archive doesn't clear
  `auth_user_id`).
- Real `auth.signUp()` and the email-confirmation flow are *not* exercised
  live — Supabase's mailer has a low rate limit shared across the whole
  project, and every real signup burns from it. That mechanism (role
  hardening + email-based client linking) is instead verified by inserting
  directly into `auth.users` and checking the resulting `profiles`/`clients`
  rows, which is a more precise test of the DB trigger anyway.

`npm test` runs both suites in order.

## Supabase setup

Create local environment values from your Supabase project:

```bash
cp .env.example .env.local
```

Required variables:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## First auth flow

- `GET /login`: email and password sign-in form
- `POST` via server action: Supabase password sign-in
- `GET /dashboard`: protected by a server-side session check
- `POST` via server action: sign out and return to login

## Role model

The auth slice reads role and display name from `public.profiles`.

## Database migrations

Run these in order in Supabase SQL Editor.

### 001 profiles

File: `supabase/schema/001_profiles.sql`

Verification query:

```sql
select id, role, display_name, created_at, updated_at
from public.profiles
order by created_at desc
limit 20;
```

If you already have auth users, backfill once:

```sql
insert into public.profiles (id, display_name, role)
select
  u.id,
  coalesce(u.raw_user_meta_data ->> 'display_name', split_part(u.email, '@', 1)),
  coalesce((u.raw_user_meta_data ->> 'role')::public.user_role, 'client'::public.user_role)
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null;
```

### 002 clients

File: `supabase/schema/002_clients.sql`

Verification query:

```sql
select id, trainer_id, first_name, last_name, email, created_at
from public.clients
order by created_at desc
limit 20;
```

### 003 workout programs

File: `supabase/schema/003_workout_programs.sql`

Verification queries:

```sql
select id, trainer_id, client_id, title, start_date, duration_weeks, created_at
from public.workout_programs
order by created_at desc
limit 20;
```

```sql
select id, workout_program_id, day_label, sort_order
from public.workout_program_days
order by created_at desc
limit 20;
```

```sql
select id, workout_program_day_id, exercise_name, sets, reps, target_weight, sort_order
from public.workout_program_exercises
order by created_at desc
limit 20;
```

### 004 client access and exercise logs

File: `supabase/schema/004_client_access_and_logs.sql`

Verification queries:

```sql
select id, trainer_id, first_name, last_name, auth_user_id, created_at
from public.clients
order by created_at desc
limit 20;
```

```sql
select id, trainer_id, client_id, exercise_name, sets, reps, performed_on, created_at
from public.exercise_logs
order by created_at desc
limit 20;
```

If a client user can sign in but cannot see workouts/logs yet, link auth user to
their trainer-created client record once:

```sql
update public.clients
set auth_user_id = '<client-profile-id-uuid>'
where id = '<trainer-client-row-id-uuid>';
```

Get profile IDs:

```sql
select id, role, display_name
from public.profiles
order by created_at desc;
```

### 005 clients delete policy

File: `supabase/schema/005_clients_delete_policy.sql`

Purpose:

- Enables trainer delete permission on their own client rows under RLS.

### 006 workout program delete policies

File: `supabase/schema/006_workout_program_delete_policies.sql`

Purpose:

- Enables trainer delete permission on workout programs under RLS.
- Adds delete policies for workout days and exercises for complete program ownership management.

## Current trainer MVP pages

- `/dashboard/clients`: create and list clients
- `/dashboard/programs`: create, edit, and delete workout programs
- `/dashboard/client-logs`: review client workout logs

## Current client MVP pages

- `/dashboard/workouts`: view assigned program/day/exercises and log each exercise in-place
- `/dashboard/logs`: create exercise logs and view history

## Next feature slice

The next feature is workout assignment and then client-side exercise logging/history.
