# LIQWD — Live Schema Reference

**Authoritative snapshot of the live Supabase project `LIQWD DB V1`
(ref `mzdqlhopxfknwqxxuonn`, Postgres 17), captured 2026-06-19.**

> ⚠️ This repo's `supabase/migrations/` (`0001`–`0005`) is **only a partial,
> local-dev view** of the schema. The live database is ahead of it: most
> features below were applied directly to Supabase and are **not** reproduced as
> migration files in this repo. Treat **`src/lib/database.types.ts`** (generated
> from the live DB) as the source of truth for table/column shapes, and this
> file as the human index. Regenerate types via the Supabase MCP
> `generate_typescript_types` or `supabase gen types typescript`.

## Applied migration history (live)

| Version | Name |
|---------|------|
| 20260616223615 | advertiser_similar_properties |
| 20260616232019 | 0004_opportunities |
| 20260617024438 | 0008_deal_rfp_field_hiding |
| 20260617035211 | 0009_project_media_candidates |
| 20260617172341 | 0004_ultra_tier |
| 20260617172348 | 0005_ultra_billing |
| 20260617174330 | drop_obsolete_tier_restore_realtor_tier_guard |
| 20260617180507 | 0009_pro_plan |
| 20260617190649 | 0010_buyer_mandates |
| 20260617192323 | 0011_buyer_mandate_marketplace |
| 20260617193817 | 0012_mandate_connect |
| 20260617202611 | 0013_ultra_paid_tier |
| 20260617211931 | 0014_developer_rfps |
| 20260617224107 | 0015_buyer_mandate_checklist_v2 |
| 20260618000120 | 0016_reco_certificate_verification |
| 20260618135519 | 0017_rfp_reveal_identity |
| 20260618185959 | 0018_restore_service_role_grants |
| 20260619141555 | referrals_rewards |
| 20260619142313 | pro_until_entitlement |
| 20260619154658 | protect_pro_until_self_grant_guard |
| *(this session)* | pbr_rental_referrals_and_suggestions |
| *(this session)* | pbr_rental_referrals_and_suggestions_rls |

> The repo's `0001`–`0003` correspond to the original structural/RLS/storage
> baseline; the repo's `0004`/`0005` mirror the two PBR/suggestions migrations
> applied this session. Everything else above lives only in the live DB.

## Tables by feature area

### Identity & accounts
- **brokerages** — brokerage directory.
- **profiles** — users. Beyond the repo baseline, live adds entitlement/plan
  columns: `plan` (`free|pro|ultra`), `realtor_tier` (`standard|ultra`),
  `reco_verification_method` (`certificate|manual`), `referred_by_profile_id`,
  and a `pro_until` entitlement (guarded against self-grant).
- **verification_requests** / **reco_verification_audits** — RECO verification
  flow + certificate audit trail.

### Projects (new-home inventory)
- **projects** — canonical project record. Live adds `listing_type`
  (`for_sale|for_rent|mixed_use`) and `price_period` (`total|monthly`).
- **project_private_commercials** — broker-only commission/negotiability (1:1).
- **project_broker_portals** — external/internal broker portal links.
- **project_media** / **project_media_candidates** — media + a review queue
  (`pending|approved|rejected`) for candidate images.
- **project_floorplans**, **project_incentives**, **project_documents**.
- **public_project_pages** — SEO public pages + lead routing.
- **project_leads** — captured leads (`new|contacted|qualified|closed|spam`).
- **project_access_grants** — `realtor_only|developer_restricted|admin_only`.

### Curation / ops
- **property_submissions**, **property_update_requests** — realtor-submitted new
  projects + corrections (admin review queues).
- **seo_prompt_settings** — singleton SEO prompt config.
- **audit_logs** — admin audit trail.

### Marketplace: opportunities & bidding
- **opportunities** — developer-listed deals (`deal_type`
  `single_property|units|portfolio`; `price_basis` `total|per_unit`;
  `status` `draft|open|paused|closed|suspended`).
- **opportunity_units** — units within an opportunity.
- **opportunity_bids** — realtor bids (`open|accepted|declined|countered|withdrawn`).
- **notifications** — user notifications tied to opportunities/bids.

### Marketplace: deal RFPs
- **deal_rfps** — `rfp_type`
  (`new_listing|bulk_purchase|inventory_unit|trouble_unit|full_development`),
  `deal_side` (`buy|list`), `visibility` (`invited|all_ultra`).
- **deal_rfp_invitations** (`invited|viewed|declined`).
- **deal_rfp_proposals** (`submitted|shortlisted|awarded|declined|withdrawn`).
- **project_proposals** — proposals against a project
  (`proposal_format` `worksheet|freeform`; lifecycle incl. `countered`/`expired`).

### Buyer mandates (the platform's "worksheet" equivalent)
- **buyer_mandates** — reusable buyer requirement (price band, beds/baths,
  financing, pre-approval, proof of funds, deposit-ready, rep agreement, areas,
  timeline, must/nice-to-haves). `status` `draft|active|matched|closed`.
- **mandate_connect_requests** — developer↔mandate connect
  (`requested|accepted|declined|withdrawn`).

### Growth & billing
- **referrals** — member-to-member growth referrals (`pending|qualified|void`).
- **rewards_ledger** — reward-day grants (`referral_referrer|referral_referred|
  submission_approved|update_approved|manual`).

### Rental / PBR + suggestions (added this session)
- **project_rental_referral_terms** — per-project PBR referral params + fee
  (`referral_fee_type` `months_rent|percent_first_year|flat`; `service_mode`
  `self_serve|full_service`; min lease/income/credit, pets, move-in window).
- **platform_suggestions** — realtor "Got an idea?" inbox (`category`
  `idea|feature_request|complaint|business_opportunity|other`; `status`
  `new|under_review|planned|in_progress|shipped|declined`).
- **referral_opportunities_view** — broker-only SECURITY INVOKER feed of
  published rental projects accepting referrals.

## Notes
- Helper functions present in live: `is_admin`, `is_approved`, `is_developer`,
  `is_pro`, `is_ultra`, `has_project_access`, `owns_mandate`, `owns_rfp`,
  `is_invited_to_rfp`, `can_respond_to_rfp`, `is_opportunity_owner`,
  `set_updated_at`, `safe_uuid`, `gen_referral_code`, plus guard triggers.
- Several pre-existing advisor items remain (some `SECURITY DEFINER` views,
  functions with mutable `search_path`, leaked-password protection off) — known
  tech debt, out of scope for this snapshot.
