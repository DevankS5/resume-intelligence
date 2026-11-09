// Text-based PDF adapter (LLD §7.2) on PDF.js via unpdf (serverless-safe build).
// Image-only pages are flagged OCR_REQUIRED; V1 never OCRs silently.
import { extractText, getDocumentProxy } from "unpdf";
import type { ParsedBlock, ParsedDocument } from "@domain/types";
import { VERSIONS } from "@domain/versions";
import { PipelineError } from "@domain/errors";
import { detectSection } from "@normalization/sections";
import { PDF_MIME, pdfIsEncrypted } from "./detect";

const MIN_CHARS_PER_PAGE = 40;

export async function parsePdf(
  bytes: Uint8Array,
  sourceDocumentId: string,
  filename: string,
): Promise<ParsedDocument> {
  if (pdfIsEncrypted(bytes)) throw new PipelineError("UNREADABLE_DOCUMENT", "PDF is encrypted");
  let pages: string[];
  try {
    const pdf = await getDocumentProxy(new Uint8Array(bytes));
    ({ text: pages } = await extractText(pdf, { mergePages: false }));
  } catch (e) {
    throw new PipelineError("UNREADABLE_DOCUMENT", (e as Error).message.slice(0, 200));
  }

  const blocks: ParsedBlock[] = [];
  const warnings: string[] = [];
  let section: string | null = null;
  pages.forEach((pageText, p) => {
    if (pageText.replace(/\s/g, "").length < MIN_CHARS_PER_PAGE) {
      warnings.push(`Page ${p + 1} has little or no extractable text (possibly scanned).`);
    }
    pageText.split(/\n+/).forEach((line, i) => {
      const text = line.replace(/\s+/g, " ").trim();
      if (!text) return;
      const heading = detectSection(text);
      if (heading) section = heading;
      const order = blocks.length;
      blocks.push({
        blockId: `b${order}`,
        blockType: "PARAGRAPH",
        text,
        order,
        styleName: heading ? "Heading" : null,
        locator: {
          sourceDocumentId,
          sourceFilename: filename,
          pageNumber: p + 1,
          paragraphIndex: i,
          sectionHeading: section,
          locatorLabel: `${filename}, page ${p + 1}, line ${i + 1}`,
        },
      });
    });
  });

  const text = blocks.map((b) => b.text).join("\n");
  const readable = text.replace(/\s/g, "").length >= 200;
  if (!readable && pages.length > 0) throw new PipelineError("OCR_REQUIRED");
  return {
    sourceDocumentId,
    parserName: "pdfjs-unpdf",
    parserVersion: VERSIONS.parser,
    detectedMimeType: PDF_MIME,
    text,
    blocks,
    pageCount: pages.length,
    warnings,
    unsupportedStructures: [],
    isReadable: readable,
  };
}
