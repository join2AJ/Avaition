# AEP Portal — End-to-End Audit & Remediation Log

Audited as: AVSEC-certified instructor · AEP Section Incharge · BCAS Officer · full-stack/security engineer.
Purpose of the system: give **BCAS** and the **Aerodrome Operator** live insight into airport-access
compliance vs non-compliance, and give entities a governed way to obtain staff/material/vehicle access.

Severity: **S1** critical (compliance/security defect) · **S2** important gap · **S3** polish.

Status: ☐ open · ☑ fixed. **All findings remediated except C3 (real server-side auth), which lands with
the FastAPI wiring.** First pass A1–A6 · B1–B3 · C1–C2 · D1–D3 all closed; second-pass sweep (E1–E8)
found and fixed eight further defects exposed once the lifecycle became drivable. A flagship integration
test drives one pass through the full chain — Checklist → Committee (BCAS) → Approved → Issued → Parked →
Un-parked → Surrendered, with the surrender feeding the penalty tracker — green across role handoffs.

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

## S. Security review (frontend + backend)

Reviewed as a security engineer for the classic web/API flaw classes. Frontend is
clean of injection sinks (React auto-escapes; **no** `dangerouslySetInnerHTML`,
`innerHTML`, `eval`, or unsafe `target="_blank"`). Secrets are not committed
(`.env`, `*.db`, `uploads/` are git-ignored). Findings fixed:

- ☑ **SEC-1 · S1 — Forgeable JWT secret.** `secret_key` shipped a hard-coded default
  (`change-this-…`); a deploy that forgot `.env` would sign tokens with a public key →
  full auth bypass / privilege escalation. Fix: `ENVIRONMENT=production` now fail-fasts
  at startup if the secret is default or < 32 chars. Verified (prod boot raises).
- ☑ **SEC-2 · S2 — Default admin credentials.** `admin@aepportal.in / Admin@123456` was a
  built-in default. Production startup now refuses the default admin password.
- ☑ **SEC-3 · S1 — CORS wildcard + credentials.** `allow_origins=["*"]` with
  `allow_credentials=True` is invalid and origin-uncontrolled. Fix: explicit
  `CORS_ORIGINS` allowlist, scoped methods/headers; wildcard rejected in prod.
- ☑ **SEC-4 · S2 — No login brute-force protection.** Added an IP+email sliding-window
  throttle (8 fails / 5 min → HTTP 429). Verified over HTTP.
- ☑ **SEC-5 · S2 — User-enumeration timing oracle.** Login only hashed when the email
  existed. Fix: always verify against a dummy bcrypt hash so timing is constant; error
  message stays uniform ("Incorrect email or password").
- ☑ **SEC-6 · S2 — Missing security headers.** Added CSP (script self-only; styles+fonts
  scoped to Google Fonts), `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy`,
  `Permissions-Policy`, and HSTS on Netlify, plus a matching header middleware on the API.
- ☐ **SEC-7 · S2 — `python-jose` 3.3.0 has known CVEs** (algorithm-confusion / JWT-bomb).
  Decoding already pins `algorithms=[HS256]`, which blocks the alg-confusion path; a full
  fix is migrating to `PyJWT`. *(recommended, deferred)*
- ☐ **C3 · S2 — Client-side auth (frontend).** Roles live in `sessionStorage`, so the demo
  is spoofable; real enforcement is the server RBAC above once the SPA is wired to it.
  *(backend-wiring phase)*

## F. Tab-wise UX & governance improvements (third pass)

- ☑ **F1 — Dark theme eye-comfort.** Reworked to desaturated slate surfaces (no near-black), gentle
  app→card steps, soft off-white text and calmer low-glare accents/shadows; still AA (heading 15:1).
- ☑ **F2 — Passes-by-pillar boundary.** The pillar rows were `<button>`s rendering the browser's default
  border/background box; stripped the chrome (transparent, subtle hover) while keeping the bars dynamic.
- ☑ **F3 — Notifications page + source + history.** Every notification records who pushed it (BCAS /
  Pass Section / Admin / Entity / System-auto); a dedicated tab shows full history with date-time (IST),
  audience, tone and a source filter. Bell reuses the same scoped feed and links to it.
- ☑ **F4 — Committee processing chain as cards.** The 8-step chain (§8.3.3) is now one explained card per
  step (what happens + owner + clause) instead of a cramped node row.
- ☑ **F5 — Requirements basis sub-tab (Users & roles).** Splits every flow into BCAS regulatory-mandatory
  vs Aerodrome-Operator-devised; Material (ToT), parked/un-park handling and Material/Vehicle SLAs are
  flagged operator-devised since AVSEC 02/2022 is largely silent on them.

*Observed for future passes (not yet done):* Validity matrix could gain the same tile drill-downs as
Compliance; Applications register could expose a saved-filter/export; Audit log could add a date-range
filter and CSV export; Entity profile is still a placeholder page.

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
- ☑ **E7 · S2 — Notification over-scope.** The bell showed every notification to every role, so an
  entity/individual login could read internal BCAS/operator traffic and other audiences' messages. Fix:
  the bell now filters by audience — entity/individual see only their own; aerodrome staff
  (admin/operator/bcas) oversee the pipeline; CISF (verify-only) sees none. Unread count respects it.
  Verified per role.
- ☑ **E8 · S2 — Cross-entity notification leakage.** Even after E7, entity-addressed intimations carried
  no entity identity, so one entity's login saw every entity's pass/contract/training notices. Fix:
  `Notification` gains an optional `entityId`; all entity-scoped notify calls (expiry, pass lifecycle,
  contract, training, penalty, registration) now stamp it, and an entity/individual login only sees its
  own (broadcast messages with no entityId still reach everyone). Verified: ENT-01 no longer sees ENT-05's
  intimations; BCAS still sees all.

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
