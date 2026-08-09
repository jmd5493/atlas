# Infra build plan — prep notes

Prep work done ahead of the actual Part 3 build (`BACKLOG.md`), which is
deliberately hands-on for the person building this, not something to hand
off wholesale. This doc is the map; the building is the point.

---

## Instance sizing: pricing comparison

On-demand, us-east-1, current at time of writing — **verify at
aws.amazon.com/ec2/pricing before committing**, these move:

| Instance | vCPU / RAM | Architecture | Burstable? | $/hr | ~$/mo (730 hrs) |
|---|---|---|---|---|---|
| **t4g.large** (chosen) | 2 / 8 GiB | ARM (Graviton2) | Yes (credit-based) | $0.0672 | **~$49** |
| t3.large | 2 / 8 GiB | x86 | Yes (credit-based) | $0.0832 | ~$61 |
| m6g.large | 2 / 8 GiB | ARM (Graviton2) | No (sustained) | $0.077 | ~$56 |
| t4g.xlarge (ref. only) | 4 / 16 GiB | ARM (Graviton2) | Yes | ~$0.1344 | ~$98 |

**Decision: start on `t4g.large` regardless of this table** — matches
`BACKLOG.md`'s existing sizing call, and the "measure before resizing"
approach means the right move either way is start small, watch real usage
via `metrics-server`, resize only if the numbers say so.

Same specs (2 vCPU/8 GiB) as t3.large but ~19% cheaper — confirms the
ARM/Graviton savings claim already on record, not just an assumption.

One nuance worth knowing before it surprises anyone: t4g.large is
*burstable* — cheap at baseline CPU usage, but running in "unlimited" burst
mode past the credit baseline bills extra per vCPU-hour. K3s + ArgoCD +
Postgres + the app running continuously is a sustained load, not a bursty
one — if real usage ends up consistently above baseline, m6g.large's flat
non-burstable price could end up *cheaper in practice* than t4g.large
running in unlimited mode. Worth checking CPU credit balance once
`metrics-server` is up, not a reason to change the starting choice now.

Sources: [Vantage — t4g.large](https://instances.vantage.sh/aws/ec2/t4g.large), [Vantage — m6g.large](https://instances.vantage.sh/aws/ec2/m6g.large), [usage.ai EC2 pricing guide](https://www.usage.ai/blogs/aws/ec2/pricing/)

---

## Terraform structure: phased, not one root module

Answers the "all-or-nothing apply" concern directly, and specifically
enables **destroying and rebuilding just the EC2 instance** without
touching networking:

```
terraform/
  bootstrap/   # S3 bucket + DynamoDB lock table for remote state.
               # Chicken-and-egg: can't store state in S3 before the
               # bucket exists. Apply once, essentially never touched
               # again after. Local state for this layer only.
  network/     # VPC, subnet, security group, Elastic IP allocation.
               # State lives in the S3 backend from bootstrap/. Changes
               # rarely once set.
  compute/     # EC2 instance + EIP association. References network/'s
               # outputs via a terraform_remote_state data source.
               # This is the layer you destroy/rebuild.
```

Rebuild workflow this buys: `terraform destroy` in `compute/` →
`terraform apply` in `compute/` → fresh instance, same VPC/subnet/security
group (untouched in `network/`), same public IP (EIP lives in `network/`,
only its *association* to an instance changes). No re-running `network/`
or `bootstrap/` at all.

This isn't copying a multi-team pattern for its own sake — it directly
serves the stated "blow this away and rebuild it" requirement, which a
single root module doesn't give cleanly (destroying the instance in a
single-state setup risks touching everything in the same blast radius).

---

## K3s: bootstrapped by Terraform, not a Terraform resource

There's no Terraform provider resource for "a K3s cluster" — instead,
Terraform owns the EC2 instance's `user_data` (cloud-init) field, which
runs the K3s install script on first boot. Practically: Terraform's job
ends at "an instance exists that installs and starts K3s on its own,"
not "kubectl works and I typed the commands."

Why this over a manual post-boot SSH install: it's what makes the
`compute/` destroy-and-rebuild workflow above actually complete on its
own — a fresh instance gets a fresh K3s install automatically, nothing to
remember to redo by hand after every rebuild.

ArgoCD's own bootstrap (the very first `kubectl apply` of its core-profile
manifests, before it exists to manage anything else via GitOps) is a
separate, smaller question worth deciding explicitly in the build
session: also tack it onto the end of `user_data`, or a one-time manual
step once the box is reachable. Either is reasonable — not resolved here
on purpose.

---

## GitOps repo structure: one repo, not a separate platform repo

The "platform GitOps repo vs. app GitOps repo" split (mentioned as a
work pattern) solves a **multi-team problem** — different teams owning
different blast radii/access on a shared cluster. Atlas is one person, one
app, one cluster: that problem doesn't exist here, so copying the split
would be overhead with no payoff.

**Recommendation:** one manifests repo (or a folder in this repo), with
logical separation by ArgoCD `Application` object, not by repo:

```
manifests/
  platform/
    cert-manager/
    (anything else cluster-wide, later)
  apps/
    atlas/
```

Same GitOps discipline (Git is truth, ArgoCD reconciles, no manual
`kubectl apply`) either way. Splitting into separate repos later, if this
ever genuinely grows past one person/one app, is a straightforward move —
not a decision that forecloses anything by starting combined.

---

## IAM: stays simple at this scale

Realistically **one** IAM resource for Terraform to create: an EC2
instance role/profile scoped to one S3 bucket (put/get/list only) for the
Postgres backup target (`BACKLOG.md` Part 3's non-negotiable backups).
No cross-account roles, no complex trust policies, nothing beyond that at
this scale.

Terraform's own local credentials (whatever AWS user runs `terraform
apply` from a laptop) don't need anything new set up for a solo project —
using the existing account directly is fine to start; a dedicated
least-privilege IAM user for Terraform itself is a reasonable thing to
practice deliberately later, not a prerequisite to begin.

---

## Build order (the map)

1. `terraform/bootstrap/` — S3 + DynamoDB. Apply once.
2. `terraform/network/` — VPC, subnet, security group, EIP allocation.
3. `terraform/compute/` — EC2 (`user_data` installs K3s), EIP association.
4. Confirm K3s is up (`kubectl get nodes` over SSH or a configured
   kubeconfig).
5. Bootstrap ArgoCD (core install profile) — decide user_data vs. manual
   per the K3s section above.
6. Point ArgoCD at the manifests repo/folder (`platform/` first, since the
   app's own image/manifests likely come after this session).
7. Billing alarm — per `AGENTS.md`, as soon as anything billable exists,
   not after.

Sizing, structure, and pricing are prepped; the actual `terraform apply`
sequence is the hands-on part.
