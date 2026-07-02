import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import type { createAdminClient } from "@/lib/supabase/admin";
import type { InboundImage } from "./extract";

type Admin = ReturnType<typeof createAdminClient>;

/**
 * Gallery + smart-hero handling for intake images (email attachments + images
 * pulled from linked landing pages). Every usable image lands in project_media
 * (public gallery); the HERO is chosen by a vision pass — a beautiful exterior
 * rendering beats the wordmark og:image every time.
 */

const VISION_MODEL = "claude-opus-4-8";
const MAX_GALLERY = 6;
/** Total wall-clock for classification — the webhook budget is shared. */
const CLASSIFY_DEADLINE_MS = 14_000;

/** Lower = better hero. Logos/text never become heroes. */
const HERO_RANK: Record<string, number> = {
  exterior_rendering: 0,
  aerial_rendering: 1,
  photo_building: 2,
  interior_rendering: 3,
};
/** Kinds worth showing in the public gallery (floor plans help buyers). */
const GALLERY_KINDS = new Set([
  ...Object.keys(HERO_RANK),
  "floor_plan",
  "site_map",
  "unclassified",
]);

interface Classified {
  img: InboundImage;
  kind: string;
}

async function classifyBase64(img: InboundImage): Promise<string> {
  try {
    const anthropic = new Anthropic();
    const res = await anthropic.messages.create(
      {
        model: VISION_MODEL,
        max_tokens: 128,
        tools: [
          {
            name: "classify",
            description: "Classify the image.",
            input_schema: {
              type: "object" as const,
              properties: {
                kind: {
                  type: "string",
                  enum: [
                    "exterior_rendering",
                    "interior_rendering",
                    "aerial_rendering",
                    "photo_building",
                    "floor_plan",
                    "site_map",
                    "logo_or_text",
                    "person_or_lifestyle",
                    "other",
                  ],
                },
              },
              required: ["kind"],
            },
          },
        ],
        tool_choice: { type: "tool", name: "classify" },
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: img.media_type,
                  data: img.data,
                },
              },
              { type: "text", text: "Classify this new-home project marketing image." },
            ],
          },
        ],
      },
      { timeout: 8_000 },
    );
    const block = res.content.find((b) => b.type === "tool_use");
    return block && block.type === "tool_use"
      ? String((block.input as Record<string, unknown>).kind ?? "other")
      : "other";
  } catch {
    return "unclassified";
  }
}

async function upload(
  admin: Admin,
  projectId: string,
  img: InboundImage,
): Promise<string | null> {
  try {
    const ext = img.media_type.split("/")[1]?.replace("jpeg", "jpg") ?? "jpg";
    const path = `email-intake/${projectId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const bytes = Buffer.from(img.data, "base64");
    const { error } = await admin.storage
      .from("project-media")
      .upload(path, bytes, { contentType: img.media_type, upsert: true });
    if (error) return null;
    return admin.storage.from("project-media").getPublicUrl(path).data.publicUrl;
  } catch {
    return null;
  }
}

/**
 * Uploads intake images to the public gallery and (optionally) sets the best
 * one as the project hero. Never throws; skips logos/lifestyle shots; falls
 * back to first-image-as-hero when classification can't finish in budget.
 */
export async function attachGalleryAndHero(
  admin: Admin,
  projectId: string,
  images: InboundImage[],
  opts: { setHero: boolean; projectName: string },
): Promise<void> {
  const batch = images.slice(0, MAX_GALLERY);
  if (batch.length === 0) return;

  // Classify within a shared deadline; leftovers stay "unclassified".
  const startedAt = Date.now();
  const classified: Classified[] = [];
  for (const img of batch) {
    if (Date.now() - startedAt > CLASSIFY_DEADLINE_MS) {
      classified.push({ img, kind: "unclassified" });
      continue;
    }
    classified.push({ img, kind: await classifyBase64(img) });
  }

  // Hero: best-ranked hero-suitable image; fallback to the first image when
  // nothing classified as hero-worthy (never a known logo/text image).
  let hero: Classified | undefined = classified
    .filter((c) => c.kind in HERO_RANK)
    .sort((a, b) => HERO_RANK[a.kind] - HERO_RANK[b.kind])[0];
  if (!hero) {
    hero = classified.find((c) => c.kind === "unclassified" || c.kind === "other");
  }

  let heroUrl: string | null = null;
  let sort = 0;
  for (const c of classified) {
    const isHero = c === hero;
    const inGallery = GALLERY_KINDS.has(c.kind) || isHero;
    if (!inGallery) continue;
    const url = await upload(admin, projectId, c.img);
    if (!url) continue;
    if (isHero) heroUrl = url;
    await admin.from("project_media").insert({
      project_id: projectId,
      media_type: c.kind === "unclassified" ? "image" : c.kind,
      url,
      alt_text: `${opts.projectName} — ${c.kind.replace(/_/g, " ")}`,
      sort_order: isHero ? 0 : (c.kind in HERO_RANK ? 1 : 5) + sort,
      is_public: true,
    });
    sort += 1;
  }

  if (opts.setHero && heroUrl) {
    await admin
      .from("projects")
      .update({ hero_image_url: heroUrl })
      .eq("id", projectId);
  }
}
