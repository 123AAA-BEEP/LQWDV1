import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Megaphone, Mail, type LucideIcon } from "lucide-react";
import { requireUserProfile, isDeveloper } from "@/lib/auth";
import { Card, CardBody } from "@/components/ui/card";
import { cn } from "@/lib/cn";
import { SECTION_ACCENT } from "@/lib/section-accents";

export const metadata: Metadata = { title: "Promote" };
export const dynamic = "force-dynamic";

const FEATURES: { icon: LucideIcon; title: string; body: string }[] = [
  {
    icon: Megaphone,
    title: "Featured listing",
    body: "Put your project at the top of browse and the homepage, with a Featured badge agents and buyers notice.",
  },
  {
    icon: Mail,
    title: "eBlast to agents",
    body: "Broadcast your project to the verified realtor database — targeted by city and focus.",
  },
  {
    icon: Mail,
    title: "eBlast to buyers",
    body: "Reach motivated end-buyers directly with a dedicated send for your project.",
  },
];

export default async function PromotePage() {
  const { profile } = await requireUserProfile();
  if (!isDeveloper(profile)) redirect("/dashboard");
  const a = SECTION_ACCENT.amber;

  return (
    <div className="space-y-6">
      <div className={cn("rounded-2xl p-6 ring-1 ring-inset sm:p-8", a.zone)}>
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em]",
            a.chip,
          )}
        >
          <Megaphone className="size-3" strokeWidth={2} aria-hidden /> Promote now
        </span>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-ink">
          Put your project in front of agents and buyers
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
          Purpose-built rental and new-construction projects with ongoing
          lease-up and sales benefit from continuous reach. These promotion
          tools are launching soon — we&rsquo;ll notify you the moment they go
          live.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((f) => {
          const Icon = f.icon;
          return (
            <Card key={f.title} className="border-dashed bg-slate-50/60">
              <CardBody className="flex h-full flex-col">
                <div className="flex items-center justify-between">
                  <span className="flex size-9 items-center justify-center rounded-lg bg-white ring-1 ring-slate-200">
                    <Icon className="size-5 text-slate-400" strokeWidth={1.75} aria-hidden />
                  </span>
                  <span className="rounded-full bg-slate-200/70 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                    Coming soon
                  </span>
                </div>
                <h3 className="mt-3 font-semibold text-slate-600">{f.title}</h3>
                <p className="mt-1 flex-1 text-sm text-slate-400">{f.body}</p>
              </CardBody>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
