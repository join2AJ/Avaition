# AEP Portal — End-to-End Audit & Remediation Log

Audited as: AVSEC-certified instructor · AEP Section Incharge · BCAS Officer · full-stack/security engineer.
Purpose of the system: give **BCAS** and the **Aerodrome Operator** live insight into airport-access
compliance vs non-compliance, and give entities a governed way to obtain staff/material/vehicle access.

Severity: **S1** critical (compliance/security defect) · **S2** important gap · **S3** polish.

Status: ☐ open · ☑ fixed.

## A. Compliance correctness (AVSEC 02/2022)

- ☑ **A1 · S1 — Co-terminus validity not enforced (§7A).** A pass could be issued valid beyond its
  contract end / clearance / NSOP-AOP. Fix: `validTo = min(pass-norm, contract end)`.
- ☑ **A2 · S1 — Stop List gate (§9).** Added a Stop List (BCAS/Operator-maintained) screened on every
  MAN pass; a match hard-blocks issuance, logs a Stop-List-hit and raises an urgent notification.
- ☑ **A3 · S1 — TAEP 30-day annual cap (§8.3.4.3).** Running per-individual TAEP-day counter on Create;
  exceeding 30 days blocks until "BCAS approval obtained" is confirmed.
- ☐ **A4 · S2 — Lifecycle states incomplete (§7B–D).** No Parked (60-day non-use), Deactivated, or
  Withdrawn states; no adverse-BGC cancellation. *(queued)*
- ☐ **A5 · S2 — AVSEC-training expiry → auto-park (§10).** Not modelled. *(queued)*
- ☐ **A6 · S2 — Escort binding for TAEP/material into SRA (§8.3.4.12 / §12B).** Material can only enter
  a zone the *named escorting AEP holder* is entitled to — the escort is not captured. *(queued)*

## B. Insights for BCAS & Aerodrome Operator (primary purpose)

- ☑ **B1 · S1 — No compliance-vs-non-compliance surface.** Added a dedicated **Compliance & Insights**
  view: overall compliance rate, non-compliant entities (expired/pending docs), passes expiring in
  30/14/3 days, overdue surrenders, SLA breaches, pillar/zone distribution.
- ☐ **B2 · S3 — No time-series trends.** Charts are point-in-time counts. *(queued)*
- ☐ **B3 · S3 — Audit sample (20% annual) & monthly surprise-check tracking not surfaced.** *(queued)*

## C. Application security

- ☑ **C1 · S1 — No route authorization.** Any signed-in user could URL-navigate to any page
  (e.g. CISF → `/app/access`). Fix: per-role route guards; unauthorised → redirect to role home.
- ☑ **C2 · S1 — Individual over-scope.** An individual self-check login saw the whole entity's
  applications. Fix: individuals see only their own records.
- ☐ **C3 · S2 — No real authentication.** Demo accepts any credentials; sessions are client-side. Real
  JWT + server RBAC lands with the FastAPI wiring. *(backend phase)*

## D. Functional flows

- ☑ **D1 · S2 — Pass lifecycle now drivable in-app.** Added a role-gated status machine
  (`domain/transitions.ts`) + `advanceApplication` engine. From an application's detail view the right
  desk drives it forward: Operator works the checklist (forward to committee / send for clarification /
  reject), BCAS decides at committee (approve / reject), Operator issues & prints, Entity resubmits or
  surrenders. Reason is mandatory on clarification/reject/surrender; every transition is timestamped in a
  Step-history panel, written to the login-wise audit, and intimates the entity/BCAS on key changes.
- ☐ **D2 · S2 — Expiry-driven notifications missing.** Notifications are termination-driven only; add
  the scheduled 30/14/3-day expiry intimations. *(queued)*
- ☐ **D3 · S2 — Contract renewal flow.** Re-confirm zones at renewal. *(queued)*
