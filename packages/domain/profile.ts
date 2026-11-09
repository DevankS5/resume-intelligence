// The validated, normalized candidate profile: the only input the scoring engine sees.
// Stored as candidate_profiles.normalized_profile (one immutable row per profile version).
import type { ExperienceSummary, ExperienceType, RelevanceTag, VerifiedEvidence } from "./types";

export interface ProfileExperience {
  title: string;
  organization: string | null;
  startDate: string | null;
  endDate: string | null;
  experienceType: ExperienceType;
  relevance: RelevanceTag;
  dateStatus: "COMPLETE" | "PARTIAL" | "UNCERTAIN" | "MISSING";
  evidence: VerifiedEvidence[];
}

export interface ProfileTool {
  rawName: string;
  canonical: string;
  category: string | null;
  usage: "DEMONSTRATED" | "LISTED_ONLY";
  evidence: VerifiedEvidence[];
}

export interface ProfileProject {
  title: string | null;
  description: string | null;
  isLcaStudy: boolean;
  claimedCompletion: "COMPLETED" | "ONGOING" | "UNCLEAR" | "NOT_STATED";
  tools: string[];
  evidence: VerifiedEvidence[];
}

export interface ProfileCriterionEvidence {
  criterionKey: string;
  state: "DIRECT" | "RELATED";
  rationale: string;
  evidence: VerifiedEvidence[];
}

export interface NormalizedProfile {
  normalizationVersion: string;
  referenceMonth: string;
  summary: string | null;
  experience: ProfileExperience[];
  education: Array<{
    qualification: string | null;
    field: string | null;
    institution: string | null;
    endYear: number | null;
    evidence: VerifiedEvidence[];
  }>;
  tools: ProfileTool[];
  skills: string[];
  projects: ProfileProject[];
  certifications: Array<{ name: string; issuer: string | null; evidence: VerifiedEvidence[] }>;
  languages: Array<{ name: string; proficiency: string | null }>;
  portfolioUrls: string[];
  criterionEvidence: ProfileCriterionEvidence[];
  confirmations: Array<{ item: string; evidence: VerifiedEvidence[] }>;
  experienceSummary: ExperienceSummary;
  missingInformation: string[];
  suspiciousContent: string[];
  evidenceStats: { total: number; verified: number };
}
