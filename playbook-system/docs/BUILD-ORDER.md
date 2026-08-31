# Build Order & Foundation Tickets

Phased roadmap distilled from the nine blueprints. Each phase's tools are buildable with that phase's foundations; external API approvals are long poles and file on day one regardless of phase.

## Day one (parallel, regardless of phase)
- [ ] **Apply: Google Ads API** developer token + create LIQWD MCC (sub-account per client model)
- [ ] **Apply: Meta Marketing API** (Business Manager, app review)
- [ ] **Apply: Google Business Profile API** access
- [ ] **Wire: Google Search Console** (no lead time — unblocks the whole E-suite + C3)
- [ ] **Choose: geo-grid rank scan provider** (G1) and **email-verification provider** (P-suite)

## Phase 1 — Foundations + first loop (internal, LIQWD properties)
Goal: one complete grounded loop — a page gets built, indexed, measured, and improved — plus the recruitment engine that grows the client base.
1. **Vault schema formalization** (Realtor/Market/Compliance) in `migrations-spec/`
2. **Approval queue + change-set schema** (all suites depend on it)
3. **Agent Brand**: asset pipeline (bg removal, crops, alt text, attestation flags) + 3 design-token template files
4. **Compliance rulebook v1** (RECO/TRREB advertising, CASL, not-an-appraisal, photo rights) — versioned lint list, human-reviewed
5. **Metrics warehouse** (GSC + grader + later ads/GBP)
6. Tools: **W-PPC landing page**, **O3 indexing**, **E1 striking-distance**, **O1 page optimizer**, **C1+C2 content network & production line**, **content grader**, **O4 queue triage**, **P2 realtor recruitment outreach** (manual-research insight tables OK; CASL lint + outreach infra required before first send)
7. **V2 llms.txt generator** — near-free quick win, ship early

## Phase 2 — Ads live + measurement depth (on API approval)
1. **Spend-safety service + ads change ledger** (centrally enforced caps) — precondition for any ads writes
2. Tools: **M3 tracking health → M1 breach scan → M2 pulse → A1 negatives → A6 budget guard → L1 campaign launcher** (publish-paused) → **A4 CRO loop** with W-PPC pages
3. **LLM visibility tracker** + **V1 query universe**; **E2 growth explorer**, **E4 competitor landscape**, **E5 exec report**
4. **C4 link weaver**, **C3 quality/decay loop** (~90 days of content exists by now)

## Phase 3 — GBP managed service + Realtor Studio (agent-facing prep)
1. **Profile-change ledger** with pacing (suspension defense, centrally enforced)
2. Tools: **G7 geo page planner** (no GBP API needed — can start in Phase 1 if resale pages are priority), **G1 visibility grid**, **G2 profile optimizer**, **G4 reviews engine**, **G5 posting engine**, **G3 housekeeping**, **G6 task triage**
3. **R8 profile/bio studio** (onboarding wizard → fills Realtor Vault) → **R2 listing kit** → **R3 social engine** → **R6 market report** → rest of R-suite
4. **Experience Modes** UI layer (Guided/Pro) over agent-tier tools
5. **C5 authority pages** + **V3 gap/trophy** + **P1 earned editorial** + **P3 press studio** (the AI-visibility flywheel)

## Phase 4 — Agent tier launch
Gate: ≥60 days of internal runs on real spend/accounts. Package: managed campaigns + "LIQWD runs your Google presence" + Realtor Studio, Guided-mode default, monthly story report (A8 + E5 translated), "Have LIQWD do it" escalation throughout.

## First Claude Code sprint (suggested)
1. `migrations-spec/`: Vault + approval-queue + topical-network schemas
2. `prompts/smart-ads/M3-tracking-health.md`, `M1-breach-scan.md`, `M2-performance-pulse.md`, `A1-negatives-engine.md`
3. `prompts/website-studio/W1-ppc-landing-page.md` + component-library JSON schema
4. `compliance/rulebook-v1.md` skeleton with rule IDs
5. Approval-queue API surface (stage/review/approve/reject/ledger)
