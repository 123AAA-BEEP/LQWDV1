/** ISO timestamp `days` ago — for rolling-window analytics filters. Kept out
 *  of render bodies so it doesn't trip the react-hooks purity rule. */
export function daysAgoIso(days: number): string {
  return new Date(Date.now() - days * 86_400_000).toISOString();
}
