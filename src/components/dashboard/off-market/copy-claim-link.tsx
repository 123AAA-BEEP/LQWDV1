import { CopyField } from "@/components/ui/copy-field";

/** Admin affordance: copy a listing's claim link to send to its agent. */
export function CopyClaimLink({
  url,
  className,
}: {
  url: string;
  className?: string;
}) {
  return <CopyField value={url} size="sm" copyLabel="Copy" className={className} />;
}
