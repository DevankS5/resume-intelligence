// The canonical analysis path shared by the batch importer and live uploads
// (Construction §5.2): parsed document → extraction → schema check → evidence
// verification → normalization → quality → two independent assessments → classification.
// No I/O except the injected provider, so it is unit-testable end to end.
import type { Classification, ExtractionQuality, ParsedDocument, RoleAssessment } from "@domain/types";
import type { NormalizedProfile } from "@domain/profile";
import { PipelineError } from "@domain/errors";
import { VERSIONS } from "@domain/versions";
import { RUBRICS } from "@domain/rubrics";
import { CandidateExtractionSchema } from "@schemas/extraction";
import type { ExtractionProvider } from "@extraction/gemini";
import { normalizeText } from "@normalization/text";
import { normalizeProfile } from "@normalization/profile";
import { assessQuality } from "@scoring/quality";
import { assessRole, classify } from "@scoring/assess";

export interface AnalysisResult {
  rawModelOutput: unknown;
  profile: NormalizedProfile;
  quality: ExtractionQuality;
  assessments: RoleAssessment[];
  classification: Classification;
  provider: { provider: string; model: string };
}

export async function analyzeResume(
  parsed: ParsedDocument,
  provider: ExtractionProvider,
  referenceMonth: string,
): Promise<AnalysisResult> {
  const raw = await provider.extract(normalizeText(parsed.text));
  const checked = CandidateExtractionSchema.safeParse(raw);
  if (!checked.success) {
    throw new PipelineError("INVALID_MODEL_OUTPUT", checked.error.issues.slice(0, 3).map((i) => `${i.path.join(".")}: ${i.message}`).join("; "));
  }
  const profile = normalizeProfile(checked.data, parsed.blocks, referenceMonth);
  const quality = assessQuality(parsed, profile);
  const assessments = [
    assessRole("LCA_CONSULTANT", profile, quality),
    assessRole("UIUX_INTERN", profile, quality),
  ];
  const reliable = quality.status === "HIGH" || quality.status === "MEDIUM";
  return {
    rawModelOutput: raw,
    profile,
    quality,
    assessments,
    classification: classify(assessments[0]!.score, assessments[1]!.score, reliable),
    provider: { provider: provider.provider, model: provider.model },
  };
}

/** Payload for the persist_assessment_bundle database function. */
export function toBundle(
  ids: { resumeId: string; candidateId: string; parsedDocumentId: string },
  a: AnalysisResult,
) {
  return {
    resume_id: ids.resumeId,
    candidate_id: ids.candidateId,
    parsed_document_id: ids.parsedDocumentId,
    extraction: {
      model_provider: a.provider.provider,
      model_name: a.provider.model,
      prompt_version: VERSIONS.prompt,
      schema_version: VERSIONS.extractionSchema,
      raw_model_output: a.rawModelOutput,
    },
    profile: {
      normalization_version: VERSIONS.normalization,
      normalized_profile: a.profile,
      extraction_quality: a.quality,
      classification: a.classification,
      classification_version: VERSIONS.classification,
    },
    assessments: a.assessments.map((r) => ({
      job_key: r.jobKey,
      jd_version: r.jdVersion,
      rubric_version: r.rubricVersion,
      scoring_version: r.scoringVersion,
      score: r.score,
      score_band: r.band,
      primary_points: r.criteria.find((c) => c.key === primaryOf(r))?.points ?? 0,
      review_flags: r.reviewFlags,
      mandatory: r.mandatory,
      criteria: r.criteria.map((c) => ({
        criterion_key: c.key,
        evidence_state: c.state,
        multiplier: c.multiplier,
        criterion_weight: c.weight,
        points_awarded: c.points,
        evidence: c.evidence,
        explanation: c.explanation,
        review_required: c.reviewRequired,
      })),
    })),
  };
}

const primaryOf = (r: RoleAssessment) => RUBRICS[r.jobKey].primaryCriterion;
