// Evidence verification (LLD §8.4): a valid JSON response is not a valid extraction.
// Every quote must be found in the source; unverifiable quotes are kept but marked, never rewritten.
import type { ParsedBlock, SourceLocator, VerifiedEvidence } from "@domain/types";
import type { Evidence } from "@schemas/extraction";
import { canonical } from "@normalization/text";

export interface EvidenceIndex {
  full: string;
  /** canonical offset → block order, for locating a match */
  starts: Array<{ at: number; block: ParsedBlock }>;
}

export function buildEvidenceIndex(blocks: ParsedBlock[]): EvidenceIndex {
  const starts: EvidenceIndex["starts"] = [];
  let full = "";
  for (const b of blocks) {
    starts.push({ at: full.length, block: b });
    full += canonical(b.text) + " ";
  }
  return { full, starts };
}

function locate(index: EvidenceIndex, at: number): SourceLocator | null {
  let hit: ParsedBlock | null = null;
  for (const s of index.starts) {
    if (s.at > at) break;
    hit = s.block;
  }
  return hit ? hit.locator : null;
}

/**
 * Exact canonical match first; then a conservative fallback that accepts a quote whose
 * first and last 6-word windows both appear in order (handles models trimming a bullet).
 */
export function verifyEvidence(index: EvidenceIndex, e: Evidence): VerifiedEvidence {
  const q = canonical(e.quote);
  if (q.length < 3) return { quote: e.quote, section: e.section, verified: false, locator: null };
  let at = index.full.indexOf(q);
  if (at < 0) {
    const words = q.split(" ");
    if (words.length >= 12) {
      const head = words.slice(0, 6).join(" ");
      const tail = words.slice(-6).join(" ");
      const h = index.full.indexOf(head);
      const t = h >= 0 ? index.full.indexOf(tail, h) : -1;
      if (h >= 0 && t >= 0 && t - h < q.length * 1.5) at = h;
    }
  }
  return { quote: e.quote, section: e.section, verified: at >= 0, locator: at >= 0 ? locate(index, at) : null };
}

export const verifyAll = (index: EvidenceIndex, list: Evidence[]) => list.map((e) => verifyEvidence(index, e));
