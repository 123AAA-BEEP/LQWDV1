"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { assertAdmin } from "@/lib/admin";
import { redirectWithFlash } from "@/lib/flash";
import {
  getMicrositeProject,
  generateMicrositeContent,
  type MicrositeConfig,
} from "@/lib/microsites";

const LIST = "/dashboard/admin/microsites";

export async function createMicrosite(formData: FormData) {
  const supabase = await createClient();
  await assertAdmin(supabase);

  const domain = String(formData.get("domain") ?? "")
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/.*$/, "")
    .slice(0, 253);
  const projectId = String(formData.get("project_id") ?? "");
  if (!/^[a-z0-9.-]{4,253}$/.test(domain) || !domain.includes(".")) {
    redirectWithFlash(LIST, "Enter the bare domain, e.g. echotownswaterdown.com", "error");
  }
  if (!projectId) redirectWithFlash(LIST, "Pick the project this site is for.", "error");

  const { data, error } = await supabase
    .from("microsite_configs")
    .insert({ domain, project_id: projectId })
    .select("id")
    .maybeSingle();
  if (error?.code === "23505") {
    redirectWithFlash(LIST, "That domain already has a microsite.", "error");
  }
  if (error || !data) redirectWithFlash(LIST, "Couldn't create it.", "error");
  revalidatePath(LIST);
  redirect(`${LIST}/${data.id}`);
}

export async function saveMicrositeContext(formData: FormData) {
  const supabase = await createClient();
  await assertAdmin(supabase);
  const id = String(formData.get("microsite_id") ?? "");
  const raw = String(formData.get("context") ?? "").trim().slice(0, 8000);
  if (!id) redirectWithFlash(LIST, "Missing microsite.", "error");

  // Accept JSON when it parses; otherwise store as questionnaire notes —
  // the generator handles both shapes.
  let context: Record<string, unknown> = {};
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      context =
        parsed && typeof parsed === "object" && !Array.isArray(parsed)
          ? (parsed as Record<string, unknown>)
          : { notes: raw };
    } catch {
      context = { notes: raw };
    }
  }
  await supabase
    .from("microsite_configs")
    .update({ context, updated_at: new Date().toISOString() })
    .eq("id", id);
  revalidatePath(`${LIST}/${id}`);
  redirectWithFlash(`${LIST}/${id}`, "Context saved — regenerate to apply it.");
}

export async function generateMicrosite(formData: FormData) {
  const supabase = await createClient();
  await assertAdmin(supabase);
  const id = String(formData.get("microsite_id") ?? "");
  if (!id) redirectWithFlash(LIST, "Missing microsite.", "error");

  const { data } = await supabase
    .from("microsite_configs")
    .select("id, domain, project_id, skin, status, context, content, capture_key")
    .eq("id", id)
    .maybeSingle();
  const config = (data as MicrositeConfig | null) ?? null;
  if (!config) redirectWithFlash(LIST, "Microsite not found.", "error");

  const project = await getMicrositeProject(config.project_id);
  if (!project) {
    redirectWithFlash(
      `${LIST}/${id}`,
      "The project isn't publicly visible — publish it (or check the id) first.",
      "error",
    );
  }

  const content = await generateMicrositeContent(config, project);
  if (!content) {
    redirectWithFlash(
      `${LIST}/${id}`,
      "Generation didn't complete — check ANTHROPIC_API_KEY and try again.",
      "error",
    );
  }
  await supabase
    .from("microsite_configs")
    .update({ content, updated_at: new Date().toISOString() })
    .eq("id", id);
  revalidatePath(`${LIST}/${id}`);
  redirectWithFlash(
    `${LIST}/${id}`,
    "Content generated — review every fact below, then set it live.",
  );
}

export async function setMicrositeStatus(formData: FormData) {
  const supabase = await createClient();
  await assertAdmin(supabase);
  const id = String(formData.get("microsite_id") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!id || !["draft", "live", "retired"].includes(status)) return;

  if (status === "live") {
    const { data } = await supabase
      .from("microsite_configs")
      .select("content")
      .eq("id", id)
      .maybeSingle();
    if (!data?.content) {
      redirectWithFlash(
        `${LIST}/${id}`,
        "Generate and review content before going live.",
        "error",
      );
    }
  }
  await supabase
    .from("microsite_configs")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id);
  revalidatePath(LIST);
  revalidatePath(`${LIST}/${id}`);
  redirectWithFlash(
    `${LIST}/${id}`,
    status === "live"
      ? "Live — the domain now serves the page (attach it to the Vercel project if you haven't)."
      : `Moved to ${status}.`,
  );
}
