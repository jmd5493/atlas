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
- **2.1 Change password while logged in** — right now the *only* way to
  change a password is the forgot-password → email link → reset flow. A
  normal "account settings" page with a change-password form (calling
  `supabase.auth.updateUser`, same as the reset flow already does) is a
  small, obvious gap.
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
- **3.3 Rate limiting / abuse protection on the app's own server actions** —
  Supabase enforces its own auth rate limits, but nothing in this app's code
  limits e.g. repeated `forgot-password` submissions from one source. Low
  urgency at current scale, worth knowing about before it isn't low urgency.
- **3.4 Data export** — trainer exporting a client's log history to CSV.
  Nice-to-have, no signal yet that it's actually needed.
- **3.5 Notifications** — email (or push, later) when a trainer assigns a
  new program, or a client logs a workout. Nothing like this exists today;
  it's a real feature, not a small one — scope it properly if it gets picked
  up, don't bolt it on.

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
- **No CI pipeline at all.** Every check this whole build (`tsc`, `eslint`,
  `vitest`, `playwright`) has been run by hand, locally. Nothing gates a PR.
- **No branch protection.** Nothing requires any check to pass before a
  merge — the test-suite-orphaned-by-an-early-merge incident earlier in this
  build is a direct symptom of that.

### Priority 1 — Get the fast checks into CI
GitHub Actions is the obvious choice (repo's already on GitHub, zero new
accounts needed). Fast, no-external-dependency checks first:
- `npm ci`
- `npx tsc --noEmit`
- `npm run lint`
- `npm run test:unit`
- `npm run build` (a production build catches real errors unit tests won't)

Turn on branch protection requiring this workflow green before merge to
`main`. This alone would have caught the orphaned-commit issue.

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

### Priority 3 — CD: build and ship an image
- Add a `Dockerfile` (multi-stage, Next.js `output: "standalone"` for a lean
  runtime image — not configured yet, `next.config.ts` doesn't set it).
- On merge to `main`: build the image, push to a registry. GHCR is the
  simplest choice (free, already authenticated via the GitHub repo).
- Tag images by git SHA at minimum.
- **This is where CI hands off to ArgoCD** — per `AGENTS.md`, ArgoCD watches
  a manifests repo/path and syncs from there; nothing in CI should ever
  `kubectl apply` directly against a cluster.

### Priority 4 — Fix the migration story
Every migration this whole build (001 through 010) was applied by hand: a
personal access token pasted into a chat, `curl`'d against the Supabase
Management API, one migration at a time, checked by hand. That worked, but
it's the least automatable, least auditable part of the entire setup right
now. Needs an actual answer before this is a real pipeline — most likely the
Supabase CLI's migration commands run as a controlled CI/CD step with a
properly scoped credential, not an ad hoc PAT.

---

## Part 3 — Infrastructure & deployment

Everything here should be read against `AGENTS.md`'s Deployment path, Cost
awareness, and Standards sections directly — this is a task breakdown of
that plan, not a separate plan.

### Priority 0 — A decision to make before any of this starts
**Right now there is exactly one Supabase project, and it has been used for
every round of manual and automated testing this entire build.** `AGENTS.md`
already calls for separate config per environment (local / staging-Hetzner /
prod-AWS) — worth deciding explicitly whether that also means separate
Supabase projects per environment (clean separation, a second free-tier
project costs nothing) or one project with careful data hygiene. Given this
app will eventually hold a real trainer's real clients' data, sharing the
project that once had `atlas.trigger-security-test@example.com` rows in it
with whatever becomes production is worth a deliberate no, not an accident.

### Priority 1 — Containerize
- `Dockerfile` for the Next.js app (see CI Priority 3 above — same
  artifact, different concern: this is "does it run in a container at all,"
  CI is "does a container get built and pushed automatically").
- Confirm the app is genuinely stateless as `AGENTS.md` assumes — it should
  be, Supabase is the only persistence, but worth a real check before it's
  running on more than one replica.

### Priority 2 — Hetzner POC / staging
Per `AGENTS.md`: single-node K3s on a Hetzner VPS, ArgoCD for GitOps.
- Provision the VPS (Hetzner's own cost model applies here, not AWS's —
  still worth sizing deliberately rather than defaulting to the biggest
  option).
- Install K3s (single node — this is the learning environment, not where
  HA matters).
- Install ArgoCD; stand up the GitOps repo/path it watches.
- Standard K8s primitives only — Deployment, Service, Ingress — written so
  nothing is Hetzner-specific and the same manifests work unchanged on AWS
  later. This is an explicit `AGENTS.md` requirement, not a nice-to-have.
- TLS: cert-manager + Let's Encrypt (standard, free, works the same on any
  cloud).
- DNS: a real domain pointed at the staging box.
- Secrets: **plain K8s `Secret` manifests can't safely live in the Git repo
  ArgoCD reads from** — needs a GitOps-safe pattern (sealed-secrets or an
  external-secrets operator pulling from somewhere else) decided before the
  first real secret goes in, not after.

### Priority 3 — Production on AWS
Per `AGENTS.md`: EC2 self-managed K3s, deliberately *not* EKS yet. Same
manifest pattern as Hetzner, different substrate. Everything below is a
direct application of `AGENTS.md`'s cost-awareness section — restated here
because it's the part most likely to get "helpfully" over-built by default
if it's not kept explicit:
- Single right-sized EC2 instance in a public subnet with a security group
  is the default, not a starting point to upgrade from.
- No NAT Gateway, no managed control plane (EKS), no ALB/NLB, no multi-AZ —
  none of these as defaults, ever, without an explicit ask.
- Check current EC2 pricing before sizing anything (prices drift; don't
  trust a memorized number).
- Any new billable AWS resource gets flagged and confirmed *before* it's
  provisioned, not folded into a larger change.
- Billing alarms as soon as this phase starts — cost-consciousness in
  practice, not just in the plan.

### Priority 4 — Observability
README's original stated intent included "monitoring" as a goal. Nothing
exists yet. Keep it proportional to a single-node K3s box — this almost
certainly does not need a full Prometheus+Grafana stack on day one; start
with basic logs/metrics and grow only if the app's actual failure modes
call for more.

### Priority 5 — External-service infra (Supabase-adjacent, still real infra work)
- **SMTP provider for Supabase auth email** — signup confirmation and
  password reset currently run on Supabase's default mailer, which has a
  low shared rate limit (hit repeatedly during this build's own testing).
  Explicitly discussed and deferred this session — revisit before real
  client signups depend on it. Resend's free tier was the leading candidate
  when this came up (generous limits, $0 for this app's likely volume,
  simple Supabase SMTP integration) but that's a suggestion, not a decision.
- **Confirm Supabase's backup/retention plan tier** — it's a managed
  Postgres, so backups are Supabase's responsibility, but "what's actually
  covered" is worth confirming rather than assuming once real client data
  is on it.
