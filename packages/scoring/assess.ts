// Role assessment, classification and ranking (LLD §12, §14, §15). Pure functions:
// the same profile + versions always produce the same result.
import type {
  Classification, CriterionResult, EvidenceState, ExtractionQuality, JobKey,
  MandatoryCheck, RoleAssessment, ScoreBand, VerifiedEvidence,
} from "@domain/types";
import type { NormalizedProfile } from "@domain/profile";
import {
  ACTIVE_LCA_SCENARIO, CLASSIFICATION_RULES, LCA_EXPERIENCE_SCENARIOS, RUBRICS,
  type LcaScenarioKey,
} from "@domain/rubrics";
import { VERSIONS } from "@domain/versions";
import { completedLcaProjects, evaluateCriterion, statedLcaProjectCount } from "./criteria";

export const MULTIPLIERS: Record<EvidenceState, number> = { DIRECT: 1, RELATED: 0.5, NOT_EVIDENCED: 0, UNCERTAIN: 0 };

export function bandFor(score: number): ScoreBand {
  const t = RUBRICS.LCA_CONSULTANT.scoreThresholds;
  return score >= t.strong ? "STRONG" : score >= t.potential ? "POTENTIAL" : score >= t.limited ? "LIMITED" : "WEAK";
}

export function assessRole(
  jobKey: JobKey,
  profile: NormalizedProfile,
  quality: ExtractionQuality,
  scenario: LcaScenarioKey = ACTIVE_LCA_SCENARIO,
): RoleAssessment {
  const rubric = RUBRICS[jobKey];
  const minYears = LCA_EXPERIENCE_SCENARIOS[scenario].minimumYears;
  const criteria: CriterionResult[] = rubric.criteria.map((c) => {
    const d = evaluateCriterion(c.key, profile, minYears);
    const multiplier = MULTIPLIERS[d.state];
    return {
      key: c.key, label: c.label, weight: c.weight, state: d.state, multiplier,
      points: c.weight * multiplier, reviewRequired: d.reviewRequired,
      explanation: d.explanation, evidence: d.evidence,
    };
  });
  // Weights are integers and multipliers are 0/0.5/1, so this sum is exact.
  const score = criteria.reduce((s, c) => s + c.points, 0);
  const reviewFlags = criteria.filter((c) => c.reviewRequired).map((c) => `${c.label}: uncertain evidence`);
  if (profile.suspiciousContent.length > 0) reviewFlags.push("Resume contains text addressed to an automated reader (ignored).");
  const unassessable = quality.status === "UNASSESSABLE";
  return {
    jobKey,
    jdVersion: rubric.jdVersion,
    rubricVersion: rubric.rubricVersion,
    scoringVersion: `${VERSIONS.scoring}+${scenario}`,
    score,
    band: unassessable ? "UNASSESSABLE" : bandFor(score),
    criteria,
    mandatory: jobKey === "LCA_CONSULTANT" ? lcaMandatory(profile, criteria) : uiuxMandatory(criteria),
    reviewFlags,
  };
}

const verifiedOf = (p: NormalizedProfile, item: string): VerifiedEvidence[] =>
  p.confirmations.filter((c) => c.item === item).flatMap((c) => c.evidence.filter((e) => e.verified));

function confirmation(p: NormalizedProfile, key: string, label: string, item: string): MandatoryCheck {
  const ev = verifiedOf(p, item);
  return ev.length > 0
    ? { key, label, status: "STATED_IN_RESUME", detail: "Stated in the resume; confirm with the candidate.", evidence: ev }
    : { key, label, status: "CANDIDATE_CONFIRMATION_REQUIRED", detail: "Not stated in the resume. Ask the candidate; this is not a disqualification.", evidence: [] };
}

function lcaMandatory(p: NormalizedProfile, criteria: CriterionResult[]): MandatoryCheck[] {
  const sw = criteria.find((c) => c.key === "lca_software")!;
  const delivery = criteria.find((c) => c.key === "lca_project_delivery")!;
  const projects = Math.max(completedLcaProjects(p), statedLcaProjectCount(delivery.evidence));
  const english = p.languages.some((l) => /english/i.test(l.name));
  return [
    {
      key: "gabi_simapro", label: "Hands-on GaBi or SimaPro",
      status: sw.state === "DIRECT" ? "ESTABLISHED" : "NOT_ESTABLISHED",
      detail: sw.state === "DIRECT" ? "Demonstrated in context." : "Not established by the resume. " + sw.explanation,
      evidence: sw.evidence,
    },
    {
      key: "three_projects", label: "At least three completed LCA projects",
      status: projects >= 3 ? "ESTABLISHED" : "NOT_ESTABLISHED",
      detail: `${projects} completed LCA project(s) evidenced (distinct project entries or an explicit count in a verified quote).`,
      evidence: projects > 0 ? delivery.evidence : [],
    },
    confirmation(p, "onsite", "Onsite at Chennai client site", "ONSITE"),
    confirmation(p, "relocation", "Willing to relocate", "RELOCATION"),
    confirmation(p, "travel", "Willing to travel across India", "TRAVEL"),
    confirmation(p, "commitment", "Minimum one-year commitment", "ONE_YEAR_COMMITMENT"),
    english
      ? { key: "english", label: "Fluent English", status: "STATED_IN_RESUME", detail: "English listed as a language; confirm fluency in screening.", evidence: verifiedOf(p, "ENGLISH") }
      : confirmation(p, "english", "Fluent English", "ENGLISH"),
  ];
}

function uiuxMandatory(criteria: CriterionResult[]): MandatoryCheck[] {
  const research = criteria.find((c) => c.key === "user_research")!;
  return [
    {
      key: "user_psychology", label: "Strong understanding of user psychology",
      status: research.state === "DIRECT" ? "ESTABLISHED" : "NOT_ESTABLISHED",
      detail: research.state === "DIRECT" ? "User research methods are described." : "Not established by the resume; explore in interview.",
      evidence: research.evidence,
    },
    {
      key: "aesthetic", label: "Strong aesthetic sense / creative outlook",
      status: "CANDIDATE_CONFIRMATION_REQUIRED",
      detail: "Cannot be judged from resume text. Requires portfolio review by a person.",
      evidence: [],
    },
  ];
}

/** Cross-role routing label (LLD §14). Never a rejection. */
export function classify(lca: number, uiux: number, reliable: boolean): Classification {
  const { qualifying, margin, neitherBelow } = CLASSIFICATION_RULES;
  if (!reliable) return "UNCERTAIN";
  if (lca >= qualifying && uiux >= qualifying) return "BOTH";
  if (lca >= qualifying && lca - uiux >= margin) return "LCA_STRONGER";
  if (uiux >= qualifying && uiux - lca >= margin) return "UIUX_STRONGER";
  if (lca < neitherBelow && uiux < neitherBelow) return "NEITHER_EVIDENCED";
  return "UNCERTAIN";
}

export interface RankRow {
  candidateId: string;
  candidateRef: string;
  score: number;
  primaryPoints: number;
  reviewFlagCount: number;
}

/** Deterministic order: score, primary criterion, fewer flags, then stable reference. */
export function rank<T extends RankRow>(rows: T[]): Array<T & { rankPosition: number; tieBreak: string | null }> {
  const sorted = [...rows].sort(
    (a, b) =>
      b.score - a.score ||
      b.primaryPoints - a.primaryPoints ||
      a.reviewFlagCount - b.reviewFlagCount ||
      a.candidateRef.localeCompare(b.candidateRef),
  );
  return sorted.map((r, i) => {
    const prev = sorted[i - 1];
    let tieBreak: string | null = null;
    if (prev && prev.score === r.score) {
      tieBreak =
        prev.primaryPoints !== r.primaryPoints ? "primary criterion points" :
        prev.reviewFlagCount !== r.reviewFlagCount ? "fewer review flags" : "candidate reference";
    }
    return { ...r, rankPosition: i + 1, tieBreak };
  });
}
