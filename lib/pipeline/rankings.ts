// Builds a fresh ranking snapshot per role from current profiles (LLD §15).
// Ordering is computed by the pure rank() function; the database only stores it.
import { adminClient } from "@/lib/supabase/admin";
import { RUBRICS, ACTIVE_LCA_SCENARIO } from "@domain/rubrics";
import { VERSIONS } from "@domain/versions";
import { rank } from "@scoring/assess";
import type { JobKey } from "@domain/types";

export const activeScoringVersion = () => `${VERSIONS.scoring}+${ACTIVE_LCA_SCENARIO}`;

export async function rebuildRanking(jobKey: JobKey): Promise<{ snapshotId: string; count: number }> {
  const db = adminClient();
  const rubric = RUBRICS[jobKey];
  const scoringVersion = activeScoringVersion();
  const { data: job } = await db.from("jobs").select("id").eq("job_key", jobKey).eq("jd_version", rubric.jdVersion).single();
  const { data, error } = await db
    .from("candidate_assessments")
    .select("id, candidate_id, score, primary_points, review_flags, candidates!inner(candidate_ref, archived_at), candidate_profiles!inner(is_current)")
    .eq("job_id", job!.id)
    .eq("rubric_version", rubric.rubricVersion)
    .eq("scoring_version", scoringVersion)
    .eq("candidate_profiles.is_current", true)
    .is("candidates.archived_at", null);
  if (error) throw new Error(`PERSISTENCE_ERROR: ${error.message}`);

  const ranked = rank(
    (data ?? []).map((a) => ({
      assessmentId: a.id,
      candidateId: a.candidate_id,
      candidateRef: (a.candidates as unknown as { candidate_ref: string }).candidate_ref,
      score: Number(a.score),
      primaryPoints: Number(a.primary_points),
      reviewFlagCount: (a.review_flags as string[]).length,
    })),
  );
  const { data: snapshotId, error: sErr } = await db.rpc("save_ranking_snapshot", {
    p_job_key: jobKey, p_jd_version: rubric.jdVersion, p_rubric_version: rubric.rubricVersion,
    p_scoring_version: scoringVersion,
    p_items: ranked.map((r) => ({
      assessment_id: r.assessmentId, candidate_id: r.candidateId, rank_position: r.rankPosition,
      score: r.score, tie_break: r.tieBreak,
    })),
  });
  if (sErr) throw new Error(`PERSISTENCE_ERROR: ${sErr.message}`);
  return { snapshotId: snapshotId as string, count: ranked.length };
}

export const rebuildAllRankings = async () =>
  Promise.all((Object.keys(RUBRICS) as JobKey[]).map((k) => rebuildRanking(k)));
