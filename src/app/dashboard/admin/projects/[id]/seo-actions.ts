"use server";

import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { assertAdmin } from "@/lib/admin";

export interface SeoFieldsValue {
  seo_title: string;
  seo_meta_description: string;
  page_summary: string;
  page_description: string;
}

export type SeoResult = SeoFieldsValue | { error: string };

/**
 * Generates SEO metadata for a project's public page using Claude (admin-only).
 * Uses only public-safe project fields — never the admin-only provenance.
 */
export async function generateSeo(projectId: string): Promise<SeoResult> {
  if (!projectId) return { error: "Missing project." };
  if (!process.env.ANTHROPIC_API_KEY) {
    return {
      error:
        "AI isn’t configured yet — add ANTHROPIC_API_KEY in Vercel and redeploy.",
    };
  }

  const supabase = await createClient();
  try {
    await assertAdmin(supabase);
  } catch {
    return { error: "Admin access required." };
  }

  const { data: project } = await supabase
    .from("projects")
    .select(
      "project_name, builder_name, city, neighbourhood, province, project_type, sales_status, construction_status, ownership_type, price_from_public, price_to_public, price_currency, occupancy_estimate_text, total_units, storeys, bedrooms_summary, description_short, description_long",
    )
    .eq("id", projectId)
    .maybeSingle();
  if (!project) return { error: "Project not found." };

  const facts = JSON.stringify(project, null, 2);
  const client = new Anthropic();

  try {
    const message = await client.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 1024,
      system:
        "You are an expert SEO copywriter for a Canadian new-home / pre-construction real estate marketing site. " +
        "Write accurate, public-safe copy using ONLY the supplied project facts — never invent prices, dates, unit counts, or features that aren't given; omit anything unknown. " +
        "Weave in the city/neighbourhood and builder naturally for local SEO. No hype clichés, no ALL CAPS, no emojis.",
      tools: [
        {
          name: "emit_seo",
          description: "Return SEO metadata for the project's public page.",
          input_schema: {
            type: "object",
            properties: {
              seo_title: {
                type: "string",
                description:
                  "Up to 60 characters. Include the project name and city.",
              },
              seo_meta_description: {
                type: "string",
                description:
                  "150–160 characters. Compelling and keyword-aware; one or two sentences.",
              },
              page_summary: {
                type: "string",
                description:
                  "One or two plain-language sentences for the page header.",
              },
              page_description: {
                type: "string",
                description:
                  "One or two short paragraphs of public-safe marketing copy about the project.",
              },
            },
            required: [
              "seo_title",
              "seo_meta_description",
              "page_summary",
              "page_description",
            ],
            additionalProperties: false,
          },
        },
      ],
      tool_choice: { type: "tool", name: "emit_seo" },
      messages: [
        {
          role: "user",
          content: `Project facts (JSON):\n${facts}\n\nGenerate the SEO metadata.`,
        },
      ],
    });

    const block = message.content.find((b) => b.type === "tool_use");
    if (!block || block.type !== "tool_use") {
      return { error: "The model didn’t return SEO content. Please try again." };
    }
    const out = block.input as Record<string, unknown>;
    const str = (k: string) =>
      typeof out[k] === "string" ? (out[k] as string) : "";
    return {
      seo_title: str("seo_title"),
      seo_meta_description: str("seo_meta_description"),
      page_summary: str("page_summary"),
      page_description: str("page_description"),
    };
  } catch (e) {
    const m = e instanceof Error ? e.message : "Unknown error";
    return { error: `AI request failed: ${m}` };
  }
}
