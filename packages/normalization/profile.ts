// Turns schema-valid model output into a NormalizedProfile: every quote verified against
// the source, tools canonicalised, dates checked, experience intervals unioned.
// The raw model output is stored separately and never modified (Workflow standard §13.1).
import type { ParsedBlock, VerifiedEvidence } from "@domain/types";
import type { NormalizedProfile } from "@domain/profile";
import type { CandidateExtraction } from "@schemas/extraction";
import { VERSIONS } from "@domain/versions";
import { buildEvidenceIndex, verifyAll } from "@extraction/verify";
import { summarizeExperience, toInterval } from "@scoring/experience";
import { canonicalTool } from "./aliases";

const SAFE_URL = /^https?:\/\/[^\s<>"']+$/i;

export function normalizeProfile(
  x: CandidateExtraction,
  blocks: ParsedBlock[],
  referenceMonth: string,
): NormalizedProfile {
  const index = buildEvidenceIndex(blocks);
  let total = 0;
  let verified = 0;
  const v = (list: Parameters<typeof verifyAll>[1]): VerifiedEvidence[] => {
    const out = verifyAll(index, list);
    total += out.length;
    verified += out.filter((e) => e.verified).length;
    return out;
  };

  const experience = x.experience.map((e) => ({
    title: e.title,
    organization: e.organization,
    startDate: e.startDate,
    endDate: e.endDate,
    experienceType: e.experienceType,
    relevance: e.relevance,
    dateStatus: toInterval(e, referenceMonth).status,
    evidence: v(e.evidence),
  }));

  return {
    normalizationVersion: VERSIONS.normalization,
    referenceMonth,
    summary: x.professionalSummary,
    experience,
    education: x.education.map((e) => ({ ...e, evidence: v(e.evidence) })),
    tools: x.tools.map((t) => ({ rawName: t.rawName, ...canonicalTool(t.rawName), usage: t.usage, evidence: v(t.evidence) })),
    skills: [...new Set(x.skills.map((s) => s.trim()).filter(Boolean))],
    projects: x.projects.map((p) => ({ ...p, tools: p.tools.map((t) => canonicalTool(t).canonical), evidence: v(p.evidence) })),
    certifications: x.certifications.map((c) => ({ ...c, evidence: v(c.evidence) })),
    languages: x.languages,
    // Only well-formed http(s) links are kept; they are rendered as text links, never fetched.
    portfolioUrls: x.portfolioUrls.filter((u) => SAFE_URL.test(u)).slice(0, 5),
    criterionEvidence: x.criterionEvidence.map((c) => ({ ...c, evidence: v(c.evidence) })),
    confirmations: x.confirmations.map((c) => ({ item: c.item, evidence: v(c.evidence) })),
    experienceSummary: summarizeExperience(experience, referenceMonth),
    missingInformation: x.missingInformation,
    suspiciousContent: x.suspiciousContent,
    evidenceStats: { total, verified },
  };
}
