"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ButtonLink } from "@/components/ui/button";
import { BRAND } from "@/lib/brand";

/**
 * The three public "surfaces" a visitor can move between. Surfacing all three
 * in one menu means a visitor who lands on /developers (or the consumer
 * marketplace) is never stuck — they can always jump back to the agent site.
 */
const SURFACES = [
  { href: "/", label: "For agents", hint: "Realtor broker portal" },
  { href: "/developers", label: "For developers", hint: "List & promote projects" },
  { href: "/projects", label: "New homes", hint: "Browse the marketplace" },
] as const;

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SiteHeader() {
  const pathname = usePathname() ?? "/";
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const close = () => setOpen(false);

  // Close on Escape and on outside click.
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    function onClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, [open]);

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-[72px] max-w-6xl items-center justify-between px-6">
        <Link href="/" className="flex items-baseline gap-0.5">
          <span className="text-xl font-semibold tracking-tight text-ink">
            {BRAND.name}
          </span>
          <span aria-hidden className="size-1.5 rounded-full bg-brand-500" />
        </Link>

        <div className="flex items-center gap-1 sm:gap-3">
          <ButtonLink
            href="/signup"
            variant="primary"
            size="sm"
            className="hidden sm:inline-flex"
          >
            Sign up free
          </ButtonLink>

          {/* Menu: the surface switcher + auth, in one place so it works the
              same on every viewport and from every surface. */}
          <div ref={menuRef} className="relative">
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              aria-haspopup="menu"
              aria-label="Open menu"
              className="inline-flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:border-slate-300 hover:text-ink"
            >
              <span className="hidden sm:inline">Menu</span>
              <svg
                viewBox="0 0 20 20"
                fill="none"
                aria-hidden
                className="size-4"
                stroke="currentColor"
                strokeWidth={1.75}
                strokeLinecap="round"
              >
                {open ? (
                  <path d="M5 5l10 10M15 5L5 15" />
                ) : (
                  <path d="M3 6h14M3 10h14M3 14h14" />
                )}
              </svg>
            </button>

            {open ? (
              <div
                role="menu"
                className="absolute right-0 mt-2 w-64 overflow-hidden rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl shadow-slate-900/10 ring-1 ring-slate-900/5"
              >
                <p className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                  Explore
                </p>
                {SURFACES.map((s) => {
                  const active = isActive(pathname, s.href);
                  return (
                    <Link
                      key={s.href}
                      href={s.href}
                      role="menuitem"
                  onClick={close}
                      aria-current={active ? "page" : undefined}
                      className={`flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                        active
                          ? "bg-brand-50 text-brand-700"
                          : "text-slate-700 hover:bg-slate-50 hover:text-ink"
                      }`}
                    >
                      <span className="flex flex-col">
                        <span className="font-medium">{s.label}</span>
                        <span className="text-xs text-slate-400">{s.hint}</span>
                      </span>
                      {active ? (
                        <span
                          aria-hidden
                          className="size-1.5 shrink-0 rounded-full bg-brand-500"
                        />
                      ) : null}
                    </Link>
                  );
                })}

                <div className="my-1.5 border-t border-slate-100" />

                <Link
                  href="/login"
                  role="menuitem"
                  onClick={close}
                  className="flex rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:text-ink"
                >
                  Log in
                </Link>
                <Link
                  href="/signup"
                  role="menuitem"
                  onClick={close}
                  className="flex rounded-lg px-3 py-2.5 text-sm font-medium text-brand-700 transition-colors hover:bg-brand-50"
                >
                  Sign up free
                </Link>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
}
