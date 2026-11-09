import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { rubricSeedSql } from "../../scripts/reports/rubric-seed";

describe("rubric seed migration", () => {
  it("matches the TypeScript rubric config exactly (no drift between DB and engine)", () => {
    const committed = readFileSync("supabase/migrations/20261109080200_seed_rubrics_v1.sql", "utf8");
    expect(committed).toBe(rubricSeedSql());
  });
});
