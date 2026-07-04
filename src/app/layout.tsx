import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Inter_Tight } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Display face for consumer/marketing headlines: a contemporary grotesque
// cut for large sizes (tight apertures, negative tracking) — modern-proptech
// voice, clearly distinct from Geist body text. Dashboards stay in Geist.
const interTight = Inter_Tight({
  variable: "--font-inter-tight",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://liqwd.ca",
  ),
  applicationName: "LIQWD",
  title: {
    default: "LIQWD — New & Pre-Construction Homes",
    template: "%s · LIQWD",
  },
  description:
    "New and pre-construction homes across Canada & the U.S. — and the Ultimate Broker Portal behind them. Free for verified agents. Built in Canada.",
};

export const viewport: Viewport = {
  themeColor: "#0b1220",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${interTight.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
