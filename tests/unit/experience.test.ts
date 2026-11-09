import { describe, expect, it } from "vitest";
import { summarizeExperience, toInterval, unionMonths, type ExperienceEntry } from "@scoring/experience";
import { normalizeDate, toMonthIndex } from "@normalization/dates";

const REF = "2026-11";
const e = (p: Partial<ExperienceEntry>): ExperienceEntry => ({
  title: "Role", experienceType: "PROFESSIONAL", relevance: "LCA_DIRECT", startDate: null, endDate: null, ...p,
});

describe("normalizeDate", () => {
  it.each([
    ["Jun 2022", "2022-06", "MONTH"],
    ["September 2021", "2021-09", "MONTH"],
    ["Sept 2021", "2021-09", "MONTH"],
    ["09/2024", "2024-09", "MONTH"],
    ["2023-06", "2023-06", "MONTH"],
    ["2022", "2022", "YEAR"],
    ["Present", null, "PRESENT"],
    ["Current", null, "PRESENT"],
    ["Smarch 2022", null, "INVALID"],
    ["", null, "MISSING"],
  ])("%s -> %s", (raw, value, precision) => {
    expect(normalizeDate(raw)).toEqual({ value, precision });
  });
});

describe("unionMonths", () => {
  it("sums non-overlapping intervals", () => {
    expect(unionMonths([{ start: 0, endExclusive: 6 }, { start: 12, endExclusive: 18 }])).toBe(12);
  });
  it("merges overlapping intervals", () => {
    expect(unionMonths([{ start: 0, endExclusive: 12 }, { start: 6, endExclusive: 18 }])).toBe(18);
  });
  it("merges contiguous intervals and ignores duplicates", () => {
    expect(unionMonths([{ start: 0, endExclusive: 6 }, { start: 6, endExclusive: 12 }, { start: 0, endExclusive: 6 }])).toBe(12);
  });
  it("ignores empty or inverted intervals", () => {
    expect(unionMonths([{ start: 5, endExclusive: 5 }, { start: 9, endExclusive: 3 }])).toBe(0);
  });
});

describe("toInterval", () => {
  it("counts the end month inclusively", () => {
    expect(toInterval(e({ startDate: "2023-01", endDate: "2023-06" }), REF).interval).toEqual({
      start: toMonthIndex("2023-01"), endExclusive: toMonthIndex("2023-07"),
    });
  });
  it("uses the fixed reference month for current roles", () => {
    const r = toInterval(e({ startDate: "2026-01", endDate: "Present" }), REF);
    expect(r.interval!.endExclusive - r.interval!.start).toBe(11);
  });
  it("excludes year-only dates as PARTIAL", () => {
    expect(toInterval(e({ startDate: "2019", endDate: "2021" }), REF).status).toBe("PARTIAL");
  });
  it("flags end before start and future end dates", () => {
    expect(toInterval(e({ startDate: "2024-05", endDate: "2023-01" }), REF).status).toBe("UNCERTAIN");
    expect(toInterval(e({ startDate: "2025-06", endDate: "2026-12" }), REF).status).toBe("UNCERTAIN");
  });
});

describe("summarizeExperience", () => {
  it("keeps professional, internship and academic LCA separate and merges overlap", () => {
    const s = summarizeExperience([
      e({ startDate: "2022-01", endDate: "2022-12" }),
      e({ startDate: "2022-07", endDate: "2023-06" }), // overlaps 6 months
      e({ experienceType: "INTERNSHIP", startDate: "2021-06", endDate: "2021-08" }),
      e({ experienceType: "ACADEMIC_RESEARCH", startDate: "2020-01", endDate: "2020-12" }),
      e({ relevance: "UIUX_DIRECT", experienceType: "INTERNSHIP", startDate: "2024-01", endDate: "2024-03" }),
    ], REF);
    expect(s.lcaProfessionalMonths).toBe(18);
    expect(s.lcaInternshipMonths).toBe(3);
    expect(s.lcaAcademicMonths).toBe(12);
    expect(s.uiuxMonths).toBe(3);
  });
  it("does not count academic research as professional employment", () => {
    const s = summarizeExperience([e({ experienceType: "ACADEMIC_RESEARCH", startDate: "2020-01", endDate: "2022-12" })], REF);
    expect(s.lcaProfessionalMonths).toBe(0);
  });
  it("surfaces relevant roles excluded for unusable dates", () => {
    const s = summarizeExperience([e({ startDate: "2019", endDate: "2021" })], REF);
    expect(s.excludedForDates).toBe(1);
    expect(s.warnings[0]).toMatch(/excluded/);
  });
});
