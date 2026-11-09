// WF-02/WF-04: register a source document and its candidate/resume identity.
// Idempotent on the file's SHA-256: re-registering identical bytes returns the existing
// records instead of creating a second candidate (Description FR-03).
import { randomUUID } from "node:crypto";
import { adminClient, RESUME_BUCKET } from "@/lib/supabase/admin";
import { idempotencyKey } from "@domain/hash";
import { VERSIONS } from "@domain/versions";
import type { SourceKind } from "@domain/types";

export interface Registration {
  sourceDocumentId: string;
  candidateId: string;
  resumeId: string;
  candidateRef: string;
  storagePath: string;
  duplicate: boolean;
  uploadStatus: "PENDING_UPLOAD" | "STORED" | "REJECTED";
}

const safeName = (name: string) => name.normalize("NFKC").replace(/[^\w.\- ]+/g, "_").slice(0, 120);

export async function findBySha(sha256: string): Promise<Registration | null> {
  const db = adminClient();
  const { data: src } = await db.from("source_documents").select("id, storage_path, upload_status").eq("sha256", sha256).maybeSingle();
  if (!src) return null;
  const { data: r } = await db
    .from("resume_documents").select("id, candidate_id, candidates(candidate_ref)")
    .eq("source_document_id", src.id).maybeSingle();
  if (!r) return null;
  return {
    sourceDocumentId: src.id, candidateId: r.candidate_id, resumeId: r.id,
    candidateRef: (r.candidates as unknown as { candidate_ref: string }).candidate_ref,
    storagePath: src.storage_path, duplicate: true, uploadStatus: src.upload_status,
  };
}

/** Creates source → candidate → resume rows. Storage path is a UUID, never the filename. */
export async function registerSource(input: {
  filename: string;
  sha256: string;
  byteSize: number;
  sourceKind: SourceKind;
  mimeType: string;
  metadata: Record<string, unknown>;
  importedBy?: string | null;
}): Promise<Registration> {
  const existing = await findBySha(input.sha256);
  if (existing) return existing;

  const db = adminClient();
  const sourceId = randomUUID();
  const storagePath = `sources/${sourceId}.${input.sourceKind === "INDIVIDUAL_PDF" ? "pdf" : "docx"}`;
  const filename = safeName(input.filename);

  const { error: sErr } = await db.from("source_documents").insert({
    id: sourceId, source_kind: input.sourceKind, original_filename: filename, storage_bucket: RESUME_BUCKET,
    storage_path: storagePath, sha256: input.sha256, byte_size: input.byteSize, detected_mime_type: input.mimeType,
    source_metadata: input.metadata, imported_by: input.importedBy ?? null,
  });
  if (sErr) {
    // Lost a race with an identical concurrent upload: the unique sha256 constraint won.
    if (sErr.code === "23505") {
      const again = await findBySha(input.sha256);
      if (again) return again;
    }
    throw new Error(`PERSISTENCE_ERROR: ${sErr.message}`);
  }

  const { data: cand, error: cErr } = await db.from("candidates").insert({}).select("id, candidate_ref").single();
  if (cErr) throw new Error(`PERSISTENCE_ERROR: ${cErr.message}`);

  const { data: resume, error: rErr } = await db.from("resume_documents").insert({
    candidate_id: cand.id, source_document_id: sourceId, source_record_key: `${sourceId}#0`,
    original_filename: filename, display_reference: filename, processing_status: "RECEIVED",
  }).select("id").single();
  if (rErr) throw new Error(`PERSISTENCE_ERROR: ${rErr.message}`);

  await db.from("audit_logs").insert({
    actor_id: input.importedBy ?? null, event_type: "SOURCE_REGISTERED", resource_type: "source_document",
    resource_id: sourceId, metadata: { source_kind: input.sourceKind, byte_size: input.byteSize },
  });

  return {
    sourceDocumentId: sourceId, candidateId: cand.id, resumeId: resume.id, candidateRef: cand.candidate_ref,
    storagePath, duplicate: false, uploadStatus: "PENDING_UPLOAD",
  };
}

/** Creates (or returns) the processing job for this resume under the current versions. */
export async function ensureProcessingJob(resumeId: string, sha256: string): Promise<string> {
  const db = adminClient();
  // The extraction model is part of the input identity: a model change is a new run, not a retry.
  const model = process.env.GEMINI_MODEL || "gemini-3.1-flash-lite";
  const key = idempotencyKey({ resumeId, sha256, model, ...VERSIONS });
  const { data: existing } = await db.from("processing_jobs").select("id").eq("idempotency_key", key).maybeSingle();
  if (existing) return existing.id;
  const { data, error } = await db.from("processing_jobs")
    .insert({ resume_id: resumeId, idempotency_key: key, status: "QUEUED" }).select("id").single();
  if (error?.code === "23505") {
    const { data: again } = await db.from("processing_jobs").select("id").eq("idempotency_key", key).single();
    return again!.id;
  }
  if (error) throw new Error(`PERSISTENCE_ERROR: ${error.message}`);
  await db.from("resume_documents").update({ processing_status: "QUEUED" }).eq("id", resumeId);
  return data.id;
}
