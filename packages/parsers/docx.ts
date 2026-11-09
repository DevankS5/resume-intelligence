// DOCX adapter (LLD §7.1): Mammoth HTML → ordered blocks with paragraph/table locators.
// Mammoth's HTML keeps paragraph, list and table structure that extractRawText flattens.
import mammoth from "mammoth";
import type { ParsedBlock, ParsedDocument } from "@domain/types";
import { VERSIONS } from "@domain/versions";
import { PipelineError } from "@domain/errors";
import { detectSection } from "@normalization/sections";
import { DOCX_MIME, docxUnsupportedStructures } from "./detect";

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', "#39": "'", nbsp: " " };
const decode = (s: string) =>
  s.replace(/<[^>]+>/g, "").replace(/&(#\d+|#x[0-9a-f]+|[a-z]+);/gi, (m, e: string) => {
    if (ENTITIES[e.toLowerCase()] !== undefined) return ENTITIES[e.toLowerCase()]!;
    if (e.startsWith("#x")) return String.fromCodePoint(parseInt(e.slice(2), 16));
    if (e.startsWith("#")) return String.fromCodePoint(Number(e.slice(1)));
    return m;
  });

export async function parseDocx(
  bytes: Uint8Array,
  sourceDocumentId: string,
  filename: string,
): Promise<ParsedDocument> {
  let html: string;
  let messages: Array<{ message: string }> = [];
  try {
    const res = await mammoth.convertToHtml({ buffer: Buffer.from(bytes) });
    html = res.value;
    messages = res.messages;
  } catch (e) {
    throw new PipelineError("UNREADABLE_DOCUMENT", (e as Error).message.slice(0, 200));
  }

  const blocks: ParsedBlock[] = [];
  let section: string | null = null;
  let paragraphIndex = 0;
  let tableIndex = -1;
  let rowIndex = -1;
  let cellIndex = -1;
  let inTable = 0;

  // Tokenise just the tags we care about, in document order.
  // Inline tags (<strong>, <a>, <br>…) are consumed by the middle alternative and ignored.
  const re = /<(\/?)(table|tr|td|th|p|li|h[1-6])\b[^>]*>|<[^>]*>|([^<]+)/gi;
  let buf: string | null = null;
  let bufType: "TEXT" | null = null;
  const flush = () => {
    if (buf === null) return;
    const text = decode(buf).replace(/\s+/g, " ").trim();
    buf = null;
    bufType = null;
    if (!text) return;
    const heading = detectSection(text);
    if (heading) section = heading;
    const order = blocks.length;
    const inCell = inTable > 0;
    blocks.push({
      blockId: `b${order}`,
      blockType: inCell ? "TABLE_CELL" : "PARAGRAPH",
      text,
      order,
      styleName: heading ? "Heading" : null,
      locator: {
        sourceDocumentId,
        sourceFilename: filename,
        paragraphIndex,
        tableIndex: inCell ? tableIndex : null,
        rowIndex: inCell ? rowIndex : null,
        cellIndex: inCell ? cellIndex : null,
        sectionHeading: section,
        locatorLabel: inCell
          ? `${filename}, table ${tableIndex + 1}, row ${rowIndex + 1}, cell ${cellIndex + 1}`
          : `${filename}, paragraph ${paragraphIndex + 1}${section ? `, ${section} section` : ""}`,
      },
    });
    paragraphIndex++;
  };

  for (const m of html.matchAll(re)) {
    const [, close, tagRaw, text] = m;
    if (text !== undefined) {
      if (bufType === "TEXT") buf += text;
      continue;
    }
    if (tagRaw === undefined) {
      if (/^<br/i.test(m[0]) && bufType === "TEXT") buf += " ";
      continue;
    }
    const tag = tagRaw.toLowerCase();
    if (tag === "table") {
      flush();
      if (close) inTable--;
      else { inTable++; tableIndex++; rowIndex = -1; }
    } else if (tag === "tr" && !close) { rowIndex++; cellIndex = -1; }
    else if ((tag === "td" || tag === "th") && !close) { cellIndex++; }
    else if (["p", "li"].includes(tag) || tag.startsWith("h")) {
      if (close) flush();
      else { flush(); buf = ""; bufType = "TEXT"; }
    }
  }
  flush();

  const text = blocks.map((b) => b.text).join("\n");
  const warnings = messages.map((m) => m.message).filter((m) => !/unrecognised (paragraph|run) style/i.test(m));
  return {
    sourceDocumentId,
    parserName: "mammoth-html-blocks",
    parserVersion: VERSIONS.parser,
    detectedMimeType: DOCX_MIME,
    text,
    blocks,
    pageCount: null,
    warnings: [...new Set(warnings)].slice(0, 20),
    unsupportedStructures: docxUnsupportedStructures(bytes),
    isReadable: text.replace(/\s/g, "").length >= 200,
  };
}
