// Deterministic criterion evaluation (LLD §11.4, §12). The model proposes evidence;
// these rules decide the state. Guards encode the spec's hard lines, e.g. OpenLCA never
// satisfies GaBi/SimaPro, a skills-list mention is never DIRECT, visual quality is never
// DIRECT without portfolio inspection.
import type { EvidenceState, ExperienceSummary, VerifiedEvidence } from "@domain/types";
import type { NormalizedProfile } from "@domain/profile";
import { GABI_SIMAPRO, OPENLCA } from "@normalization/aliases";
import { formatMonths } from "@normalization/dates";

export interface CriterionDecision {
  state: EvidenceState;
  reviewRequired: boolean;
  explanation: string;
  evidence: VerifiedEvidence[];
}

const LIST_SECTION = /skill|tool|competenc|software|technolog|expertise|proficien/i;
const isListOnly = (ev: VerifiedEvidence[]) =>
  ev.length > 0 &&
  ev.every((e) => LIST_SECTION.test(e.section ?? "") || LIST_SECTION.test(e.locator?.sectionHeading ?? ""));
const anyQuote = (ev: VerifiedEvidence[], re: RegExp) => ev.some((e) => re.test(e.quote));

/** Per-criterion vocabulary a DIRECT quote must contain; otherwise it is downgraded. */
const DIRECT_VOCAB: Record<string, RegExp> = {
  lca_project_delivery: /\b(lca|life[\s-]*cycle)/i,
  lci_data: /\b(lci|inventor(y|ies))\b/i,
  iso_modelling: /iso\s*1404[04]|boundar|allocation|functional unit|model|assumption/i,
  benchmarking_epd: /\b(epd|environmental product declaration|benchmark|ecoinvent|database)/i,
  figma_prototyping: /figma|prototyp/i,
  high_fidelity: /high[\s-]*fi|prototype|spec|interaction flow|hand[\s-]*off/i,
};

export function evaluateCriterion(
  key: string,
  profile: NormalizedProfile,
  lcaMinimumYears: number,
): CriterionDecision {
  const items = profile.criterionEvidence.filter((c) => c.criterionKey === key);
  const verifiedItems = items
    .map((i) => ({ ...i, evidence: i.evidence.filter((e) => e.verified) }))
    .filter((i) => i.evidence.length > 0);
  const droppedClaims = items.length - verifiedItems.length;
  const evidence = verifiedItems.flatMap((i) => i.evidence);
  const notes: string[] = [];

  let state: EvidenceState = verifiedItems.some((i) => i.state === "DIRECT")
    ? "DIRECT"
    : verifiedItems.length > 0
      ? "RELATED"
      : droppedClaims > 0
        ? "UNCERTAIN"
        : "NOT_EVIDENCED";
  if (droppedClaims > 0) notes.push(`${droppedClaims} proposed claim(s) could not be found in the resume text and were excluded.`);
  const rationale = verifiedItems.find((i) => i.state === state)?.rationale;

  const downgrade = (why: string) => {
    if (state === "DIRECT") {
      state = "RELATED";
      notes.push(why);
    }
  };

  if (key !== "education" && key !== "lca_experience" && isListOnly(evidence)) {
    downgrade("Only appears in a skills/tools list, without demonstrated use.");
  }
  const vocab = DIRECT_VOCAB[key];
  if (vocab && state === "DIRECT" && !anyQuote(evidence, vocab)) {
    downgrade("Quoted evidence does not explicitly show this criterion.");
  }

  if (key === "lca_experience") return lcaExperience(profile.experienceSummary, lcaMinimumYears, state, evidence, notes);

  if (key === "lca_software") {
    const gs = profile.tools.filter((t) => t.canonical === "GaBi" || t.canonical === "SimaPro");
    const demonstrated = gs.some((t) => t.usage === "DEMONSTRATED" && t.evidence.some((e) => e.verified));
    if (state === "DIRECT" && !(demonstrated && anyQuote(evidence, GABI_SIMAPRO))) {
      downgrade(
        anyQuote(evidence, OPENLCA) || profile.tools.some((t) => t.canonical === "OpenLCA")
          ? "OpenLCA is relevant LCA software but does not satisfy the GaBi/SimaPro requirement."
          : "GaBi/SimaPro hands-on use is not demonstrated in context.",
      );
    }
    if (state === "NOT_EVIDENCED") {
      const listed = profile.tools.filter((t) => t.category === "LCA software" && t.evidence.some((e) => e.verified));
      if (listed.length > 0) {
        state = "RELATED";
        evidence.push(...listed.flatMap((t) => t.evidence.filter((e) => e.verified)));
        notes.push(`LCA tool(s) listed: ${listed.map((t) => t.canonical).join(", ")}.`);
      }
    }
  }

  if (key === "lca_project_delivery") {
    const completed = completedLcaProjects(profile);
    notes.push(`${completed} distinct completed LCA project(s) identified with verified evidence.`);
  }

  if (key === "visual_design") {
    downgrade("Visual quality requires portfolio inspection, which V1 does not perform.");
    notes.push("Visual/aesthetic quality has not been independently inspected.");
  }

  return finish(state, evidence, notes, rationale);
}

function lcaExperience(
  s: ExperienceSummary,
  minYears: number,
  proposed: EvidenceState,
  evidence: VerifiedEvidence[],
  notes: string[],
): CriterionDecision {
  const min = minYears * 12;
  const other = s.lcaInternshipMonths + s.lcaAcademicMonths;
  notes.unshift(
    `Verified LCA professional experience: ${formatMonths(s.lcaProfessionalMonths)} (overlaps merged). Active requirement: ${minYears}+ years.` +
      (other > 0 ? ` Plus ${formatMonths(s.lcaInternshipMonths)} internship and ${formatMonths(s.lcaAcademicMonths)} academic LCA work, shown separately.` : ""),
  );
  let state: EvidenceState;
  if (s.lcaProfessionalMonths >= min) state = "DIRECT";
  else if (s.lcaProfessionalMonths > 0 || other > 0 || proposed === "DIRECT" || proposed === "RELATED") state = "RELATED";
  else if (proposed === "UNCERTAIN" || s.excludedForDates > 0) state = "UNCERTAIN";
  else state = "NOT_EVIDENCED";
  if (state === "UNCERTAIN" && s.excludedForDates > 0) notes.push(`${s.excludedForDates} role(s) excluded because dates could not be read reliably.`);
  return finish(state, evidence, notes);
}

export function completedLcaProjects(p: NormalizedProfile): number {
  const seen = new Set<string>();
  for (const pr of p.projects) {
    if (!pr.isLcaStudy || pr.claimedCompletion !== "COMPLETED") continue;
    if (!pr.evidence.some((e) => e.verified)) continue;
    seen.add((pr.title ?? pr.description ?? "").toLowerCase().replace(/\W+/g, " ").trim());
  }
  return seen.size;
}

function finish(state: EvidenceState, evidence: VerifiedEvidence[], notes: string[], rationale?: string): CriterionDecision {
  const head =
    state === "DIRECT" ? "Direct evidence." :
    state === "RELATED" ? "Related or partial evidence." :
    state === "UNCERTAIN" ? "Uncertain: needs reviewer check." :
    "Not evidenced in this resume (absence of evidence is not proof of absence).";
  return {
    state,
    reviewRequired: state === "UNCERTAIN",
    explanation: [head, rationale, ...notes].filter(Boolean).join(" "),
    evidence: dedupe(evidence).slice(0, 4),
  };
}

const dedupe = (ev: VerifiedEvidence[]) => {
  const seen = new Set<string>();
  return ev.filter((e) => !seen.has(e.quote) && seen.add(e.quote));
};
