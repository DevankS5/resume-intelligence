import { describe, expect, it } from "vitest";
import { assessRole, classify, rank, MULTIPLIERS } from "@scoring/assess";
import { evaluateCriterion } from "@scoring/criteria";
import { LCA_RUBRIC, UIUX_RUBRIC, validateRubric } from "@domain/rubrics";
import { crit, ev, HIGH_QUALITY, profile } from "../fixtures/profiles";

describe("rubric configuration", () => {
  it("both V1 rubrics are valid and total 100", () => {
    expect(validateRubric(LCA_RUBRIC)).toEqual([]);
    expect(validateRubric(UIUX_RUBRIC)).toEqual([]);
  });
  it("rejects a rubric whose weights do not total 100", () => {
    const bad = { ...LCA_RUBRIC, criteria: LCA_RUBRIC.criteria.map((c, i) => (i === 0 ? { ...c, weight: 11 } : c)) };
    expect(validateRubric(bad)).toContain("weights total 101, expected 100");
  });
});

describe("evidence multipliers", () => {
  it("DIRECT=1, RELATED=0.5, NOT_EVIDENCED=0, UNCERTAIN=0", () => {
    expect(MULTIPLIERS).toEqual({ DIRECT: 1, RELATED: 0.5, NOT_EVIDENCED: 0, UNCERTAIN: 0 });
  });
});

describe("criterion guards", () => {
  it("OpenLCA never satisfies the GaBi/SimaPro criterion", () => {
    const p = profile({
      criterionEvidence: [crit("lca_software", "DIRECT", "Modelled product systems in OpenLCA")],
      tools: [{ rawName: "OpenLCA", canonical: "OpenLCA", category: "LCA software", usage: "DEMONSTRATED", evidence: [ev("OpenLCA")] }],
    });
    const d = evaluateCriterion("lca_software", p, 2);
    expect(d.state).toBe("RELATED");
    expect(d.explanation).toMatch(/OpenLCA .* does not satisfy/);
  });
  it("GaBi demonstrated in a project is DIRECT", () => {
    const p = profile({
      criterionEvidence: [crit("lca_software", "DIRECT", "Built cradle-to-gate models in GaBi for 3 clients")],
      tools: [{ rawName: "GaBi", canonical: "GaBi", category: "LCA software", usage: "DEMONSTRATED", evidence: [ev("GaBi")] }],
    });
    expect(evaluateCriterion("lca_software", p, 2).state).toBe("DIRECT");
  });
  it("a keyword in a skills list is never DIRECT (keyword stuffing)", () => {
    const p = profile({ criterionEvidence: [crit("figma_prototyping", "DIRECT", "Figma, Prototyping, SimaPro, GaBi", "Skills")] });
    expect(evaluateCriterion("figma_prototyping", p, 2).state).toBe("RELATED");
  });
  it("claims whose quotes are not in the source become UNCERTAIN with a review flag", () => {
    const p = profile({ criterionEvidence: [crit("user_research", "DIRECT", "Ran 40 user interviews", "Projects", false)] });
    const d = evaluateCriterion("user_research", p, 2);
    expect(d.state).toBe("UNCERTAIN");
    expect(d.reviewRequired).toBe(true);
  });
  it("visual design is capped at RELATED without portfolio inspection", () => {
    const p = profile({ criterionEvidence: [crit("visual_design", "DIRECT", "Designed brand identity and visual language for app", "Projects")] });
    expect(evaluateCriterion("visual_design", p, 2).state).toBe("RELATED");
  });
  it("emissions-inventory wording without LCA vocabulary does not become direct project delivery", () => {
    const p = profile({ criterionEvidence: [crit("lca_project_delivery", "DIRECT", "Prepared GHG emissions inventory for plant")] });
    expect(evaluateCriterion("lca_project_delivery", p, 2).state).toBe("RELATED");
  });
});

describe("LCA experience scenarios", () => {
  const twoAndHalfYears = profile({
    experience: [{
      title: "LCA Consultant", organization: null, startDate: "2024-01", endDate: "2026-06",
      experienceType: "PROFESSIONAL", relevance: "LCA_DIRECT", dateStatus: "COMPLETE", evidence: [],
    }],
  });
  it("meets the detailed-JD 2-year baseline", () => {
    expect(evaluateCriterion("lca_experience", twoAndHalfYears, 2).state).toBe("DIRECT");
  });
  it("is only RELATED under the 4-year sensitivity scenario", () => {
    expect(evaluateCriterion("lca_experience", twoAndHalfYears, 4).state).toBe("RELATED");
  });
  it("the scenario is recorded in the scoring version", () => {
    expect(assessRole("LCA_CONSULTANT", twoAndHalfYears, HIGH_QUALITY, "problem_summary_sensitivity").scoringVersion)
      .toMatch(/problem_summary_sensitivity$/);
  });
});

describe("assessRole", () => {
  const p = profile({
    criterionEvidence: [
      crit("lci_data", "DIRECT", "Collected and validated life cycle inventory data from 12 suppliers"),
      crit("iso_modelling", "RELATED", "Familiar with ISO 14040"),
      crit("figma_prototyping", "DIRECT", "Designed onboarding flow and clickable prototype in Figma", "Projects"),
    ],
  });
  it("computes points as weight x multiplier and sums them", () => {
    const lca = assessRole("LCA_CONSULTANT", p, HIGH_QUALITY);
    expect(lca.criteria.find((c) => c.key === "lci_data")!.points).toBe(15);
    expect(lca.criteria.find((c) => c.key === "iso_modelling")!.points).toBe(7.5);
    expect(lca.score).toBe(22.5);
  });
  it("assesses the two roles independently", () => {
    expect(assessRole("UIUX_INTERN", p, HIGH_QUALITY).score).toBe(20);
  });
  it("is deterministic for identical input", () => {
    expect(assessRole("LCA_CONSULTANT", p, HIGH_QUALITY)).toEqual(assessRole("LCA_CONSULTANT", p, HIGH_QUALITY));
  });
  it("does not penalise a UI/UX candidate for having no employment history", () => {
    expect(UIUX_RUBRIC.criteria.some((c) => /experience$/.test(c.key) && c.key !== "interface_experience")).toBe(false);
  });
  it("logistics are confirmation items, never failures", () => {
    const m = assessRole("LCA_CONSULTANT", p, HIGH_QUALITY).mandatory;
    expect(m.find((x) => x.key === "relocation")!.status).toBe("CANDIDATE_CONFIRMATION_REQUIRED");
  });
});

describe("classify", () => {
  it.each([
    [70, 60, true, "BOTH"],
    [70, 40, true, "LCA_STRONGER"],
    [30, 65, true, "UIUX_STRONGER"],
    [20, 10, true, "NEITHER_EVIDENCED"],
    [60, 55, true, "BOTH"],
    [58, 50, true, "UNCERTAIN"], // qualifies but margin < 10
    [90, 10, false, "UNCERTAIN"], // unreliable extraction always uncertain
  ] as const)("LCA %d / UIUX %d / reliable %s -> %s", (l, u, r, want) => {
    expect(classify(l, u, r)).toBe(want);
  });
});

describe("rank", () => {
  it("orders by score, then primary criterion, then flags, then reference", () => {
    const out = rank([
      { candidateId: "a", candidateRef: "CAND-0003", score: 50, primaryPoints: 10, reviewFlagCount: 0 },
      { candidateId: "b", candidateRef: "CAND-0001", score: 50, primaryPoints: 20, reviewFlagCount: 2 },
      { candidateId: "c", candidateRef: "CAND-0002", score: 50, primaryPoints: 10, reviewFlagCount: 0 },
      { candidateId: "d", candidateRef: "CAND-0004", score: 80, primaryPoints: 0, reviewFlagCount: 5 },
    ]);
    expect(out.map((r) => r.candidateId)).toEqual(["d", "b", "c", "a"]);
    expect(out[3]!.tieBreak).toBe("candidate reference");
    expect(out.map((r) => r.rankPosition)).toEqual([1, 2, 3, 4]);
  });
});
