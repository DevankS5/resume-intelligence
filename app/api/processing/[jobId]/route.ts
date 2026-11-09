// LLD §19.4. Safe progress fields only: no resume text, no stack traces.
import { after, NextResponse } from "next/server";
import { z } from "zod";
import { serverClient } from "@/lib/supabase/server";
import { currentHrUser } from "@/lib/auth/require-hr";
import { hrMessage } from "@domain/errors";
import { runJob } from "@/lib/pipeline/run-job";
import { rebuildAllRankings } from "@/lib/pipeline/rankings";

export const maxDuration = 120;

export async function GET(_: Request, { params }: { params: Promise<{ jobId: string }> }) {
  const user = await currentHrUser();
  if (!user) return NextResponse.json({ code: "AUTHORIZATION_ERROR", message: hrMessage("AUTHORIZATION_ERROR"), retryable: false }, { status: 403 });
  const { jobId } = await params;
  if (!z.uuid().safeParse(jobId).success) return NextResponse.json({ code: "NOT_FOUND", message: "Unknown job.", retryable: false }, { status: 404 });
  const db = await serverClient();
  const { data: job } = await db.from("processing_jobs")
    .select("id, status, attempt_count, max_attempts, last_error_code, next_attempt_at, updated_at, resume_documents(candidate_id)")
    .eq("id", jobId).maybeSingle();
  if (!job) return NextResponse.json({ code: "NOT_FOUND", message: "Unknown job.", retryable: false }, { status: 404 });

  // A transient failure waits for its backoff, then this poll resumes it (no separate queue in V1).
  if (job.status === "RETRY_WAIT" && job.next_attempt_at && Date.parse(job.next_attempt_at) <= Date.now()) {
    after(async () => {
      const o = await runJob(job.id);
      if (o.status === "COMPLETED" || o.status === "REVIEW_REQUIRED") await rebuildAllRankings();
    });
  }
  return NextResponse.json({
    jobId: job.id,
    status: job.status,
    attempt: job.attempt_count,
    maxAttempts: job.max_attempts,
    errorCode: job.last_error_code,
    message: job.last_error_code ? hrMessage(job.last_error_code) : null,
    candidateId: (job.resume_documents as unknown as { candidate_id: string }).candidate_id,
    updatedAt: job.updated_at,
  });
}
