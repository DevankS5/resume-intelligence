// Controlled batch import of the initial dataset (HLD §8.2, WF-02..WF-10).
// Runs locally with the service-role key; every file goes through the same
// register → store → job → runJob path as a live upload. Safe to re-run: identical
// files resolve to existing records and finished jobs are skipped.
// Usage: npm run import:batch -- "<dataset dir>" [--concurrency 2]
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { sha256 } from "@domain/hash";
import { adminClient, RESUME_BUCKET } from "@/lib/supabase/admin";
import { ensureProcessingJob, registerSource } from "@/lib/pipeline/register";
import { runJob, type JobOutcome } from "@/lib/pipeline/run-job";
import { rebuildAllRankings } from "@/lib/pipeline/rankings";
import { DOCX_MIME, PDF_MIME } from "@parsers/detect";

const EXPECTED = 47;
const arg = (name: string, fallback: string) => {
  const i = process.argv.indexOf(name);
  return i > 0 ? process.argv[i + 1]! : fallback;
};

async function main() {
  const dir = process.argv[2] && !process.argv[2].startsWith("--") ? process.argv[2] : "Software Development Assignment Resumes";
  const concurrency = Number(arg("--concurrency", "2"));
  const db = adminClient();
  const files = (await readdir(dir)).filter((f) => /\.(docx|pdf)$/i.test(f)).sort();
  console.log(`Found ${files.length} files (expected ${EXPECTED}).`);

  const jobs: Array<{ file: string; jobId: string; ref: string }> = [];
  for (const file of files) {
    const bytes = new Uint8Array(await readFile(join(dir, file)));
    const hash = sha256(bytes);
    const pdf = /\.pdf$/i.test(file);
    const reg = await registerSource({
      filename: file, sha256: hash, byteSize: bytes.byteLength,
      sourceKind: pdf ? "INDIVIDUAL_PDF" : "INDIVIDUAL_DOCX", mimeType: pdf ? PDF_MIME : DOCX_MIME,
      metadata: { batch: "initial-47", import_tool: "scripts/import-batch" },
    });
    if (reg.uploadStatus !== "STORED") {
      const { error } = await db.storage.from(RESUME_BUCKET).upload(reg.storagePath, bytes, {
        contentType: pdf ? PDF_MIME : DOCX_MIME, upsert: false,
      });
      if (error && !/exists/i.test(error.message)) throw new Error(`Upload failed for ${file}: ${error.message}`);
      await db.from("source_documents").update({ upload_status: "STORED" }).eq("id", reg.sourceDocumentId);
    }
    jobs.push({ file, jobId: await ensureProcessingJob(reg.resumeId, hash), ref: reg.candidateRef });
  }
  console.log(`Registered ${jobs.length} sources; processing with concurrency ${concurrency}.`);

  // Manual retry (Workflow standard §10.4): requeue failed jobs whose cause was not the document
  // itself. Unreadable/empty/unsupported files stay FAILED; re-running cannot fix them.
  if (process.argv.includes("--retry-failed")) {
    const { data: requeued } = await db.from("processing_jobs")
      .update({ status: "QUEUED", attempt_count: 0, next_attempt_at: null, lease_owner: null, lease_expires_at: null })
      .in("id", jobs.map((j) => j.jobId)).eq("status", "FAILED")
      .not("last_error_code", "in", "(EMPTY_DOCUMENT,UNREADABLE_DOCUMENT,UNSUPPORTED_FORMAT,MIME_MISMATCH,OCR_REQUIRED,FILE_TOO_LARGE)")
      .select("id");
    console.log(`Requeued ${requeued?.length ?? 0} failed job(s) for a manual retry.`);
  }

  // Process, then re-attempt jobs parked in RETRY_WAIT (rate limits) until they settle.
  const outcomes = new Map<string, JobOutcome>();
  for (let round = 1; round <= 4; round++) {
    const { data: pending } = await db.from("processing_jobs").select("id, status, next_attempt_at")
      .in("id", jobs.map((j) => j.jobId)).in("status", ["QUEUED", "RETRY_WAIT"]);
    if (!pending?.length) break;
    if (round > 1) {
      const wait = Math.max(0, ...pending.map((p) => (p.next_attempt_at ? Date.parse(p.next_attempt_at) - Date.now() : 0)));
      console.log(`Round ${round}: ${pending.length} job(s) to retry; waiting ${Math.ceil(wait / 1000)}s.`);
      await new Promise((r) => setTimeout(r, wait));
    }
    const queue = [...pending];
    await Promise.all(Array.from({ length: concurrency }, async () => {
      for (let p = queue.shift(); p; p = queue.shift()) {
        const j = jobs.find((x) => x.jobId === p.id)!;
        const o = await runJob(p.id);
        outcomes.set(p.id, o);
        console.log(`${j.ref}  ${o.status.padEnd(16)} ${o.errorCode ?? ""}  ${j.file}`);
      }
    }));
  }

  const snapshots = await rebuildAllRankings();
  const { data: final } = await db.from("processing_jobs").select("status").in("id", jobs.map((j) => j.jobId));
  const tally = (final ?? []).reduce<Record<string, number>>((m, r) => ((m[r.status] = (m[r.status] ?? 0) + 1), m), {});
  console.log("\nFinal job states:", tally);
  console.log("Ranking snapshots:", snapshots.map((s) => `${s.count} ranked`).join(", "));
  console.log(`Accounted for ${final?.length ?? 0} of ${EXPECTED} expected records.`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
