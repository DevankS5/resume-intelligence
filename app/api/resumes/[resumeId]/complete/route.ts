// LLD §19.3. Re-validates the stored object by content (signature + checksum), then creates
// the idempotent processing job and runs it after the response is sent.
import { after, NextResponse } from "next/server";
import { z } from "zod";
import { currentHrUser } from "@/lib/auth/require-hr";
import { adminClient, RESUME_BUCKET } from "@/lib/supabase/admin";
import { ensureProcessingJob } from "@/lib/pipeline/register";
import { runJob } from "@/lib/pipeline/run-job";
import { rebuildAllRankings } from "@/lib/pipeline/rankings";
import { sha256 } from "@domain/hash";
import { detectFormat } from "@parsers/detect";
import { PipelineError, hrMessage } from "@domain/errors";

export const maxDuration = 120;

export async function POST(_: Request, { params }: { params: Promise<{ resumeId: string }> }) {
  const user = await currentHrUser();
  if (!user) return NextResponse.json({ code: "AUTHORIZATION_ERROR", message: hrMessage("AUTHORIZATION_ERROR"), retryable: false }, { status: 403 });
  const { resumeId } = await params;
  if (!z.uuid().safeParse(resumeId).success) return NextResponse.json({ code: "NOT_FOUND", message: "Unknown upload.", retryable: false }, { status: 404 });

  const db = adminClient();
  const { data: r } = await db.from("resume_documents")
    .select("id, candidate_id, original_filename, source_documents(id, storage_path, sha256)").eq("id", resumeId).maybeSingle();
  const src = r?.source_documents as unknown as { id: string; storage_path: string; sha256: string } | undefined;
  if (!r || !src) return NextResponse.json({ code: "NOT_FOUND", message: "Unknown upload.", retryable: false }, { status: 404 });

  const { data: blob } = await db.storage.from(RESUME_BUCKET).download(src.storage_path);
  if (!blob) return NextResponse.json({ code: "PARSER_ERROR", message: "The file did not arrive. Upload it again.", retryable: true }, { status: 409 });
  const bytes = new Uint8Array(await blob.arrayBuffer());
  try {
    if (sha256(bytes) !== src.sha256) throw new PipelineError("MIME_MISMATCH", "Checksum differs from the declared file");
    detectFormat(bytes, r.original_filename ?? "upload");
  } catch (e) {
    const code = e instanceof PipelineError ? e.code : "UNSUPPORTED_FORMAT";
    await db.storage.from(RESUME_BUCKET).remove([src.storage_path]);
    await db.from("source_documents").update({ upload_status: "REJECTED" }).eq("id", src.id);
    await db.from("resume_documents").update({ processing_status: "FAILED", last_error_code: code }).eq("id", r.id);
    return NextResponse.json({ code, message: hrMessage(code), retryable: false }, { status: 422 });
  }

  await db.from("source_documents").update({ upload_status: "STORED" }).eq("id", src.id);
  const jobId = await ensureProcessingJob(r.id, src.sha256);
  after(async () => {
    const outcome = await runJob(jobId);
    if (outcome.status === "COMPLETED" || outcome.status === "REVIEW_REQUIRED") await rebuildAllRankings();
  });
  return NextResponse.json({ jobId, candidateId: r.candidate_id, status: "QUEUED" }, { status: 202 });
}
