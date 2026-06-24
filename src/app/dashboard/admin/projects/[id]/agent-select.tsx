"use client";

import { useState } from "react";
import { Select } from "@/components/ui/field";

export interface AgentOption {
  id: string;
  label: string;
  eligible: boolean;
}

/**
 * Assigned-agent picker for the public-page editor. Lists every realtor
 * regardless of status; warns when the selected agent isn't approved +
 * public-profile-enabled, because the public card only renders for those.
 */
export function AgentSelect({
  agents,
  defaultValue,
}: {
  agents: AgentOption[];
  defaultValue: string;
}) {
  const [value, setValue] = useState(defaultValue);
  const selected = agents.find((a) => a.id === value);
  const showWarning = Boolean(selected) && !selected!.eligible;

  return (
    <>
      <Select
        id="assigned_realtor_profile_id"
        name="assigned_realtor_profile_id"
        value={value}
        onChange={(e) => setValue(e.target.value)}
      >
        <option value="">— None —</option>
        {agents.map((a) => (
          <option key={a.id} value={a.id}>
            {a.label}
          </option>
        ))}
      </Select>
      {showWarning ? (
        <p className="mt-1 text-xs text-amber-600">
          This agent isn’t approved with a public profile enabled, so their card
          won’t appear on the public page until they are.
        </p>
      ) : null}
    </>
  );
}
