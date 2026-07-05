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
- ☑ **A4 · S2 — Lifecycle states completed (§7B–D · §10.6 · §11).** Added **Parked** (60-day non-use,
  reversible via Un-park), **Deactivated** (compliance hold, e.g. AVSEC-training lapse, reversible via
  Reactivate) and **Withdrawn** (permanent cancellation — adverse BGC / disciplinary, §11) states,
  wired into the transition machine (role-gated: Operator parks/reactivates, BCAS withdraws). The gate
  Verify screen now refuses any pass not in `issued`/`approved` ("Not currently issued — Withdrawn").
  Compliance surfaces dedicated **Parked/deactivated** and **Withdrawn** tiles, keeping the SLA metric
  pure to in-flight processing.
- ☑ **A5 · S2 — AVSEC-training expiry → auto-deactivate (§13).** Each individual now carries an AVSEC
  refresher-validity date (1-year cycle). Entity & individual status shows a training-compliance table
  (Current / Refresher-due / Lapsed, sorted worst-first). “Apply training holds” deactivates any live
  AEP whose holder’s training has lapsed and intimates the entity/BCAS; “Record refresher” renews the
  validity and reactivates the held pass. Verified end-to-end.
- ☑ **A6 · S2 — Escort binding for TAEP/material into SRA (§8.3.4.12 · §12B).** Raising a ToT (or a
  TAEP requesting an SRA zone) now requires naming an escorting AEP holder. The escort list is filtered
  to holders whose granted zones cover *every* requested SRA zone (and who aren't stop-listed); if none
  qualifies the pass is hard-blocked ("cannot enter unescorted"). The escort binds to the application,
  shows on its detail view, and is written to the audit. Verified end-to-end.

## B. Insights for BCAS & Aerodrome Operator (primary purpose)

- ☑ **B1 · S1 — No compliance-vs-non-compliance surface.** Added a dedicated **Compliance & Insights**
  view: overall compliance rate, non-compliant entities (expired/pending docs), passes expiring in
  30/14/3 days, overdue surrenders, SLA breaches, pillar/zone distribution.
- ☑ **B2 · S3 — Time-series trend added.** Compliance now shows a 12-month issuance trend derived from
  application intake dates, so load can be read month-on-month rather than as a single snapshot.
- ☑ **B3 · S3 — Audit-sample & surprise-check tracking surfaced (§15).** A tracker shows the annual
  20%-of-population audit sample as a progress meter (audited YTD vs target) plus a monthly
  surprise-check chart with finding counts, per the AEP Checking Committee mandate.

## E. Second-pass findings (post-remediation audit)

- ☑ **E1 · S1 — Gate accepted expired cards.** The CISF Verify screen treated any `issued`/`approved`
  pass as valid, ignoring its validity date — a card past its `validTo` would still read "Valid". Fix:
  the gate now checks expiry and shows "EXPIRED on <date> — do not admit (§7A)" for a lapsed pass, and
  logs the verification as a warning. Verified end-to-end.
- ☑ **E2 · S2 — Zone request could exceed entity entitlement.** Company∩role gating was applied only on
  autofill; a manual zone toggle on Create slipped past it, letting a pass request a zone the sponsoring
  entity was never granted (§3). Fix: any requested zone outside the entity's entitled set is flagged red
  and hard-blocks issuance for Operator/Entity; only Admin (acting on BCAS authority) may override, with
  an explicit on-screen note. Verified for both roles.
- ☑ **E3 · S2 — Committee agenda was disconnected from live state.** The Committee page read applications
  from the static demo `api`, so a pass forwarded to committee (D1) never appeared in the committee-ready
  pool and the count was stale. Fix: the page now reads the live `useData()` store — forwarding a pass
  immediately reflects on the agenda. Verified end-to-end.
- ☑ **E4 · S2 — Surrenders/terminations didn't reach the penalty tracker.** The Surrenders & penalties
  view read a static list, so an in-app surrender, withdrawal or contract termination never produced a
  §10.7 record. Fix: surrenders are now in the live store; surrendering/withdrawing a pass and
  terminating a contract each append a dated record (exit today, due +7 days) that the tracker shows
  immediately. Verified end-to-end.
- ☑ **E5 · S2 — Penalty workflow was read-only.** The Surrenders & penalties columns for entity
  justification and BCAS penalty were static. Now they are drivable and role-gated: the entity/operator
  records a late-surrender justification (§10.7); BCAS raises a penalty with written justification and
  later resolves it (§10.8); each action notifies the counterparty and writes the audit. Days-late is
  computed live against the 7-day due date. Verified end-to-end.
- ☑ **E6 · S1 — Withdrawal didn't bar re-application.** A pass withdrawn on adverse BGC (§11) left the
  holder free to be raised again. Now withdrawing a MAN pass auto-adds the holder to the Stop List
  (source BCAS RO), so the Create screen screens them out on the next attempt (§9). Verified: holder
  appears on the Stop List immediately after withdrawal.

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
- ☑ **D2 · S2 — Expiry-driven notifications added.** On load the store scans every live pass, active
  contract and AVSEC-training date and raises 30 / 14 / 3-day (and already-expired) intimations into the
  notification bell. Each carries a deterministic bucket-scoped id so reloads never duplicate it; 3-day
  and expired fire red, wider windows amber.
- ☑ **D3 · S2 — Contract renewal flow added.** A contract (active or lapsed) can be renewed to a new
  end date with a **mandatory zone re-confirmation** for the new term (§7A). Renewal reverses expiry,
  re-confirms the entity’s entitled zones, slides every live pass under the contract to the new
  norm-capped date, drops any zone removed at re-confirmation (holder told to re-apply), and intimates
  the entity + BCAS. Verified end-to-end.
