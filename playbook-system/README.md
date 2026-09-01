# LIQWD Playbook System

Agentic marketing/ops tool suite for **LIQWD** — a three-sided pre-construction real-estate marketplace (GTA, Mississauga depth-first) with a resale lead-gen module. Stack: **Supabase** (project "LIQWD DB V1") + **Next.js**, server-rendered. This repo turns 82 dissected Search Atlas/OTTO playbooks into **53 LIQWD-native tools**: Claude API system prompts orchestrating typed tool contracts against Supabase and platform APIs.

**Read `docs/BUILD-ORDER.md` first for what to build next. The 10 docs in `docs/blueprints/` are the authoritative specs** — each contains full per-playbook dissection, the consolidated tool specs, safety mechanics, and cross-suite wiring. Do not re-derive decisions already made there. `liqwd-agent-tier-positioning-and-roadmap.md` (founder, 2026-08-29) governs agent-tier packaging: free tier = LIQWD-branded everything (distribution), paid tier = own domain + ad spend (revenue); benefit-first card copy, jargon ban, and the guided roadmap with light guardrails bind every agent-facing tool.

## Architecture invariants (never violate)

1. **Vault grounding.** Every generated claim traces to a Vault source: Realtor Vault (agent identity, RECO#, verified reviews — cite *verified* fields only), Market Vault (projects, neighbourhoods, datasets), Compliance Vault (versioned RECO/TRREB/CASL lint rules). Ask-or-omit, never invent. Unverifiable ≠ clean.
2. **Approval queue.** Every public artifact (page, ad, post, email, reply, profile edit) is staged as a draft and passes human approval. No unsupervised publishing, ever — throughput problems are solved by the O4 AI triage pre-pass, not by weakening the gate. Campaigns publish **paused**.
3. **Four-phase spine** per playbook: 0 preconditions (fail fast) → 1 context (Vault pull + interactive resolution of missing inputs) → 2 strategy (separately approved when output is large) → 3 generation (verified facts, schema, tracking) → 4 named guardrail node (compliance lint hard-blocks) → approval checkpoint.
4. **Capped blast radius.** Every batch/write operation has a per-run cap (≤3 articles, ≤5 pages remediated, ≤10 pages schema, ≤20 negatives, ±20–25% budget moves, ≤25 GBP tasks, etc. — caps are in the specs). Spend caps, pacing, and ledgers are enforced **centrally in services**, not per-prompt.
5. **Change ledgers.** All external writes (ads, GBP, sends, publishes) log to append-only ledgers with actor, reason, and rollback info.
6. **Experience modes.** Agent-tier tools ship Guided (≤3 interactions, defaults from Vault/Agent Brand) and Pro (strategy gate + parameters exposed). **Guardrails are mode-invariant** — Pro unlocks control, never risk. Admin tools are Pro-only.
7. **Compliance deviations are final.** No deployed link networks/cloud stacks/paid placements, no gray-area indexing APIs or paid indexers, no auto-replies to ≤3★ reviews, no unsupervised publishing, CASL-compliant outreach only. Rationale documented in the blueprints — do not relitigate.
8. **Structured output only.** Page/content generation emits structured JSON against the fixed component library and Supabase fields — never raw HTML. On-page changes are field updates, server-rendered on deploy (no pixel injection).

## Tool inventory (53 tools, 10 suites)

| Suite | Prefix | Tools | Blueprint doc |
|---|---|---|---|
| Website Studio | W | 4 (PPC landing page, local presence page, project microsite, personal site*) | website-studio |
| Smart Ads | M/A/L | 13 (3 monitors, 8 audits, 2 launchers) | smart-ads |
| Explorer | E | 6 (striking-distance, growth, keyword portfolio, competitor, exec report, authority plan) | explorer |
| AI Visibility | V | 3 (query universe, llms.txt, gap/trophy) + LLM tracker foundation | ai-visibility |
| OTTO / On-page | O | 4 (page optimizer, schema retrofit, indexing, queue triage) | otto |
| Local / GBP | G | 7 (visibility grid, profile optimizer, housekeeping, reviews, posting, task triage, geo planner) | local |
| Authority / PR | P | 3 (earned editorial, realtor recruitment outreach, press studio) + E6 upgrade | authority |
| Content | C | 5 (topical network, production line, quality/decay, link weaver, authority pages) | content |
| Realtor Studio | R | 8 (listing presentation, listing kit, social, guides, newsletter, market report, video scripts, profile/bio) | realtor-studio-and-experience-modes |
| *deferred | | | |

## Foundation services (build alongside tools)

Long-pole external approvals — **file applications immediately**: Google Ads API dev token + MCC, Meta Marketing API, Google Business Profile API. Infrastructure: GSC wiring (no lead time — first), metrics warehouse, approval-queue + change-set schema, spend-safety service + ledgers, Vault schema formalization, Agent Brand (asset pipeline + design tokens ×3 templates), LLM visibility tracker, geo-grid rank scan (3rd-party API), cold-outreach email infra (separate domains, SPF/DKIM/DMARC, CASL suppression), content grader (versioned rubric).

## Working rules for this repo

- One system prompt per playbook in `prompts/<suite>/<tool-id>.md`, with its tool contract (JSON schema) beside it. Proposed Supabase schema changes go in `migrations-spec/` as reviewed specs before any migration is written.
- The Compliance Vault rulebook (`compliance/rulebook-v1.md` when created) is versioned; lint rules reference rule IDs. Flag all rulebook edits for human review.
- Prompt quality bar: "power agent employee." Persona, scope contract (reads/stages/never-touches), grounding rules, phase structure, guardrail node, post-run block — per spec standard v1.1 in the website-studio blueprint (Part 3) as amended by Experience Modes.
- When a spec conflicts with something newer in chat with the founder, the founder wins; update the doc in the same PR.
