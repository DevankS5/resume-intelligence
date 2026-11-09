// Experience interval service (LLD §10). Half-open month intervals [start, endExclusive);
// overlaps are merged so concurrent roles are never double-counted. Only month-precise
// dates count toward verified totals; partial dates are excluded and surfaced.
import type { ExperienceSummary, ExperienceType, RelevanceTag } from "@domain/types";
import { normalizeDate, toMonthIndex } from "@normalization/dates";

export interface Interval { start: number; endExclusive: number }

export function unionMonths(intervals: Interval[]): number {
  const valid = intervals.filter((i) => i.endExclusive > i.start);
  if (valid.length === 0) return 0;
  const sorted = [...valid].sort((a, b) => a.start - b.start);
  let start = sorted[0]!.start;
  let end = sorted[0]!.endExclusive;
  let total = 0;
  for (const cur of sorted.slice(1)) {
    if (cur.start <= end) end = Math.max(end, cur.endExclusive);
    else {
      total += end - start;
      start = cur.start;
      end = cur.endExclusive;
    }
  }
  return total + (end - start);
}

export interface ExperienceEntry {
  title: string;
  experienceType: ExperienceType;
  relevance: RelevanceTag;
  startDate: string | null;
  endDate: string | null;
}

export type DateStatus = "COMPLETE" | "PARTIAL" | "UNCERTAIN" | "MISSING";

/** Converts one entry to an interval, or explains why it cannot be used. */
export function toInterval(
  e: ExperienceEntry,
  referenceMonth: string,
): { interval: Interval | null; status: DateStatus; note?: string } {
  const s = normalizeDate(e.startDate);
  const en = normalizeDate(e.endDate);
  if (s.precision === "MISSING") return { interval: null, status: "MISSING", note: "no start date" };
  if (s.precision !== "MONTH") return { interval: null, status: s.precision === "YEAR" ? "PARTIAL" : "UNCERTAIN", note: `start "${e.startDate}" not month-precise` };
  const start = toMonthIndex(s.value!);
  let endExclusive: number;
  if (en.precision === "PRESENT") endExclusive = toMonthIndex(referenceMonth) + 1;
  else if (en.precision === "MONTH") endExclusive = toMonthIndex(en.value!) + 1;
  else return { interval: null, status: en.precision === "YEAR" ? "PARTIAL" : "UNCERTAIN", note: `end "${e.endDate ?? "missing"}" not month-precise` };
  if (endExclusive <= start) return { interval: null, status: "UNCERTAIN", note: "end date precedes start date" };
  if (endExclusive > toMonthIndex(referenceMonth) + 1) return { interval: null, status: "UNCERTAIN", note: "end date is in the future" };
  return { interval: { start, endExclusive }, status: "COMPLETE" };
}

export function summarizeExperience(entries: ExperienceEntry[], referenceMonth: string): ExperienceSummary {
  const buckets: Record<string, Interval[]> = { lcaPro: [], lcaIntern: [], lcaAcad: [], uiux: [], pro: [] };
  const warnings: string[] = [];
  let excluded = 0;
  for (const e of entries) {
    const r = toInterval(e, referenceMonth);
    if (!r.interval) {
      if (e.relevance !== "UNRELATED" || e.experienceType === "PROFESSIONAL") {
        excluded++;
        warnings.push(`"${e.title}": ${r.note}; excluded from duration totals.`);
      }
      continue;
    }
    const lca = e.relevance === "LCA_DIRECT";
    if (e.experienceType === "PROFESSIONAL") buckets.pro!.push(r.interval);
    if (lca && e.experienceType === "PROFESSIONAL") buckets.lcaPro!.push(r.interval);
    if (lca && e.experienceType === "INTERNSHIP") buckets.lcaIntern!.push(r.interval);
    if (lca && e.experienceType === "ACADEMIC_RESEARCH") buckets.lcaAcad!.push(r.interval);
    if (e.relevance === "UIUX_DIRECT" || e.relevance === "UIUX_RELATED") buckets.uiux!.push(r.interval);
  }
  return {
    lcaProfessionalMonths: unionMonths(buckets.lcaPro!),
    lcaInternshipMonths: unionMonths(buckets.lcaIntern!),
    lcaAcademicMonths: unionMonths(buckets.lcaAcad!),
    uiuxMonths: unionMonths(buckets.uiux!),
    totalProfessionalMonths: unionMonths(buckets.pro!),
    excludedForDates: excluded,
    warnings,
  };
}
