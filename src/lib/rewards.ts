import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * LIQWD rewards engine — the single place reward logic lives.
 *
 * Rewards are expressed as days of "Pro" entitlement written to
 * profiles.pro_until. Pro is currently free / not yet a paid tier, so these
 * grants are functionally inert today; the day a paid tier ships, every grant
 * already made is honoured automatically (no backfill).
 *
 * Every grant is recorded in rewards_ledger. The (profile_id, reason,
 * source_type, source_id) unique index makes granting idempotent: the same
 * referral / submission / update can never be cashed in twice.
 *
 * All writes use the service-role client (bypasses RLS) because grants cross
 * user boundaries (rewarding a referrer for someone else's action). Callers are
 * trusted server contexts (admin Server Actions, profile bootstrap).
 *
 * Functions never throw: a reward hiccup must not break the admin action that
 * triggered it. They log and return a small result object instead.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Reward sizes, in days of Pro. Tune freely — changing a number here changes
 * all future grants; past ledger rows are untouched.
 */
export const REWARD_DAYS = {
  /** Both parties, the moment an invited agent confirms their account. */
  referral_signup: 30,
  /** Both parties, bonus when the invited agent later passes RECO verification. */
  referral_verified: 15,
  /** Contributor, when a property submission is approved by an admin. */
  submission_approved: 30,
  /** Contributor, when a property update request is approved by an admin. */
  update_approved: 30,
} as const;

/** How long an approved contributor keeps a project's leads before being bumped. */
export const STEWARDSHIP_DAYS = 30;

type Reason =
  | "referral_referrer"
  | "referral_referred"
  | "submission_approved"
  | "update_approved"
  | "manual";

type Admin = SupabaseClient;

/** max(now, existing pro_until) + days → new pro_until, as an ISO string. */
function extendFrom(current: string | null, days: number): string {
  const now = Date.now();
  const base = current ? Math.max(now, new Date(current).getTime()) : now;
  return new Date(base + days * DAY_MS).toISOString();
}

/**
 * Records a reward in the ledger (idempotent) and, if newly granted, extends
 * the recipient's pro_until. Returns whether a new grant happened.
 */
async function grantReward(
  admin: Admin,
  args: {
    profileId: string;
    reason: Reason;
    days: number;
    sourceType: string | null;
    sourceId: string | null;
    metadata?: Record<string, unknown>;
  },
): Promise<{ granted: boolean }> {
  try {
    // ON CONFLICT DO NOTHING via ignoreDuplicates; .select() returns rows only
    // when a row was actually inserted, so an empty result == already granted.
    const { data, error } = await admin
      .from("rewards_ledger")
      .upsert(
        {
          profile_id: args.profileId,
          reason: args.reason,
          days_granted: args.days,
          source_type: args.sourceType,
          source_id: args.sourceId,
          metadata: args.metadata ?? {},
        },
        {
          onConflict: "profile_id,reason,source_type,source_id",
          ignoreDuplicates: true,
        },
      )
      .select("id");

    if (error) {
      console.error("[rewards] ledger insert failed", error);
      return { granted: false };
    }
    if (!data || data.length === 0) {
      return { granted: false }; // duplicate — already rewarded
    }

    const { data: profile } = await admin
      .from("profiles")
      .select("pro_until")
      .eq("id", args.profileId)
      .maybeSingle();

    await admin
      .from("profiles")
      .update({ pro_until: extendFrom(profile?.pro_until ?? null, args.days) })
      .eq("id", args.profileId);

    return { granted: true };
  } catch (e) {
    console.error("[rewards] grantReward threw", e);
    return { granted: false };
  }
}

/**
 * Called once when a profile is created (i.e. an invited agent has confirmed
 * their account). Links the referral and pays the signup reward to both
 * parties. Safe to call with no/invalid code — it just no-ops.
 */
export async function linkReferralOnSignup(
  newProfileId: string,
  code: string | null,
): Promise<void> {
  const trimmed = (code ?? "").trim().toUpperCase();
  if (!trimmed) return;

  const admin = createAdminClient();
  try {
    const { data: referrer } = await admin
      .from("profiles")
      .select("id")
      .eq("referral_code", trimmed)
      .maybeSingle();

    if (!referrer || referrer.id === newProfileId) return; // unknown code or self-referral

    // Create the referral (unique on referred_profile_id → at most one).
    const { data: inserted } = await admin
      .from("referrals")
      .upsert(
        {
          referrer_profile_id: referrer.id,
          referred_profile_id: newProfileId,
          status: "pending",
        },
        { onConflict: "referred_profile_id", ignoreDuplicates: true },
      )
      .select("id");

    let referralId = inserted?.[0]?.id as string | undefined;
    if (!referralId) {
      const { data: existing } = await admin
        .from("referrals")
        .select("id")
        .eq("referred_profile_id", newProfileId)
        .maybeSingle();
      referralId = existing?.id;
    }
    if (!referralId) return;

    await admin
      .from("profiles")
      .update({ referred_by_profile_id: referrer.id })
      .eq("id", newProfileId);

    // Pay both parties for the confirmed signup.
    await grantReward(admin, {
      profileId: referrer.id,
      reason: "referral_referrer",
      days: REWARD_DAYS.referral_signup,
      sourceType: "referral_signup",
      sourceId: referralId,
      metadata: { referred_profile_id: newProfileId },
    });
    await grantReward(admin, {
      profileId: newProfileId,
      reason: "referral_referred",
      days: REWARD_DAYS.referral_signup,
      sourceType: "referral_signup",
      sourceId: referralId,
      metadata: { referrer_profile_id: referrer.id },
    });
  } catch (e) {
    console.error("[rewards] linkReferralOnSignup threw", e);
  }
}

/**
 * Called when a realtor passes RECO verification. If they were referred, marks
 * the referral qualified and pays the smaller verification bonus to both
 * parties. No-op if they weren't referred.
 */
export async function awardReferralVerificationBonus(
  referredProfileId: string,
): Promise<void> {
  const admin = createAdminClient();
  try {
    const { data: referral } = await admin
      .from("referrals")
      .select("id, referrer_profile_id, status")
      .eq("referred_profile_id", referredProfileId)
      .maybeSingle();
    if (!referral) return;

    if (referral.status !== "qualified") {
      await admin
        .from("referrals")
        .update({ status: "qualified", qualified_at: new Date().toISOString() })
        .eq("id", referral.id);
    }

    await grantReward(admin, {
      profileId: referral.referrer_profile_id,
      reason: "referral_referrer",
      days: REWARD_DAYS.referral_verified,
      sourceType: "referral_verified",
      sourceId: referral.id,
      metadata: { referred_profile_id: referredProfileId },
    });
    await grantReward(admin, {
      profileId: referredProfileId,
      reason: "referral_referred",
      days: REWARD_DAYS.referral_verified,
      sourceType: "referral_verified",
      sourceId: referral.id,
      metadata: { referrer_profile_id: referral.referrer_profile_id },
    });
  } catch (e) {
    console.error("[rewards] awardReferralVerificationBonus threw", e);
  }
}

/**
 * Makes a contributor the lead steward for a project: they receive leads from
 * its active public page(s) until `days` from now, or until a newer approved
 * contribution bumps them. No-op when the project has no active public page
 * (e.g. a freshly-submitted draft) — the Pro-days reward still applied.
 */
export async function assignLeadStewardship(
  admin: Admin,
  projectId: string,
  profileId: string,
  days: number = STEWARDSHIP_DAYS,
): Promise<void> {
  try {
    const until = new Date(Date.now() + days * DAY_MS).toISOString();
    await admin
      .from("public_project_pages")
      .update({
        assigned_realtor_profile_id: profileId,
        lead_routing_mode: "assigned_realtor",
        assigned_realtor_until: until,
      })
      .eq("project_id", projectId)
      .eq("is_active", true);
  } catch (e) {
    console.error("[rewards] assignLeadStewardship threw", e);
  }
}

/**
 * Rewards an approved property submission: Pro days + lead stewardship on the
 * project (once an active public page exists). Idempotent per submission.
 */
export async function rewardSubmissionApproved(
  profileId: string,
  submissionId: string,
  projectId: string | null,
): Promise<void> {
  const admin = createAdminClient();
  const { granted } = await grantReward(admin, {
    profileId,
    reason: "submission_approved",
    days: REWARD_DAYS.submission_approved,
    sourceType: "submission",
    sourceId: submissionId,
    metadata: projectId ? { project_id: projectId } : {},
  });
  // Only (re)assign stewardship on the first approval, so re-running the admin
  // action doesn't reset the clock or steal leads back from a newer steward.
  if (granted && projectId) {
    await assignLeadStewardship(admin, projectId, profileId);
  }
}

/**
 * Rewards an approved property update: Pro days + lead stewardship that bumps
 * any prior steward on this project. Idempotent per update request.
 */
export async function rewardUpdateApproved(
  profileId: string,
  requestId: string,
  projectId: string,
): Promise<void> {
  const admin = createAdminClient();
  const { granted } = await grantReward(admin, {
    profileId,
    reason: "update_approved",
    days: REWARD_DAYS.update_approved,
    sourceType: "update_request",
    sourceId: requestId,
    metadata: { project_id: projectId },
  });
  if (granted) {
    await assignLeadStewardship(admin, projectId, profileId);
  }
}

/**
 * Resolves the current lead steward for a public page, honouring the expiry.
 * Returns the steward's profile id, or null when there is no active steward.
 */
export async function resolveLeadSteward(
  admin: Admin,
  publicPageId: string,
): Promise<string | null> {
  try {
    const { data: page } = await admin
      .from("public_project_pages")
      .select("assigned_realtor_profile_id, assigned_realtor_until")
      .eq("id", publicPageId)
      .maybeSingle();
    if (!page?.assigned_realtor_profile_id) return null;
    if (
      page.assigned_realtor_until &&
      new Date(page.assigned_realtor_until).getTime() <= Date.now()
    ) {
      return null; // stewardship expired
    }
    return page.assigned_realtor_profile_id as string;
  } catch (e) {
    console.error("[rewards] resolveLeadSteward threw", e);
    return null;
  }
}
