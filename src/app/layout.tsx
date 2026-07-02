import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "LIQWD — The Ultimate Broker Portal for New Homes in Ontario",
    template: "%s · LIQWD",
  },
  description:
    "LIQWD is the Ultimate Broker Portal for new homes in Ontario. Free for verified realtors. Built in Canada.",
  openGraph: {
    siteName: "LIQWD",
    title: "LIQWD — The Ultimate Broker Portal for New Homes in Ontario",
    description:
      "Free for verified realtors. Built in Canada. One portal for new-home inventory in Ontario.",
    type: "website",
    images: [
      {
        url: "/brand/liqwd-banner.png",
        width: 1200,
        height: 630,
        alt: "LIQWD — The Ultimate Broker Portal for New Homes in Ontario",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "LIQWD — The Ultimate Broker Portal for New Homes in Ontario",
    description:
      "Free for verified realtors. Built in Canada. One portal for new-home inventory in Ontario.",
    images: ["/brand/liqwd-banner.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
