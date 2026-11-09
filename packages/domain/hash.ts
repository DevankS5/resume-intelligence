import { createHash } from "node:crypto";

export const sha256 = (data: string | Uint8Array): string =>
  createHash("sha256").update(data).digest("hex");

/**
 * Processing idempotency key (LLD §6.3): same resume + same versions = same key,
 * so a retry resolves to the existing job instead of creating a second one.
 */
export function idempotencyKey(parts: Record<string, string>): string {
  const ordered = Object.keys(parts).sort().map((k) => `${k}=${parts[k]}`);
  return sha256(ordered.join("|"));
}
