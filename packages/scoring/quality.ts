// Extraction quality from deterministic checks (LLD §13). Never a model-reported
// confidence, and never used to rank: it only routes records to review.
import type { ExtractionQuality, ParsedDocument, QualityCheckStatus } from "@domain/types";
import type { NormalizedProfile } from "@domain/profile";

export function assessQuality(parsed: ParsedDocument, profile: NormalizedProfile | null): ExtractionQuality {
  const checks: ExtractionQuality["checks"] = [];
  const add = (key: string, label: string, status: QualityCheckStatus, detail: string) =>
    checks.push({ key, label, status, detail });

  add("parser", "Parser readability", parsed.isReadable ? (parsed.warnings.length ? "WARNING" : "PASS") : "FAIL",
    parsed.isReadable ? `${parsed.text.length} characters across ${parsed.blocks.length} blocks.` : "No readable text.");
  add("unsupported", "Content not extracted",
    parsed.unsupportedStructures.length ? "WARNING" : "PASS",
    parsed.unsupportedStructures.length ? parsed.unsupportedStructures.join("; ") : "None detected.");
  const sections = new Set(parsed.blocks.map((b) => b.locator.sectionHeading).filter(Boolean));
  const core = ["experience", "education", "skills", "projects"].filter((s) => sections.has(s)).length;
  add("sections", "Section coverage", core >= 2 ? "PASS" : core === 1 ? "WARNING" : "FAIL",
    `Detected sections: ${[...sections].join(", ") || "none"}.`);
  add("segmentation", "Resume boundary", "PASS", "Individual file: one resume per source document.");

  if (!profile) {
    add("schema", "Structured extraction", "FAIL", "No valid structured extraction.");
    return { status: "UNASSESSABLE", checks, reviewRequired: true };
  }
  add("schema", "Structured extraction", "PASS", "Model output passed the runtime schema.");

  const { total, verified } = profile.evidenceStats;
  const rate = total === 0 ? 0 : verified / total;
  add("evidence", "Evidence verification",
    total === 0 ? "WARNING" : rate >= 0.9 ? "PASS" : rate >= 0.7 ? "WARNING" : "FAIL",
    `${verified} of ${total} quoted passages found verbatim in the source (${Math.round(rate * 100)}%).`);

  const relevant = profile.experience.filter((e) => e.relevance !== "UNRELATED" || e.experienceType === "PROFESSIONAL");
  const badDates = relevant.filter((e) => e.dateStatus !== "COMPLETE").length;
  add("dates", "Date validity", relevant.length === 0 ? "NOT_APPLICABLE" : badDates === 0 ? "PASS" : badDates <= 1 ? "WARNING" : "FAIL",
    relevant.length === 0 ? "No dated experience." : `${relevant.length - badDates} of ${relevant.length} relevant roles have month-precise dates.`);

  add("injection", "Unusual content", profile.suspiciousContent.length ? "WARNING" : "PASS",
    profile.suspiciousContent.length
      ? `Extractor note (never acted on): ${profile.suspiciousContent.join(" ").slice(0, 200)}`
      : "No instructions to automated readers or garbled passages noted.");

  const fails = checks.filter((c) => c.status === "FAIL").length;
  const warns = checks.filter((c) => c.status === "WARNING").length;
  const status = fails > 0 ? "LOW" : warns >= 2 ? "MEDIUM" : "HIGH";
  return { status, checks, reviewRequired: fails > 0 };
}
