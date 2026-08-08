<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Atlas — Project Context

## What this is
Atlas is a fitness coaching app for a personal trainer (real client, not a demo)
to manage his own clients: plans, progress tracking, scheduling. It needs to
actually work for non-technical end users, not just run locally.

## Why this project matters beyond shipping it
I'm a Platform/Cloud Engineer (Kubernetes, cloud infra) — not primarily an app
developer. Atlas is deliberately being treated like a real product with a real
deployment lifecycle, because the infra/ops side of this project is the actual
skill-building goal, not the app code itself.

**Practical implication for how you help me:**
- App-layer code (React components, Supabase queries, UI logic): favor fast,
  correct, idiomatic solutions. I don't need deep teaching here — I'm "okay but
  not a dev" and this isn't my growth area. Just make it solid and ship it.
- Infra, deployment, CI/CD, observability, secrets management: treat this as
  the part I actually want to learn deeply. Explain the *why* behind
  architecture choices here, not just the *what*. Don't dumb this down.

## Stack
- Frontend: Next.js, TypeScript, Tailwind
- Backend/DB/Auth/Storage: Supabase (Postgres, external to app runtime)
- Deployment target: containerized, stateless app tier (no local state —
  DB is external, so the app itself must stay horizontally replaceable)

## Deployment path (current → long-term)
- **Now (POC/staging):** Hetzner VPS, single-node K3s, ArgoCD for GitOps
- **Production target:** AWS (EC2 self-managed K3s initially — same pattern as
  Hetzner, not EKS yet — deferred until there's a reason to pay for a managed
  control plane)
- Deploys should be written so the target cloud is swappable: avoid
  Hetzner-specific or AWS-specific assumptions baked into manifests. Use
  standard K8s primitives (Deployment, Service, Ingress) over provider-specific
  shortcuts wherever there's a choice.
- All deploys go through ArgoCD (Git as source of truth) — never suggest
  `kubectl apply` directly against a running cluster for anything meant to
  persist. Manifest changes go through the repo.

## Cost awareness (AWS specifically)
This is a personal project on a limited AWS credit balance, not company money.
Cost surprises are a real risk I want actively guarded against, not just
noted after the fact.

- **Always flag the cost implication of any AWS resource before suggesting
  it** — not just "here's how," but "this costs roughly $X/month" or "this is
  free-tier eligible / this is not."
- **Never suggest NAT Gateways, managed control planes (EKS), load balancers
  (ALB/NLB), or multi-AZ/multi-node setups as defaults.** These are common
  silent cost blowouts (a NAT Gateway alone runs ~$30+/month just for
  existing). Single EC2 instance in a public subnet with a security group is
  the default assumption unless I explicitly ask for something more.
- Prefer self-managed K3s on a single right-sized EC2 instance over managed
  services (EKS, RDS, managed load balancers) — this is a deliberate choice
  for both cost control and hands-on learning, not a gap to "fix" by
  upgrading to managed alternatives.
- If a suggested approach has a cheaper alternative that costs some
  convenience or manual setup, mention the cheaper option — don't default to
  "easiest" when "easiest" is also "most expensive."
- Before any change that provisions new billable AWS resources, say so
  explicitly and let me confirm — don't just include it in a larger set of
  changes.
- Remind me to check actual current pricing (aws.amazon.com/ec2/pricing)
  rather than relying on memorized figures, since prices and free-tier terms
  change.

## Standards (treat this like it's hosted for a paying company)
- Secrets never hardcoded or committed — env vars / K8s secrets only
- Separate config for local dev vs. staging (Hetzner) vs. prod (future AWS)
- Every deployable change should be revertible via Git (GitOps discipline,
  not manual fixes on the running cluster)
- Auth and any client data handling should assume real user data is at stake
  — this app will hold a real trainer's real clients' info eventually

## Working with me
- Ask before making infra/architecture decisions that affect the deploy
  target or data model — I want to understand tradeoffs, not just get an
  answer
- For app-layer code, just implement it — don't over-explain React/Next.js
  patterns unless something's non-obvious
- Flag anything that would block or complicate the eventual AWS migration