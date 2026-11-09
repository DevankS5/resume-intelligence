// Content-based format detection (Security §6.3): the extension is never trusted alone.
import { PipelineError } from "@domain/errors";

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
export type DetectedFormat = "DOCX" | "PDF";

const has = (bytes: Uint8Array, ascii: string) => Buffer.from(bytes).includes(ascii, 0, "latin1");

export function detectFormat(bytes: Uint8Array, filename: string): DetectedFormat {
  if (bytes.byteLength === 0) throw new PipelineError("EMPTY_DOCUMENT");
  if (bytes.byteLength > MAX_UPLOAD_BYTES) throw new PipelineError("FILE_TOO_LARGE");

  const ext = filename.toLowerCase().split(".").pop();
  const isZip = bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04;
  const isPdf = Buffer.from(bytes.subarray(0, 5)).toString("latin1") === "%PDF-";

  // Zip central directory stores entry names uncompressed, so this check is reliable.
  const isDocx = isZip && has(bytes, "word/document.xml");

  if (ext !== "docx" && ext !== "pdf") throw new PipelineError("UNSUPPORTED_FORMAT");
  if (ext === "docx" && !isDocx) throw new PipelineError(isPdf || isZip ? "MIME_MISMATCH" : "UNSUPPORTED_FORMAT");
  if (ext === "pdf" && !isPdf) throw new PipelineError(isDocx ? "MIME_MISMATCH" : "UNSUPPORTED_FORMAT");
  return ext === "docx" ? "DOCX" : "PDF";
}

/** Structures the text parser cannot read, reported rather than silently dropped (HLD §6.3). */
export function docxUnsupportedStructures(bytes: Uint8Array): string[] {
  const out: string[] = [];
  if (has(bytes, "word/embeddings/")) out.push("Embedded objects (not extracted, never executed)");
  if (has(bytes, "word/header") || has(bytes, "word/footer")) out.push("Headers/footers (not extracted)");
  if (has(bytes, "word/media/")) out.push("Images (text inside images is not read)");
  if (has(bytes, "word/comments.xml")) out.push("Reviewer comments (not extracted)");
  if (has(bytes, "vbaProject.bin"))out.push("Macros (ignored, never executed)");
  return out;
}

export const pdfIsEncrypted = (bytes: Uint8Array) => has(bytes, "/Encrypt");

export const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
export const PDF_MIME = "application/pdf";
