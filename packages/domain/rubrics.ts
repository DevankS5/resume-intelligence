// Single source of truth for both rubrics (Description §12, LLD §11).
// UI, scoring and the database seed all read from here; weights are never duplicated.
import type { JobKey } from "./types";

export interface JobCriterionConfig {
  key: string;
  label: string;
  description: string;
  weight: number;
  mandatoryVerification: boolean;
  evidenceGuidance: { direct: string; related: string; notEvidence: string };
  order: number;
}

export interface JobRubricConfig {
  jobKey: JobKey;
  title: string;
  shortTitle: string;
  jdVersion: string;
  rubricVersion: string;
  location: string;
  workMode: string;
  /** Tie-break criterion (LLD §15). */
  primaryCriterion: string;
  scoreThresholds: { strong: number; potential: number; limited: number };
  criteria: JobCriterionConfig[];
}

export const SCORE_THRESHOLDS = { strong: 75, potential: 55, limited: 35 } as const;

/**
 * The detailed JD says 2–3 years; the problem summary says 4–6 (Description §6.8).
 * Both are kept; the detailed JD is the active baseline unless the owner decides otherwise.
 */
export const LCA_EXPERIENCE_SCENARIOS = {
  detailed_jd_baseline: { label: "Detailed JD: 2–3 years", minimumYears: 2, typicalRange: [2, 3] },
  problem_summary_sensitivity: { label: "Problem summary: 4–6 years", minimumYears: 4, typicalRange: [4, 6] },
} as const;
export type LcaScenarioKey = keyof typeof LCA_EXPERIENCE_SCENARIOS;
export const ACTIVE_LCA_SCENARIO: LcaScenarioKey = "detailed_jd_baseline";

export const CLASSIFICATION_RULES = { qualifying: 55, margin: 10, neitherBelow: 35 } as const;

const c = (
  order: number, key: string, label: string, weight: number,
  direct: string, related: string, notEvidence: string, description = label,
): JobCriterionConfig => ({
  key, label, description, weight, mandatoryVerification: false, order,
  evidenceGuidance: { direct, related, notEvidence },
});

export const LCA_RUBRIC: JobRubricConfig = {
  jobKey: "LCA_CONSULTANT",
  title: "Life Cycle Assessment (LCA) Consultant",
  shortTitle: "LCA Consultant",
  jdVersion: "lca-jd-2026-11-v1",
  rubricVersion: "lca-rubric-1.0.0",
  location: "Chennai (client site)",
  workMode: "Onsite, full-time",
  primaryCriterion: "lca_project_delivery",
  scoreThresholds: SCORE_THRESHOLDS,
  criteria: [
    c(1, "lca_experience", "Relevant LCA professional experience", 10,
      "Dated professional roles explicitly doing LCA work, meeting the active experience scenario from non-overlapping intervals.",
      "Some LCA or sustainability experience, or academic LCA research, below the active scenario or not professional.",
      "No relevant experience, or dates/domain cannot be validated."),
    c(2, "lca_project_delivery", "Independent LCA study delivery and completed projects", 20,
      "Distinct LCA studies described as completed, with scope, role or deliverable.",
      "LCA activity in responsibilities or academic work; completion, independence or count unclear.",
      "No LCA project evidence."),
    c(3, "lca_software", "GaBi / SimaPro software proficiency", 15,
      "Hands-on GaBi or SimaPro use in a project or study, with context.",
      "OpenLCA or another LCA tool, or GaBi/SimaPro only listed without context.",
      "No LCA tool evidence."),
    c(4, "lci_data", "LCI data collection, validation and quality control", 15,
      "Collecting, compiling, validating or standardising life-cycle inventory data with quality context.",
      "Environmental, activity or emissions data work without clear LCI context.",
      "No inventory data evidence."),
    c(5, "iso_modelling", "ISO 14040/14044, boundaries, allocation and modelling", 15,
      "Applied ISO 14040/44, system boundaries, allocation or documented modelling assumptions.",
      "Standards listed, or partial methodology without clear application.",
      "No methodology evidence."),
    c(6, "operational_data", "Operational, manufacturing, energy and logistics data", 10,
      "Plant, process, energy, supplier or logistics data gathered for an assessment.",
      "General operations or supply-chain data work without LCA context.",
      "No operational data evidence."),
    c(7, "education", "Environmental education / domain background", 5,
      "Environmental, sustainability or environmental engineering/science degree.",
      "Related engineering or science degree with transferable context.",
      "No relevant education evidence."),
    c(8, "benchmarking_epd", "Benchmarking, research datasets and EPD", 5,
      "Public LCA databases, industry benchmarking or EPD work.",
      "Literature review or secondary data use without explicit LCA benchmarking/EPD.",
      "No relevant evidence."),
    c(9, "stakeholder", "Stakeholder management and communication", 5,
      "Client, supplier or cross-functional engagement with clear ownership.",
      "General teamwork or communication.",
      "No relevant evidence."),
  ],
};

export const UIUX_RUBRIC: JobRubricConfig = {
  jobKey: "UIUX_INTERN",
  title: "UI/UX Design Intern (Growth For Impact)",
  shortTitle: "UI/UX Design Intern",
  jdVersion: "uiux-jd-2026-11-v1",
  rubricVersion: "uiux-rubric-1.0.0",
  location: "Remote",
  workMode: "Remote internship, ₹10–15k/month",
  primaryCriterion: "figma_prototyping",
  scoreThresholds: SCORE_THRESHOLDS,
  criteria: [
    c(1, "figma_prototyping", "Figma and prototyping proficiency", 20,
      "A project explicitly shows Figma use and a prototype or deliverable.",
      "Figma listed without project context, or another prototyping tool with context.",
      "No tool or prototype evidence."),
    c(2, "uxui_principles", "UX/UI principles and human-centred design", 15,
      "Applied UX/UI or human-centred methods in an identifiable design project.",
      "Design thinking or general design vocabulary without a user-centred process.",
      "No relevant evidence."),
    c(3, "user_research", "User research and understanding of psychology", 15,
      "Interviews, usability testing, behavioural insight or validated user-needs work.",
      "General customer/user research without UX methods.",
      "No relevant evidence."),
    c(4, "interface_experience", "Web and product interface design experience", 15,
      "Interface design decisions for a website, app or product (not only implementation).",
      "Web development or product work with little interface-design evidence.",
      "No relevant evidence."),
    c(5, "high_fidelity", "High-fidelity prototypes and design specifications", 10,
      "High-fidelity prototype, interaction flow or design spec tied to a project.",
      "Wireframes, basic prototypes or vague design deliverables.",
      "No relevant evidence."),
    c(6, "visual_design", "Visual design and aesthetic quality evidence", 10,
      "Only after a reviewer inspects a portfolio. V1 does not inspect portfolios, so this caps at Related.",
      "Resume describes visual design work but the artefact was not inspected.",
      "No visual work described."),
    c(7, "responsive_design", "Responsive, multi-device design", 5,
      "Design decisions that explicitly address multiple devices or breakpoints.",
      "Responsive implementation mentioned; design adaptation unclear.",
      "No relevant evidence."),
    c(8, "design_systems", "Design systems and visual consistency", 5,
      "Components, tokens, patterns or a maintained design system.",
      "Brand consistency or reusable UI elements without system-level detail.",
      "No relevant evidence."),
    c(9, "collaboration", "Collaboration and design critique", 5,
      "Design critiques, feedback iteration or cross-functional design delivery.",
      "General collaboration without design-specific review.",
      "No relevant evidence."),
  ],
};

export const RUBRICS: Record<JobKey, JobRubricConfig> = {
  LCA_CONSULTANT: LCA_RUBRIC,
  UIUX_INTERN: UIUX_RUBRIC,
};

export const ALL_CRITERION_KEYS = [...LCA_RUBRIC.criteria, ...UIUX_RUBRIC.criteria].map((x) => x.key);

/** Reject a rubric from activation unless weights are non-negative and total exactly 100. */
export function validateRubric(r: JobRubricConfig): string[] {
  const errors: string[] = [];
  const keys = new Set<string>();
  let total = 0;
  for (const k of r.criteria) {
    if (k.weight < 0) errors.push(`${k.key}: negative weight`);
    if (keys.has(k.key)) errors.push(`${k.key}: duplicate key`);
    keys.add(k.key);
    total += k.weight;
  }
  if (Math.abs(total - 100) > 1e-9) errors.push(`weights total ${total}, expected 100`);
  if (!keys.has(r.primaryCriterion)) errors.push(`primary criterion ${r.primaryCriterion} missing`);
  return errors;
}
