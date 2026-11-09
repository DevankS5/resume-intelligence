// Synthetic test fixtures. NOT candidate data: built by hand to exercise scoring rules.
import type { NormalizedProfile, ProfileCriterionEvidence } from "@domain/profile";
import type { VerifiedEvidence } from "@domain/types";
import { summarizeExperience } from "@scoring/experience";

export const ev = (quote: string, section = "Experience", verified = true): VerifiedEvidence => ({
  quote, section, verified, locator: verified ? { sourceDocumentId: "fixture", locatorLabel: "fixture" } : null,
});

export const crit = (
  criterionKey: string, state: "DIRECT" | "RELATED", quote: string, section = "Experience", verified = true,
): ProfileCriterionEvidence => ({ criterionKey, state, rationale: "fixture", evidence: [ev(quote, section, verified)] });

export function profile(p: Partial<NormalizedProfile> = {}): NormalizedProfile {
  const experience = p.experience ?? [];
  return {
    normalizationVersion: "test",
    referenceMonth: "2026-11",
    summary: null,
    experience,
    education: [],
    tools: [],
    skills: [],
    projects: [],
    certifications: [],
    languages: [],
    portfolioUrls: [],
    criterionEvidence: [],
    confirmations: [],
    experienceSummary: summarizeExperience(experience, "2026-11"),
    missingInformation: [],
    suspiciousContent: [],
    evidenceStats: { total: 10, verified: 10 },
    ...p,
  };
}

export const HIGH_QUALITY = { status: "HIGH" as const, checks: [], reviewRequired: false };
