/**
 * Returns `path` only if it's a safe in-app relative path, else `fallback`.
 * Blocks open redirects: absolute URLs ("https://evil"), protocol-relative
 * ("//evil"), and anything not starting with a single "/".
 */
export function safeRelativePath(path: unknown, fallback = "/dashboard"): string {
  return typeof path === "string" &&
    path.startsWith("/") &&
    !path.startsWith("//")
    ? path
    : fallback;
}
