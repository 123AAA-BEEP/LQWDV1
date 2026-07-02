import { CopyField } from "@/components/ui/copy-field";

/** Read-only invite link with a copy-to-clipboard button. */
export function CopyLink({ url }: { url: string }) {
  return <CopyField value={url} />;
}
