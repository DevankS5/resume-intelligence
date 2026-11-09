// LLD §19.2. Validates metadata, resolves duplicates by checksum, registers identity and
// returns a short-lived signed upload token for the private bucket. The file itself goes
// straight to storage, so it never hits the serverless body limit.
import { NextResponse } from "next/server";
import { z } from "zod";
import { currentHrUser } from "@/lib/auth/require-hr";
import { adminClient, RESUME_BUCKET } from "@/lib/supabase/admin";
import { findBySha, registerSource } from "@/lib/pipeline/register";
import { DOCX_MIME, MAX_UPLOAD_BYTES, PDF_MIME } from "@parsers/detect";

const Body = z.object({
  filename: z.string().min(1).max(200).regex(/\.(docx|pdf)$/i, "Only .docx or .pdf"),
  byteSize: z.number().int().positive().max(MAX_UPLOAD_BYTES),
  sha256: z.string().regex(/^[0-9a-f]{64}$/),
});

const err = (status: number, code: string, message: string, fieldErrors?: Record<string, string[]>) =>
  NextResponse.json({ code, message, retryable: false, correlationId: crypto.randomUUID(), fieldErrors }, { status });

export async function POST(req: Request) {
  const user = await currentHrUser();
  if (!user) return err(403, "AUTHORIZATION_ERROR", "Sign in as an HR reviewer.");
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    const big = parsed.error.issues.some((i) => i.path[0] === "byteSize" && i.code === "too_big");
    return err(400, big ? "FILE_TOO_LARGE" : "UNSUPPORTED_FORMAT",
      big ? "The file is larger than the 5 MB limit." : "Upload a .docx or a text-based PDF.", z.flattenError(parsed.error).fieldErrors);
  }
  const { filename, byteSize, sha256 } = parsed.data;

  const existing = await findBySha(sha256);
  if (existing && existing.uploadStatus === "STORED") {
    return NextResponse.json({ duplicate: true, candidateId: existing.candidateId, resumeId: existing.resumeId, candidateRef: existing.candidateRef });
  }

  const pdf = /\.pdf$/i.test(filename);
  const reg = existing ?? (await registerSource({
    filename, sha256, byteSize, sourceKind: pdf ? "INDIVIDUAL_PDF" : "INDIVIDUAL_DOCX",
    mimeType: pdf ? PDF_MIME : DOCX_MIME, metadata: { batch: "upload" }, importedBy: user.id,
  }));
  const { data: signed, error } = await adminClient().storage.from(RESUME_BUCKET).createSignedUploadUrl(reg.storagePath, { upsert: true });
  if (error || !signed) return err(502, "PERSISTENCE_ERROR", "Could not prepare the upload. Try again.");
  return NextResponse.json({
    duplicate: false, candidateId: reg.candidateId, resumeId: reg.resumeId, candidateRef: reg.candidateRef,
    uploadMode: "SIGNED_STORAGE_UPLOAD", storagePath: reg.storagePath, uploadToken: signed.token,
  });
}
