// Text normalization (LLD §7.3). Produces a derived view; the raw text is never modified.
import { sha256 } from "@domain/hash";

const BULLETS = /^[\s]*[•●▪◦‣∙·○■□➢➤►▶✓✔\-–—*]+\s*/;

/** Normalize one line: NFKC, unify whitespace, keep words, numbers, units and negations intact. */
export function normalizeLine(line: string): string {
  return line
    .normalize("NFKC")
    .replace(/[​-‍﻿]/g, "")
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\t/g, " ")
    .replace(/ {2,}/g, " ")
    .trim();
}

/** Preserves line (bullet/section) boundaries; collapses runs of blank lines. */
export function normalizeText(raw: string): string {
  return raw
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((l) => normalizeLine(l.replace(BULLETS, "• ")))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Aggressive canonical form used ONLY for matching: lower-case alphanumerics separated by
 * single spaces. Used for evidence-quote verification and content fingerprints.
 */
export function canonical(s: string): string {
  return s
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}%+#.]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Secondary duplicate signal for resume content (LLD §6.2). Never an identity key. */
export const contentFingerprint = (text: string): string => sha256(canonical(text));
