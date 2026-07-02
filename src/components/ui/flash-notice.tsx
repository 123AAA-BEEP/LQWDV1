import { Notice } from "./notice";
import { flashFromSearchParams } from "@/lib/flash";

/**
 * Renders the outcome message a server action left in the URL via
 * `redirectWithFlash()`. Drop one near the top of any page whose actions
 * confirm results this way; renders nothing when there is no flash.
 */
export function FlashNotice({
  searchParams,
}: {
  searchParams: { flash?: string; flash_tone?: string };
}) {
  const flash = flashFromSearchParams(searchParams);
  if (!flash) return null;
  return (
    <Notice tone={flash.tone}>{flash.message}</Notice>
  );
}
