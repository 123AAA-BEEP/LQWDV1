import { redirect } from "next/navigation";

/**
 * The Deal room's single "Marketplace" entry (agent-panel UX reorg, Phase 3).
 * One stable link for the nav; the marketplace itself is the three tabbed
 * boards, of which Assignments is the first.
 */
export default function MarketplacePage() {
  redirect("/dashboard/assignments");
}
