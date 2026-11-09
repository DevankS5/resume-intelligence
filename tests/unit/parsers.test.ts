import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import { detectFormat } from "@parsers/detect";
import { parseDocument } from "@parsers/index";
import { PipelineError } from "@domain/errors";

/** Builds a minimal synthetic DOCX in memory (no candidate data). */
async function makeDocx(bodyXml: string, extra: Record<string, string> = {}): Promise<Uint8Array> {
  const zip = new JSZip();
  zip.file("[Content_Types].xml",
    `<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>`);
  zip.file("_rels/.rels",
    `<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`);
  zip.file("word/document.xml",
    `<?xml version="1.0"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${bodyXml}</w:body></w:document>`);
  for (const [k, v] of Object.entries(extra)) zip.file(k, v);
  return zip.generateAsync({ type: "uint8array" });
}
const p = (t: string) => `<w:p><w:r><w:t xml:space="preserve">${t}</w:t></w:r></w:p>`;
const filler = p("Summary") + p("Environmental engineer with five years of field and laboratory experience across many projects in India. Experienced with stakeholder workshops, supplier data requests, inventory spreadsheets and reporting to clients across manufacturing sectors.");

describe("detectFormat", () => {
  const pdf = new TextEncoder().encode("%PDF-1.7 ...");
  it("rejects an empty file", () => {
    expect(() => detectFormat(new Uint8Array(), "a.docx")).toThrow(PipelineError);
  });
  it("rejects unsupported extensions", () => {
    expect(() => detectFormat(pdf, "resume.exe")).toThrowError(/not supported/);
  });
  it("rejects a PDF renamed to .docx (MIME mismatch)", () => {
    try { detectFormat(pdf, "resume.docx"); } catch (e) { expect((e as PipelineError).code).toBe("MIME_MISMATCH"); }
  });
  it("accepts a real PDF signature", () => {
    expect(detectFormat(pdf, "resume.pdf")).toBe("PDF");
  });
});

describe("DOCX parsing", () => {
  it("extracts paragraphs in order with section-aware locators", async () => {
    const bytes = await makeDocx(filler + p("Experience") + p("LCA Analyst, Example Co, Jan 2022 – Present"));
    const { parsed, sourceKind } = await parseDocument(bytes, "fixture.docx", "src-1");
    expect(sourceKind).toBe("INDIVIDUAL_DOCX");
    const last = parsed.blocks.at(-1)!;
    expect(last.text).toBe("LCA Analyst, Example Co, Jan 2022 – Present");
    expect(last.locator.sectionHeading).toBe("experience");
    expect(last.locator.locatorLabel).toMatch(/fixture\.docx, paragraph 4, experience section/);
  });
  it("extracts table cells with table/row/cell coordinates", async () => {
    const table = `<w:tbl><w:tr><w:tc>${p("Tools")}</w:tc><w:tc>${p("GaBi, SimaPro")}</w:tc></w:tr></w:tbl>`;
    const { parsed } = await parseDocument(await makeDocx(filler + table), "t.docx", "src-2");
    const cell = parsed.blocks.find((b) => b.text === "GaBi, SimaPro")!;
    expect(cell.blockType).toBe("TABLE_CELL");
    expect(cell.locator).toMatchObject({ tableIndex: 0, rowIndex: 0, cellIndex: 1 });
  });
  it("reports embedded objects instead of silently dropping them", async () => {
    const bytes = await makeDocx(filler, { "word/embeddings/oleObject1.bin": "x" });
    const { parsed } = await parseDocument(bytes, "e.docx", "src-3");
    expect(parsed.unsupportedStructures.join()).toMatch(/Embedded objects/);
  });
  it("marks a document with no text as EMPTY_DOCUMENT", async () => {
    await expect(parseDocument(await makeDocx(p(" ")), "blank.docx", "src-4")).rejects.toMatchObject({ code: "EMPTY_DOCUMENT" });
  });
});
