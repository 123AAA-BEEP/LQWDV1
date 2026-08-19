import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Field, Input, Select } from "@/components/ui/field";
import { FlashNotice } from "@/components/ui/flash-notice";
import { STOCK_THEMES } from "@/lib/microsites";
import { addStockByUrl, deleteStockImage } from "./actions";
import { StockUploader } from "./uploader";

export const metadata: Metadata = { title: "Microsite stock library" };
export const dynamic = "force-dynamic";

interface Row {
  id: string;
  theme: string;
  url: string;
  alt_text: string | null;
  city: string | null;
  active: boolean;
}

const first = (v: unknown): string =>
  Array.isArray(v) ? String(v[0] ?? "") : typeof v === "string" ? v : "";

export default async function StockLibraryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const supabase = await createClient();
  const { data } = await supabase
    .from("microsite_stock_images")
    .select("id, theme, url, alt_text, city, active")
    .order("theme")
    .order("sort_order");
  const rows = (data as Row[] | null) ?? [];
  const byTheme = new Map<string, Row[]>();
  for (const r of rows) {
    byTheme.set(r.theme, [...(byTheme.get(r.theme) ?? []), r]);
  }

  return (
    <div className="space-y-6">
      <FlashNotice
        searchParams={{ flash: first(sp.flash), flash_tone: first(sp.flash_tone) }}
      />
      <div>
        <Link
          href="/dashboard/admin/microsites"
          className="text-xs text-slate-400 hover:text-slate-600"
        >
          ← Microsites
        </Link>
        <h2 className="mt-1 text-lg font-semibold text-ink">Stock image library</h2>
        <p className="mt-1 text-sm text-slate-500">
          Themed fallback photography for projects with thin media: transit
          shots for &quot;getting around&quot;, parks and caf&eacute;s for
          &quot;nearby amenities&quot;, scenery for heroes. Real project
          renderings always win; these only fill the gaps. Upload only images
          you have the right to use commercially (Unsplash and Pexels
          licences are fine).
        </p>
      </div>

      <Card>
        <CardBody className="space-y-4">
          <h3 className="font-semibold text-ink">Upload images</h3>
          <StockUploader themes={[...STOCK_THEMES]} />
        </CardBody>
      </Card>

      <Card>
        <CardBody className="space-y-3">
          <h3 className="font-semibold text-ink">Or add by URL</h3>
          <form action={addStockByUrl} className="flex flex-wrap items-end gap-2">
            <div className="min-w-64 flex-1">
              <Field label="Image URL" htmlFor="su_url">
                <Input
                  id="su_url"
                  name="url"
                  placeholder="https://images.unsplash.com/…"
                  required
                />
              </Field>
            </div>
            <Field label="Theme" htmlFor="su_theme">
              <Select id="su_theme" name="theme">
                {STOCK_THEMES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Alt text" htmlFor="su_alt">
              <Input id="su_alt" name="alt_text" maxLength={200} />
            </Field>
            <Field label="City" htmlFor="su_city">
              <Input id="su_city" name="city" maxLength={80} />
            </Field>
            <Button type="submit" variant="secondary">
              Add
            </Button>
          </form>
        </CardBody>
      </Card>

      {STOCK_THEMES.map((theme) => {
        const list = byTheme.get(theme) ?? [];
        return (
          <section key={theme} className="space-y-2">
            <h3 className="text-sm font-medium uppercase tracking-[0.18em] text-slate-400">
              {theme} ({list.length})
            </h3>
            {list.length === 0 ? (
              <p className="text-sm text-slate-400">Empty — sections needing {theme} imagery go without.</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {list.map((r) => (
                  <Card key={r.id}>
                    <CardBody className="space-y-2 p-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={r.url}
                        alt={r.alt_text ?? r.theme}
                        loading="lazy"
                        className="h-28 w-full rounded-lg object-cover"
                      />
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-xs text-slate-500">
                          {r.alt_text ?? "no alt"}
                          {r.city ? ` · ${r.city}` : ""}
                        </p>
                        {r.city ? <Badge tone="brand">{r.city}</Badge> : null}
                      </div>
                      <form action={deleteStockImage}>
                        <input type="hidden" name="stock_id" value={r.id} />
                        <Button type="submit" size="sm" variant="ghost">
                          Remove
                        </Button>
                      </form>
                    </CardBody>
                  </Card>
                ))}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
