// Processes one claimed job end to end (LLD §18 state machine). Each stage writes an
// explicit status; failures keep earlier outputs and become RETRY_WAIT (transient) or
// FAILED (permanent). Resume text never reaches the logs.
import { randomUUID } from "node:crypto";
import { adminClient, RESUME_BUCKET } from "@/lib/supabase/admin";
import { logEvent } from "@/lib/observability/log";
import { PipelineError, type ErrorCode } from "@domain/errors";
import { VERSIONS } from "@domain/versions";
import type { ProcessingStatus } from "@domain/types";
import { parseDocument } from "@parsers/index";
import { contentFingerprint, normalizeText } from "@normalization/text";
import { geminiProvider, type ExtractionProvider } from "@extraction/gemini";
import { analyzeResume, toBundle } from "@workflows/analyze";

const referenceMonth = () => process.env.ASSESSMENT_REFERENCE_MONTH || "2026-11";

export interface JobOutcome { jobId: string; status: ProcessingStatus | "SKIPPED"; errorCode?: string }

export async function runJob(jobId: string, provider?: ExtractionProvider): Promise<JobOutcome> {
  const db = adminClient();
  const owner = `worker-${randomUUID().slice(0, 8)}`;
  const { data: claimed, error: claimErr } = await db.rpc("claim_processing_job", { p_job_id: jobId, p_owner: owner });
  if (claimErr) throw new Error(`PERSISTENCE_ERROR: ${claimErr.message}`);
  const job = (claimed as Array<{ id: string; resume_id: string; attempt_count: number; max_attempts: number; correlation_id: string }>)[0];
  if (!job) return { jobId, status: "SKIPPED" }; // already done, leased by another worker, or exhausted

  const ctx = { jobId, correlationId: job.correlation_id, attempt: job.attempt_count };
  const setStatus = async (status: ProcessingStatus, extra: Record<string, unknown> = {}) => {
    await db.from("processing_jobs").update({ status, updated_at: new Date().toISOString(), ...extra }).eq("id", jobId);
    await db.from("resume_documents").update({ processing_status: status, last_error_code: extra.last_error_code ?? null }).eq("id", job.resume_id);
    logEvent("job.status", { ...ctx, status });
  };

  try {
    const { data: resume } = await db
      .from("resume_documents")
      .select("id, candidate_id, original_filename, source_documents(id, storage_path, sha256)")
      .eq("id", job.resume_id).single();
    const src = resume!.source_documents as unknown as { id: string; storage_path: string; sha256: string };

    // ---- PARSING
    const { data: blob, error: dlErr } = await db.storage.from(RESUME_BUCKET).download(src.storage_path);
    if (dlErr || !blob) throw new PipelineError("PARSER_ERROR", "Source object missing from storage");
    const bytes = new Uint8Array(await blob.arrayBuffer());
    const { parsed } = await parseDocument(bytes, resume!.original_filename ?? "resume", src.id);

    const { data: pd, error: pdErr } = await db.from("parsed_documents").upsert({
      resume_id: resume!.id, parser_name: parsed.parserName, parser_version: parsed.parserVersion,
      raw_text: parsed.text, normalized_text: normalizeText(parsed.text), blocks: parsed.blocks,
      page_count: parsed.pageCount ?? null, warnings: parsed.warnings, unsupported_structures: parsed.unsupportedStructures,
      content_fingerprint: contentFingerprint(parsed.text),
    }, { onConflict: "resume_id,parser_version" }).select("id").single();
    if (pdErr) throw new PipelineError("PERSISTENCE_ERROR", pdErr.message);

    // ---- EXTRACTING → VALIDATING_OUTPUT → NORMALIZING → SCORING (inside analyzeResume)
    await setStatus("EXTRACTING");
    const analysis = await analyzeResume(parsed, provider ?? geminiProvider(), referenceMonth());

    await setStatus("SCORING");
    const { error: bErr } = await db.rpc("persist_assessment_bundle", {
      p: toBundle({ resumeId: resume!.id, candidateId: resume!.candidate_id, parsedDocumentId: pd.id }, analysis),
    });
    if (bErr) throw new PipelineError("PERSISTENCE_ERROR", bErr.message);

    const final: ProcessingStatus = analysis.quality.reviewRequired ? "REVIEW_REQUIRED" : "COMPLETED";
    await setStatus(final, { completed_at: new Date().toISOString(), lease_owner: null, last_error_code: null, last_error_message: null });
    await db.from("audit_logs").insert({
      event_type: "ASSESSMENT_GENERATED", resource_type: "resume", resource_id: resume!.id, correlation_id: job.correlation_id,
      metadata: { ...VERSIONS, model: analysis.provider.model, quality: analysis.quality.status, classification: analysis.classification },
    });
    return { jobId, status: final };
  } catch (e) {
    const code: ErrorCode = e instanceof PipelineError ? e.code : "UNKNOWN_ERROR";
    const retryable = e instanceof PipelineError ? e.retryable : true;
    const exhausted = job.attempt_count >= job.max_attempts;
    const status: ProcessingStatus = retryable && !exhausted ? "RETRY_WAIT" : "FAILED";
    // Bounded exponential backoff with jitter (Workflow standard §10.2).
    const delay = Math.min(60_000, 2 ** job.attempt_count * 5_000) + Math.floor(Math.random() * 2_000);
    await setStatus(status, {
      last_error_code: code,
      last_error_message: String((e as Error).message).slice(0, 300), // codes and provider text only; never resume text
      lease_owner: null,
      next_attempt_at: status === "RETRY_WAIT" ? new Date(Date.now() + delay).toISOString() : null,
    });
    logEvent("job.error", { ...ctx, code, status });
    return { jobId, status, errorCode: code };
  }
}
