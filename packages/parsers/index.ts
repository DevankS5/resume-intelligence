import type { ParsedDocument, SourceKind } from "@domain/types";
import { PipelineError } from "@domain/errors";
import { detectFormat } from "./detect";
import { parseDocx } from "./docx";
import { parsePdf } from "./pdf";

/** One entry point for every individual source file, batch or upload alike. */
export async function parseDocument(
  bytes: Uint8Array,
  filename: string,
  sourceDocumentId: string,
): Promise<{ parsed: ParsedDocument; sourceKind: SourceKind }> {
  const format = detectFormat(bytes, filename);
  const parsed =
    format === "DOCX"
      ? await parseDocx(bytes, sourceDocumentId, filename)
      : await parsePdf(bytes, sourceDocumentId, filename);
  if (!parsed.isReadable) throw new PipelineError("EMPTY_DOCUMENT");
  return { parsed, sourceKind: format === "DOCX" ? "INDIVIDUAL_DOCX" : "INDIVIDUAL_PDF" };
}

export { detectFormat, MAX_UPLOAD_BYTES, DOCX_MIME, PDF_MIME } from "./detect";
