"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

/**
 * Mobile-only sticky CTA for the ad landing page. Ad clicks are mostly
 * phones; the one action stays one tap away once the visitor has scrolled
 * past the hero. Desktop keeps the in-flow buttons only.
 */
export function StartStickyCta({ href, label }: { href: string; label: string }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 480);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  if (!show) return null;
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 p-3 backdrop-blur lg:hidden">
      <Link
        href={href}
        className="flex h-12 w-full items-center justify-center rounded-lg bg-ink text-base font-semibold text-white"
      >
        {label}
      </Link>
    </div>
  );
}
