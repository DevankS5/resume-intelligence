// Reprocess without re-extraction (LLD §17.4): when normalization, quality or scoring
// rules change, replay each current profile's stored raw model output through the
// canonical analysis path. No LLM call is made. New extraction/profile/assessment
// versions are written; earlier versions stay untouched for audit.
// Usage: npm run reprocess
import { adminClient } from "@/lib/supabase/admin";
import { rebuildAllRankings } from "@/lib/pipeline/rankings";
import { analyzeResume, toBundle } from "@workflows/analyze";
import type { ParsedDocument } from "@domain/types";

const referenceMonth = () => process.env.ASSESSMENT_REFERENCE_MONTH || "2026-11";

async function main() {
  const db = adminClient();
  const { data: profiles, error } = await db
    .from("candidate_profiles")
    .select("candidate_id, resume_id, document_extractions(parsed_document_id, model_provider, model_name, raw_model_output, parsed_documents(id, parser_name, parser_version, raw_text, blocks, page_count, warnings, unsupported_structures, resume_documents(source_document_id)))")
    .eq("is_current", true);
  if (error) throw new Error(error.message);

  let ok = 0;
  for (const p of profiles ?? []) {
    const x = p.document_extractions as unknown as {
      model_provider: string; model_name: string; raw_model_output: unknown;
      parsed_documents: { id: string; parser_name: string; parser_version: string; raw_text: string; blocks: ParsedDocument["blocks"]; page_count: number | null; warnings: string[]; unsupported_structures: string[]; resume_documents: { source_document_id: string } };
    };
    const pd = x.parsed_documents;
    const parsed: ParsedDocument = {
      sourceDocumentId: pd.resume_documents.source_document_id, parserName: pd.parser_name, parserVersion: pd.parser_version,
      detectedMimeType: "", text: pd.raw_text, blocks: pd.blocks, pageCount: pd.page_count,
      warnings: pd.warnings, unsupportedStructures: pd.unsupported_structures, isReadable: true,
    };
    // Replay provider: returns the stored output, so the result is attributed to the original model.
    const replay = { provider: x.model_provider, model: x.model_name, extract: async () => x.raw_model_output };
    const analysis = await analyzeResume(parsed, replay, referenceMonth());
    const { error: bErr } = await db.rpc("persist_assessment_bundle", {
      p: toBundle({ resumeId: p.resume_id, candidateId: p.candidate_id, parsedDocumentId: pd.id }, analysis),
    });
    if (bErr) throw new Error(`${p.resume_id}: ${bErr.message}`);
    const status = analysis.quality.reviewRequired ? "REVIEW_REQUIRED" : "COMPLETED";
    await db.from("resume_documents").update({ processing_status: status }).eq("id", p.resume_id);
    ok++;
  }
  await db.from("audit_logs").insert({ event_type: "REPROCESSED_WITHOUT_EXTRACTION", resource_type: "dataset", metadata: { profiles: ok } });
  const snaps = await rebuildAllRankings();
  console.log(`Reprocessed ${ok} profiles from stored model output; rankings: ${snaps.map((s) => s.count).join(", ")}`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
