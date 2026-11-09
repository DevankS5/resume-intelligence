// Read-side queries. All run through the user's session, so RLS decides visibility.
import { serverClient } from "@/lib/supabase/server";
import type { JobKey } from "@domain/types";

export const EXPECTED_RECORDS = 47;

export interface OverviewRow {
  candidate_id: string;
  candidate_ref: string;
  review_status: string;
  resume_id: string;
  display_reference: string;
  processing_status: string;
  last_error_code: string | null;
  source_kind: string;
  batch: string | null;
  classification: string | null;
  quality_status: string | null;
  quality_review_required: boolean | null;
  lca_professional_months: number | null;
  uiux_months: number | null;
  lca_score: number | null;
  lca_band: string | null;
  uiux_score: number | null;
  uiux_band: string | null;
  created_at: string;
}

export async function getOverview(): Promise<OverviewRow[]> {
  const db = await serverClient();
  const { data, error } = await db.from("v_candidate_overview").select("*").order("candidate_ref");
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => ({ ...r, lca_score: num(r.lca_score), uiux_score: num(r.uiux_score) }));
}

export interface Account {
  expected: number;
  received: number;
  initial: number;
  uploads: number;
  scored: number;
  review: number;
  failed: number;
  inProgress: number;
}

const SCORED = ["COMPLETED", "REVIEW_REQUIRED"];
const DONE = [...SCORED, "FAILED", "CANCELLED"];

export function accountOf(rows: OverviewRow[]): Account {
  const initial = rows.filter((r) => r.batch === "initial-47").length;
  return {
    expected: EXPECTED_RECORDS,
    received: rows.length,
    initial,
    uploads: rows.length - initial,
    scored: rows.filter((r) => SCORED.includes(r.processing_status)).length,
    review: rows.filter((r) => r.processing_status === "REVIEW_REQUIRED" || r.classification === "UNCERTAIN").length,
    failed: rows.filter((r) => r.processing_status === "FAILED").length,
    inProgress: rows.filter((r) => !DONE.includes(r.processing_status)).length,
  };
}

export interface RankingRow {
  job_key: JobKey;
  snapshot_id: string;
  snapshot_version: number;
  scoring_version: string;
  rubric_version: string;
  snapshot_created_at: string;
  rank_position: number;
  score: number;
  tie_break: string | null;
  candidate_id: string;
  candidate_ref: string;
  review_status: string;
  score_band: string;
  review_flags: string[];
  mandatory: Array<{ key: string; label: string; status: string }>;
  classification: string;
  quality_status: string;
  experience_summary: { lcaProfessionalMonths: number; uiuxMonths: number; totalProfessionalMonths: number } | null;
  summary: string | null;
}

export async function getRanking(jobKey: JobKey): Promise<RankingRow[]> {
  const db = await serverClient();
  const { data, error } = await db.from("v_latest_rankings").select("*").eq("job_key", jobKey).order("rank_position");
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => ({ ...r, score: Number(r.score) }));
}

export async function getCandidate(candidateId: string) {
  const db = await serverClient();
  const { data: cand } = await db.from("candidates").select("id, candidate_ref, review_status, created_at").eq("id", candidateId).maybeSingle();
  if (!cand) return null;
  const { data: resume } = await db
    .from("resume_documents")
    .select("id, display_reference, original_filename, processing_status, last_error_code, source_documents(id, source_kind, byte_size, sha256, detected_mime_type, created_at)")
    .eq("candidate_id", candidateId).single();
  const [{ data: profile }, { data: parsed }, { data: job }, { data: events }] = await Promise.all([
    db.from("candidate_profiles").select("id, profile_version, normalized_profile, extraction_quality, classification, classification_version, created_at, document_extractions(model_provider, model_name, prompt_version, schema_version)")
      .eq("resume_id", resume!.id).eq("is_current", true).maybeSingle(),
    db.from("parsed_documents").select("parser_name, parser_version, blocks, warnings, unsupported_structures").eq("resume_id", resume!.id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    db.from("processing_jobs").select("id, status, attempt_count, max_attempts, last_error_code, updated_at").eq("resume_id", resume!.id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    db.from("review_events").select("id, event_type, previous_value, new_value, notes, created_at").eq("candidate_id", candidateId).order("created_at", { ascending: false }),
  ]);
  const { data: assessments } = profile
    ? await db.from("candidate_assessments")
        .select("id, score, score_band, jd_version, rubric_version, scoring_version, review_flags, mandatory, created_at, jobs(job_key, title), criterion_assessments(evidence_state, multiplier, criterion_weight, points_awarded, evidence, explanation, review_required, job_criteria(criterion_key, label, display_order))")
        .eq("profile_id", profile.id).order("created_at", { ascending: false })
    : { data: [] };
  return { cand, resume: resume!, profile, parsed, job, events: events ?? [], assessments: assessments ?? [] };
}

const num = (v: unknown) => (v == null ? null : Number(v));
