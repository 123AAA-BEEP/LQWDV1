import type { Metadata } from "next";
import { Uploader } from "./uploader";

// Internal tool — keep it out of search.
export const metadata: Metadata = {
  title: "Upload developer landing images",
  robots: { index: false, follow: false },
};

export default function DevAssetUploadPage() {
  return (
    <main className="min-h-screen bg-slate-50">
      <Uploader />
    </main>
  );
}
