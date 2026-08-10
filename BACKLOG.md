# Atlas Backlog

The app-layer MVP is done: auth (login/signup/password reset), trainer-managed
clients (create/edit/archive/restore, optional self-tracking), workout
programs (multi-day/multi-workout creation and editing), client exercise
logging (plan-linked and freeform, both correctable-by-delete), trainer
review, and a black/gold/grey UI that's been through two mobile passes. It's
covered by 28 unit tests and 18 e2e tests.

This document is everything reasonable to do *next* — features, testing/CI,
and infrastructure — none of it implemented yet. Priorities are a starting
point, not a commitment; re-order freely.

The infra section leans directly on `AGENTS.md`, which is the source of truth
for deployment target, cost constraints, and standards — this doc doesn't
repeat every word of it, but nothing here should contradict it. Read that file
first if the two ever seem to disagree.

---

## Part 1 — App features & UX

### Already done (closed out from the original version of this list)
- **Structured program builder** — day/workout/exercise fields instead of a
  freeform line parser. Done (`ProgramDayBuilder`).
- **Multiple workouts per calendar day** — done (migration 008).
- **Editing an already-created program's days/exercises** — done (full
  replace, `updateWorkoutProgramDays`).
- **Client self-signup + auto-linking by email** — done (migration 009),
  which substantially covers what "remove manual SQL linking" originally
  asked for on the *client* side.
- **Trainer self-tracking** — done, reuses the client/program/log model.
- **Deleting a mistaken log entry** — done (migration 010), for both client
  and trainer.
- **Production error handling** — done. `error.tsx`/`global-error.tsx`/
  `not-found.tsx` didn't exist at all before this; a real bug hit Next.js's
  bare default screen. Wasn't previously tracked anywhere in this doc —
  found via a direct code check while scoping the go-live list, not from a
  prior backlog item.
- **Name collected at signup** — done. Signup previously only asked for
  email/password; `display_name` silently defaulted to the email's local
  part. Now wired through to the existing `handle_new_user_profile` trigger
  (migration 001/009). Also not previously tracked here.
- **Duplicate-email signup handled explicitly** — done. Matches Supabase's
  explicit "already registered" error text, and separately the
  anti-enumeration case (a confirmed existing user's re-signup attempt
  returns success with an empty identities array, not an error) — the
  generic "check your email" message was actively misleading in that
  second case, since no email actually gets sent then. Also not previously
  tracked here.

### Decided against (was on the original list, deliberately not doing this)
- **Folding `/dashboard/logs` into the program-detail view** — the original
  plan was to eliminate the separate "log something extra" page once inline
  per-exercise logging existed on `/dashboard/workouts`. That inline logging
  shipped, but the two pages were deliberately kept distinct: `/workouts` is
  "log against the plan," `/logs` is "log something not on the plan, or log
  it late." Revisit only if real usage shows this split is confusing rather
  than useful.

### Priority 1 — Trainer review tools
The trainer's `/dashboard/client-logs` page currently lists every log from
every client with no way to narrow it down. Fine at 2 test clients, won't
stay fine.

- **1.1 Filters on `/dashboard/client-logs`** — by client, by program, by
  date range. Acceptance: trainer can narrow to one client's recent history
  without scrolling past everyone else's.
- **1.2 Program adherence signal** — something as simple as "logs this week"
  or "days completed vs. days planned" per active program. No analytics
  engine needed, just a count.
- **1.3 (data-model prerequisite for finer filtering)** — `exercise_logs`
  only has `workout_program_id`, not a day-level reference. Adding a nullable
  `workout_program_day_id` FK would let 1.1 filter by day, not just by
  program. Optional — only worth doing if 1.1 actually needs it.

### Priority 2 — Account self-service
- **2.1 Change password while logged in — done.** `/dashboard/account`,
  `supabase.auth.updateUser`, same call the reset-password flow already
  used. Verified live: changed a real test account's password and
  confirmed the update, then changed it straight back so the e2e suite's
  stored credential stays valid.
- **2.2 Trainer-initiated client linking, without relying on signup-time
  email match** — a trainer who wants to link a client whose signup email
  won't match what's on file (typo, different address than expected) or who
  wants to generate a proper invite has no path except a direct DB update.
  The self-signup auto-link (migration 009) covers the common case; this
  covers the exceptions.
- **2.3 Editing a logged entry, not just deleting it** — migration 010 added
  delete; correcting a typo currently means delete-and-relog. A pre-filled
  edit form is the natural next step if delete-and-relog turns out to be
  annoying in practice rather than just workable.

### Priority 3 — Polish and hardening
- **3.1 Empty-state copy audit** — several empty states were written
  ad hoc as pages were built (some are good — the "not linked yet" messaging
  is now role-aware for trainer vs. client — others were never revisited).
  Worth one pass looking at every "no X yet" state together.
- **3.2 Accessibility pass** — color contrast, keyboard navigation, form
  label/`aria-*` correctness. Never explicitly checked this whole build.
- **3.3 Rate limiting on `forgot-password` — done.** In-memory sliding-window
  limiter (`src/lib/rate-limit.ts`), keyed by the submitted email, 3
  requests per 15 minutes. Deliberately not backed by Redis/a DB table —
  fine for a single Node process (today, and the near-term single-EC2
  target), explicitly flagged in that file for when it stops being true
  (horizontal scaling needs a shared store instead). Other server actions
  besides `forgot-password` still have no app-level limiting — revisit if
  that ever looks like it matters, no signal yet that it does.
- **3.4 Data export** — trainer exporting a client's log history to CSV.
  Nice-to-have, no signal yet that it's actually needed.
- **3.5 Notifications** — email (or push, later) when a trainer assigns a
  new program, or a client logs a workout. Nothing like this exists today;
  it's a real feature, not a small one — scope it properly if it gets picked
  up, don't bolt it on.
- **3.6 CSV import for programs** — let a trainer import an
  already-built program from a spreadsheet instead of re-entering it by
  hand in the builder. Cheaper than it sounds: `createWorkoutProgram`/
  `updateWorkoutProgramDays` already funnel through one shared, unit-tested
  pipeline (`src/lib/programs/day-parsing.ts`) that takes a plain JSON
  shape (day → workout blocks → exercises); a CSV importer is just a
  second producer of that same shape, inheriting its existing validation
  for free. Scoped version: fixed CSV column template (day number,
  workout label, exercise name, sets, reps, weight, notes), parsed
  client-side (`papaparse` — not currently a dependency; hand-rolled comma
  splitting breaks on real spreadsheets), used to hydrate the existing
  builder UI (`InitialWorkoutDay[]`) for the trainer to review before
  saving, rather than inserting straight to the DB blind. **Explicitly not
  in scope**: auto-importing a trainer's spreadsheet as-is, whatever
  layout it happens to be in — that's an open-ended heuristics problem,
  not a bounded feature. This means the trainer reformats into our
  template once, not "upload anything and it works." No signal yet that
  this is actually needed, same as 3.4.

---

## Part 2 — Testing & CI

### What exists
28 Vitest unit tests (`src/lib/programs/day-parsing.ts`) and 18 Playwright
e2e tests (`e2e/`) covering the core trainer and client flows, all runnable
locally (`npm test`). See the README's Testing section for how the e2e suite
is set up, and the two real constraints it runs under: it uses real accounts
against the live dev Supabase project (not an isolated test DB), and it
deliberately doesn't exercise a real `signUp()` call to avoid burning
Supabase's shared mailer rate limit.

### What doesn't exist yet
- **e2e not in CI** — still run by hand, locally, before opening a PR (see
  Priority 2 below, an open decision, not yet implemented).
- **No branch protection** — deliberately, see Priority 1's note below.
- **No automated migration pipeline** — see Priority 5.
- **No CD** — nothing deploys the image `image.yml` pushes; see Priority 4.

### Decided: three-tier branching model (`main` / `dev`, `stage` later)
Was pure trunk-based — every `feature/*` branch forked from and PR'd
straight back into `main`. Moving to: `feature/*` → PR → `dev` (integration
branch, day-to-day work lands here) → periodically, `dev` → PR → `main`
(release cut, always releasable, this is prod).

`ci.yml` now triggers on PRs/pushes to `dev` too, or `dev` would have zero
test coverage despite being where most work actually happens.
**`image.yml` deliberately stays `main`-only** — a `dev` merge shouldn't
push a new GHCR image with nothing to deploy it to, consistent with the
Dev environment note in Part 3 (`dev` is still not a deployed environment).

`stage`/`test` is the planned third tier, **not created yet** — no point
adding a branch with no deploy destination before Part 3's stage namespace
actually exists. Add it when that lands, sitting between `dev` and `main`.

No branch-protection change from this — GitHub Free's private-repo
limitation (above) applies identically to `dev`; manual review before
merge stays the actual enforcement mechanism on both branches.

### Priority 1 — Get the fast checks into CI — **done**
`.github/workflows/ci.yml`: `tsc --noEmit` → `eslint` → `vitest` unit tests →
`next build` → a PR-only Docker build check, on every PR into `main` and on
push to `main`. No Supabase env vars needed at all — the build never calls
out to Supabase, and since Priority 3's switch to runtime-injected config,
nothing during `next build` reads Supabase config either, so there was never
even a placeholder to fake. No secrets needed for this workflow at all.
Verified passing on real PRs (#7, #8), not just locally.

**Branch-protection enforcement (blocking the merge button on a red check)
turned out to need either a public repo or GitHub's Team plan ($4/mo/user)**
— GitHub Free doesn't offer repository rules on private repos at all, this
isn't a config gap, it's a plan-tier limit. Decided against paying or going
public for this: PRs are already being reviewed manually before every merge
(the actual practice this whole build), so enforced blocking wouldn't change
real behavior — it would just formalize something already happening. CI
still shows a clear pass/fail on every PR page either way; that status is
what actually gets checked before merging. Revisit only if manual review
discipline ever actually slips — trivial to turn on later (Team plan or
public repo, no rework needed), not a decision that forecloses anything.

### Priority 2 — Decide the e2e-in-CI strategy (needs a decision, not just implementation)
The e2e suite currently runs against the same live dev Supabase project used
for manual testing all build. That's fine for a human running it locally
before opening a PR; running it automatically on every CI push raises real
questions worth deciding deliberately rather than defaulting into:
- A dedicated CI-only Supabase project with seeded fixture accounts (clean,
  isolated, costs a second free-tier Supabase project) vs. continuing to
  share the dev project (risk: concurrent runs colliding, or CI runs eating
  further into the mailer rate limit if that ever gets exercised).
- Whether e2e runs on every PR (slower feedback loop, catches more) or only
  on merge to `main` / on a schedule (faster PRs, catches regressions later).
- Where e2e credentials live as CI secrets, and who's allowed to see them.

### Priority 3 — Build and push the image (still CI, not CD) — **done**
Worth being precise about the CI/CD boundary here, since it's easy to blur:
building and pushing an image is producing a validated artifact, same
category of work as lint/test/build-check — it's CD only once something
*deploys* it. In this GitOps setup, "deploy" is entirely ArgoCD's job, not a
pipeline step (see Priority 4 below).
- `Dockerfile` added (multi-stage, `node:22-alpine`, non-root runtime user,
  built on Next.js `output: "standalone"` — now set in `next.config.ts`).
- `ci.yml` gained a build-only "Docker build check" step on every PR (no
  push) — catches a broken Dockerfile before merge, modeled on the same
  pattern used in `project-scrum/scrum-pilot`'s CI.
- New `image.yml` workflow: triggers on push to `main` only, builds and
  pushes to GHCR (`ghcr.io/<owner>/<repo>`), tagged by short git SHA
  (the tag GitOps promotion will reference) + a floating `latest`. Uses
  `docker/build-push-action` with GitHub Actions layer caching
  (`cache-from`/`cache-to: type=gha`) and the auto-issued `GITHUB_TOKEN` —
  no Docker credential secret needed, unlike scrum-pilot's Docker Hub
  username/password pair.
- **Follow-up, not yet done:** GHCR's free tier on a *private* repo is
  500MB storage / 1GB transfer per month (public repos are unlimited);
  layers are deduped across tags but this is still worth a retention step
  (e.g. delete SHA tags past the last N, keep `latest`) before this runs
  unattended for a while. Add when this is actually driving a live deploy,
  not before.
- **Build-time vs. runtime Supabase config — resolved, superseding the
  build-time-baking call originally recorded here.** `NEXT_PUBLIC_*` vars
  get inlined into the client JS bundle at `next build` time, not read at
  container runtime (Next.js docs, self-hosting guide, "Environment
  Variables"), which would have meant a rebuild per environment. Revisited
  once Hetzner-stage came back up as a real (if still unscheduled)
  possibility alongside AWS prod — two real environments made "one image,
  reconfigured at deploy" worth the extra plumbing now rather than later.
  Implemented:
  - Renamed the vars to plain `SUPABASE_URL`/`SUPABASE_ANON_KEY` (no
    `NEXT_PUBLIC_` prefix) — read live from `process.env` on the server,
    never inlined into a build.
  - Added `src/app/api/public-env/route.ts`, `dynamic = "force-dynamic"`:
    the one bridge point that hands the container's live env vars to the
    browser. The single client-side caller
    (`src/lib/supabase/client.ts` → `src/components/auth/reset-password-form.tsx`)
    fetches it instead of reading `process.env` directly.
  - `src/app/(auth)/reset-password/page.tsx` forced dynamic too — it was
    the one route with no other dynamic API call, so without this
    Next.js would've statically prerendered it at build and frozen
    `hasSupabaseConfig()`'s result regardless of runtime.
  - Dockerfile/`ci.yml`: dropped the build-time `ARG`s and CI placeholder
    env vars entirely — nothing reads Supabase config during `next
    build` anymore.
  - Verified locally: same built image, run twice with different
    `SUPABASE_URL`/`SUPABASE_ANON_KEY` via `docker run -e`, served two
    different configs from `/api/public-env` with no rebuild; a
    no-env-vars run failed closed (`503` from the endpoint, login page
    still rendered its "not configured" state rather than crashing).
  - `image.yml` stays a single build — one image now really does work
    for every environment, so the matrix-build path recorded earlier is
    no longer needed at all, for Hetzner-stage or otherwise.

  These vars were never a secrets concern in the first place, worth
  repeating: the anon key is designed to be public (Supabase's security
  model is RLS-enforced, not secrecy of this key — same value is already
  visible in any browser's Network tab on the live site, with or without
  Docker). The real secrets to keep out of this image whenever they show
  up — `service_role` key, DB/SMTP credentials — go through K8s Secrets
  at deploy time, never a Dockerfile `ARG`/`ENV` or this `/api/public-env`
  pattern (that route only ever serves values already meant to be public).

### Priority 4 — CD: hand the new image tag to ArgoCD
This is the part that's actually "CD," and it's thinner than it might sound:
**ArgoCD isn't a pipeline step** — it's a persistent controller already
running in the cluster, continuously watching a manifests repo/path and
reconciling the cluster to match whatever it finds there. The pipeline's
only job is a Git commit updating the image tag in whatever manifest ArgoCD
watches; ArgoCD does the actual deploying on its own, on a loop. Nothing in
CI or this step should ever `kubectl apply`/`helm upgrade` directly against
the cluster — per `AGENTS.md`, the only path in is a Git change ArgoCD picks
up on its own.

### Priority 5 — Fix the migration story
Every migration this whole build (001 through 010) was applied by hand: a
personal access token pasted into a chat, `curl`'d against the Supabase
Management API, one migration at a time, checked by hand. That worked, but
it's the least automatable, least auditable part of the entire setup right
now, and the PAT/Management-API approach is specifically **Supabase
Cloud-only** — it won't exist once/if Postgres is self-hosted (see Part 3),
so this can't stay as-is regardless.

**Decided, and implemented: `golang-migrate` via its official Docker image
(`migrate/migrate`), not the Supabase CLI.** The Supabase CLI's migration
commands would also have worked (they're Postgres-agnostic under the hood,
just a plain connection string), but they're still Supabase-branded
tooling — file-naming convention, tracking table, the works — none of which
transfers to a project that isn't using Supabase. `golang-migrate` is
genuinely vendor-neutral (works against any Postgres, not just this stack),
and its official image is the same one that'll run as the eventual K8s
migration Job (Priority 4/Part 3's PreSync hook), so the same tool carries
through local dev → CI → cluster instead of being CI-only tooling.

- Migrations live in `supabase/migrations/` as `<timestamp>_<name>.up.sql` /
  `<timestamp>_<name>.down.sql` pairs — every migration has both, including
  all 10 pre-existing ones (not just going forward), each verified with a
  real up → down → up round trip against a throwaway Postgres container
  before being trusted.
- Two down migrations are intentionally not "safe defaults": one
  (`workout_days_multiple_per_day`) can fail against real data by design,
  one (`signup_hardening_and_client_linking`) reopens a real security hole
  if actually run — both documented inline and in the README, not silently
  reversible.
- `npm run db:migrate` / `npm run db:migrate:down`, driven by a
  `SUPABASE_DB_URL` Postgres connection string (not a PAT) — identical
  command in local dev, CI, and prod regardless of hosting.
- The old Supabase CLI scaffold (`supabase/config.toml`, the `supabase` npm
  dependency) was removed rather than left alongside the new approach.
- **CI now has a `migrations` job** (`ci.yml`) that applies every migration,
  reverses all of them, then re-applies — against a throwaway `postgres:16`
  service container, not the real dev/prod Supabase project. Catches broken
  `.up.sql`/`.down.sql` files before merge without needing any real
  credentials. This is deliberately *not* the same thing as CI applying
  migrations to a real environment on merge — that's still the open Part 2
  Priority 2 decision, untouched by this.

---

## Part 3 — Infrastructure & deployment

Everything here should be read against `AGENTS.md`'s Deployment path, Cost
awareness, and Standards sections directly — this is a task breakdown of
that plan, not a separate plan. **Two decisions below deliberately deviate
from `AGENTS.md`'s original path** (AWS-first instead of Hetzner-first;
self-hosting Postgres/auth instead of managed Supabase) — noted explicitly
so that's a conscious choice on record, not a drift nobody decided.

### Decided: AWS-first, skipping the Hetzner staging phase
`AGENTS.md`'s original plan was Hetzner POC first, AWS later. Decided instead
to go straight to AWS. Worth recording the actual tradeoff that was weighed:
**for equivalent compute, Hetzner is meaningfully cheaper than AWS on-demand**
(roughly $5–13/mo vs. $25–60/mo for similar specs — see below). AWS was
chosen anyway, deliberately, for the Terraform/AWS experience specifically —
not because it's the cheaper option, because it isn't. If cost pressure ever
becomes the deciding factor, Hetzner is the cheaper fallback with the same
manifest pattern (K3s + ArgoCD + standard K8s primitives), not a redesign.

**Updated direction: stage + prod both on one AWS box, not a second Hetzner
box** — evaluated running Hetzner as the staging tier (cheaper in isolation,
~$5–13/mo) against consolidating both environments onto a single bigger EC2
instance as two K8s namespaces. Consolidating costs more in raw EC2 terms
(one instance-size tier up, roughly +$50/mo — confirm actual current pricing
before committing) but avoids maintaining two cloud providers' worth of
Terraform/credentials for a one-person project whose explicit goal is AWS
depth. **Hetzner is not fully ruled out** — still an open fallback if AWS
cost pressure becomes real, or a possible future third environment — just
not the default staging plan right now. Size the box by measuring real usage
(see Sizing below) rather than pre-provisioning for a worst-case guess. One
piece of prep from when Hetzner-as-second-environment was still the live
idea stays useful regardless of which box(es) actually run it: the app
image reads its Supabase config from live container env vars, not
build-time baking (Part 2 Priority 3) — so the same image works across
stage/prod namespaces on one box, or a future Hetzner box, with zero
rebuild-per-target either way.

**Terraform owns the AWS layer**: VPC, EC2 instance, security group, Elastic
IP. State in an S3 backend + DynamoDB lock table from the start, not local
state (pennies/month, avoids the "state file only exists on someone's
laptop" trap). **ArgoCD owns everything inside the cluster** — app
Deployment/Service/Ingress, self-hosted Postgres/auth manifests. These are
complementary layers, not competing tools — per `AGENTS.md`, nothing in
either should ever mean a manual `kubectl apply` against the running
cluster.

### Decided: self-host Postgres + auth, not managed Supabase Cloud
Rationale: if an EC2 instance is being paid for regardless (to run the app),
running Postgres + GoTrue (auth) + PostgREST on that same box costs nothing
extra — versus paying for that instance *and* Supabase Pro ($25/mo) on top
of it once the free tier's pause-after-a-week-of-inactivity policy becomes
unacceptable (it will, for anything real users depend on). Also directly
serves the stated goal in `AGENTS.md` — this is real Postgres-ops learning,
not a corner case.

- **Self-host only what's actually used**: Postgres + GoTrue + PostgREST.
  This app uses zero Realtime and zero Storage today — skip both. Not a
  one-way door: add Storage later exactly when a feature (e.g. client
  progress photos) actually needs it, same pattern, just another manifest.
- **Stage and prod share one self-hosted Postgres instance, as two logical
  databases** (e.g. `stage_db` / `prod_db`), not two separate instances and
  explicitly not RDS. Considered RDS for the stage/prod split (a
  `db.t4g.micro` would be cheap, ~$12–15/mo after the 12-month free tier)
  but `AGENTS.md` already names RDS specifically as a managed service to
  avoid by default, for the same cost-and-learning-goal reasoning as
  avoiding EKS — bringing it in for this would reverse that decision, not
  extend it, and a single Postgres instance holding multiple databases is
  ordinary Postgres administration that costs nothing extra. Revisit
  *instance* separation (still self-hosted, not managed) only if real usage
  shows stage/prod sharing an instance is actually a problem.
- **Same client code, no rewrite** — `@supabase/supabase-js`, `.auth.*`
  calls, RLS policies with `auth.uid()`, all of it keeps working unchanged.
  Only `NEXT_PUBLIC_SUPABASE_URL` changes, from Supabase's cloud to the
  self-hosted instance's own address.
- **This is where risk gets concentrated, be honest about it**: app, DB, and
  auth all live on one box now. If it has a problem, everything is down at
  once — managed Supabase at least isolated that. Accepted deliberately
  given the learning goal, not an oversight.
- **Backups to S3, non-negotiable, set up alongside the initial deploy, not
  after**: `pgBackRest` or `WAL-G` streaming to S3 for real point-in-time
  recovery (a cron'd `pg_dump` to S3 is an acceptable v1 if PITR tooling
  takes longer to get right). This app will eventually hold a real trainer's
  real clients' data — "add backups later" isn't a posture to ship with,
  and backups living only on the same instance as the data protect against
  nothing (disk dies, backup dies with it).
- **SMTP provider still needed regardless of hosting** — self-hosted GoTrue
  still needs to send confirmation/reset emails. This doesn't disappear;
  see the SMTP item below.

### Sizing the EC2 instance
Worth being honest rather than optimistic: **ArgoCD is the piece most likely
to blow the budget on a small box** — its default install assumes it might
manage many clusters at scale (server, repo-server, application-controller,
Redis, dex, notifications-controller). Use ArgoCD's **"core" install
profile** (single-cluster, no HA) instead of the default manifests. **Start
with ArgoCD** (core profile); if its footprint proves to actually be a
problem once measured on real hardware (not guessed from the table below),
**Flux is the named fallback** — same GitOps principle (Git is truth,
nothing manual touches the cluster), generally lighter controllers. Either
way, never fall back to manual `kubectl apply`/`helm upgrade` for anything
meant to persist — that's a hard line from `AGENTS.md`, not a sizing
decision.

**Sizing methodology: measure, don't pre-provision for a worst case.**
Deploy prod first on `t4g.large`, let `metrics-server` report actual usage,
*then* decide whether stage (running alongside prod as a second namespace on
the same box) needs a bigger instance. Stage also doesn't need to run
24/7 — scaling its app/auth pods to 0 replicas when not actively testing
(a Git-committed change, still GitOps) is a cheaper lever than upsizing the
box, and should be tried before assuming `t4g.xlarge` is necessary.

Rough tally for everything on one box:

| Component | ~RAM |
|---|---|
| OS + K3s control plane | ~1 GB |
| Traefik (ships with K3s, no separate install) | ~75 MB |
| cert-manager | ~150 MB |
| ArgoCD (core profile) | ~750 MB–1 GB |
| Next.js app | ~256–512 MB |
| Postgres | ~512 MB–1 GB |
| GoTrue + PostgREST | ~250–500 MB |
| sealed-secrets / external-secrets controller | ~75 MB |
| headroom (not optional) | ~1 GB |

Realistically **~4.5–5.5 GB minimum before counting anything else** (a
monitoring agent, additional services). **Target `t4g.large` (2 vCPU / 8 GB,
ARM/Graviton) as the starting size, not `t4g.medium` (4 GB)** — 4 GB would
run at the edge with zero slack the moment anything else gets added, and
memory pressure on K8s means the OOM killer starts evicting pods, not a
graceful slowdown. Graviton (`t4g.*`) over x86 (`t3.*`) for the same specs
at meaningfully lower cost — nothing in this stack (Next.js, Postgres,
Go-based GoTrue/PostgREST) has an x86-only dependency.

**Scaling up later is a Terraform variable change, not a rebuild**: change
`instance_type`, `terraform apply` — mechanically stop → AWS swaps hardware
→ start, a few minutes of downtime. The EBS root volume survives the
stop/start, and with an Elastic IP (free while attached to a running
instance — worth having from day one) the public IP doesn't change either.
Storage (EBS) can grow live, without even stopping the instance.

Per `AGENTS.md`'s cost-awareness section — restated here since it's the part
most likely to get "helpfully" over-built by default if it's not kept
explicit:
- No NAT Gateway, no managed control plane (EKS), no ALB/NLB, no multi-AZ —
  none of these as defaults, ever, without an explicit ask.
- Check current EC2 pricing before committing to a size (prices drift).
- Any new billable AWS resource flagged and confirmed *before* it's
  provisioned, not folded into a larger change.
- Billing alarms as soon as this phase starts.

### Dev environment
Not a second deployed environment — that doubles infra surface (and cost,
if it means a second EC2 instance) for a one-person project. Local dev stays
exactly as-is (`npm run dev` against a Supabase project on the free tier).
"Dev vs. prod" is primarily **which Supabase/Postgres instance is being
pointed at**, not a second Kubernetes environment. If a real staging
environment is ever needed later, that's a second namespace on the same
box, not a second box.

### Observability — pinned, not decided yet
Keep this proportional to the box it's running on — the sizing table above
already assumes zero budget for a full observability stack. **A full
Prometheus + Grafana + Loki stack does not fit** (Prometheus alone commonly
wants 1–2 GB+ RAM even for small setups, Loki adds several hundred MB to a
GB more, before Grafana or any exporters). Start with what's already free:
K3s's built-in `metrics-server` (near-zero extra cost, covers basic CPU/RAM
— this is also what drives the sizing decision above) plus `kubectl
logs`/`journalctl`.

Grafana specifically is wanted here — real interest in learning it
hands-on, work uses Dynatrace which is enterprise-overkill for this. Grafana
the dashboard UI itself is light (~100–200 MB); the heavy part is always the
backend it queries, so it doesn't have to mean the full stack above. Two
candidate lightweight paths, **neither decided yet, pin for later**:
1. Self-hosted Grafana + Victoria Metrics (single-node) instead of
   Prometheus — Prometheus-compatible query language/dashboards, much
   lighter footprint, fits the "single lightweight binary" tier. Skip Loki,
   keep `kubectl logs`/`journalctl` for logs. Keeps everything self-hosted,
   consistent with the project's overall self-hosting posture.
2. Grafana Cloud free tier + a lightweight shipping agent (Grafana Alloy,
   ~50–150 MB) — storage/backend runs off-box on Grafana's infrastructure
   for free within their limits, near-zero footprint on the EC2 instance,
   but monitoring data lives off-box rather than fully self-hosted.

Revisit once the app's actual failure modes call for more than
`metrics-server` — don't build monitoring for problems that haven't
happened yet.

### External-service infra (Supabase-adjacent, still real infra work)
- **SMTP provider for auth email** — signup confirmation and password reset
  need real email delivery either way (self-hosted GoTrue or managed
  Supabase both need this). Explicitly discussed and deferred this session —
  revisit before real client signups depend on it. Resend's free tier was
  the leading candidate when this came up (generous limits, $0 for this
  app's likely volume, simple SMTP integration) but that's a suggestion, not
  a decision.
