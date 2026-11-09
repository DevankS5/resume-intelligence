// Protected original-document access (Security §6.2): authorize, resolve the ONE source
// linked to this candidate, issue a 60-second signed URL, audit, redirect. Never listed, never stored.
import { NextResponse } from "next/server";
import { z } from "zod";
import { currentHrUser } from "@/lib/auth/require-hr";
import { adminClient, RESUME_BUCKET } from "@/lib/supabase/admin";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await currentHrUser();
  if (!user) return NextResponse.json({ code: "AUTHORIZATION_ERROR", message: "Sign in as an HR reviewer.", retryable: false }, { status: 403 });
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) return NextResponse.json({ code: "NOT_FOUND", message: "Unknown candidate.", retryable: false }, { status: 404 });

  const db = adminClient();
  const { data } = await db.from("resume_documents").select("source_documents(id, storage_path, original_filename)").eq("candidate_id", id).maybeSingle();
  const src = data?.source_documents as unknown as { id: string; storage_path: string; original_filename: string } | undefined;
  if (!src) return NextResponse.json({ code: "NOT_FOUND", message: "No source document for this candidate.", retryable: false }, { status: 404 });

  const { data: signed, error } = await db.storage.from(RESUME_BUCKET).createSignedUrl(src.storage_path, 60, { download: src.original_filename });
  if (error || !signed) return NextResponse.json({ code: "PERSISTENCE_ERROR", message: "The original could not be opened. Try again.", retryable: true }, { status: 502 });
  await db.from("audit_logs").insert({ actor_id: user.id, event_type: "SOURCE_ACCESSED", resource_type: "source_document", resource_id: src.id });
  return NextResponse.redirect(signed.signedUrl, { headers: { "Cache-Control": "no-store" } });
}
