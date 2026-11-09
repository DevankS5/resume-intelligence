// Canonical domain contracts (LLD §4). Every module speaks these types.

export const SOURCE_KINDS = ["COMPOSITE_DOCX", "INDIVIDUAL_DOCX", "INDIVIDUAL_PDF"] as const;
export type SourceKind = (typeof SOURCE_KINDS)[number];

export const PROCESSING_STATUSES = [
  "RECEIVED", "VALIDATING", "STORED", "PARSING", "SEGMENTING", "QUEUED", "EXTRACTING",
  "VALIDATING_OUTPUT", "NORMALIZING", "SCORING", "COMPLETED", "REVIEW_REQUIRED",
  "RETRY_WAIT", "FAILED", "CANCELLED",
] as const;
export type ProcessingStatus = (typeof PROCESSING_STATUSES)[number];

export const EVIDENCE_STATES = ["DIRECT", "RELATED", "NOT_EVIDENCED", "UNCERTAIN"] as const;
export type EvidenceState = (typeof EVIDENCE_STATES)[number];

export const EXPERIENCE_TYPES = [
  "PROFESSIONAL", "INTERNSHIP", "ACADEMIC_RESEARCH", "PROJECT_BASED", "OTHER", "UNKNOWN",
] as const;
export type ExperienceType = (typeof EXPERIENCE_TYPES)[number];

export const RELEVANCE_TAGS = ["LCA_DIRECT", "LCA_RELATED", "UIUX_DIRECT", "UIUX_RELATED", "UNRELATED"] as const;
export type RelevanceTag = (typeof RELEVANCE_TAGS)[number];

export const CLASSIFICATIONS = ["LCA_STRONGER", "UIUX_STRONGER", "BOTH", "NEITHER_EVIDENCED", "UNCERTAIN"] as const;
export type Classification = (typeof CLASSIFICATIONS)[number];

export const REVIEW_STATUSES = [
  "UNREVIEWED", "NEEDS_REVIEW", "IN_REVIEW", "VERIFIED", "SHORTLISTED", "NOT_SHORTLISTED",
] as const;
export type ReviewStatus = (typeof REVIEW_STATUSES)[number];

export type JobKey = "LCA_CONSULTANT" | "UIUX_INTERN";

export interface SourceLocator {
  sourceDocumentId: string;
  sourceFilename?: string | null;
  resumeSegmentId?: string | null;
  pageNumber?: number | null;
  paragraphIndex?: number | null;
  tableIndex?: number | null;
  rowIndex?: number | null;
  cellIndex?: number | null;
  sectionHeading?: string | null;
  startOffset?: number | null;
  endOffset?: number | null;
  locatorLabel: string;
}

export interface ParsedBlock {
  blockId: string;
  blockType: "PARAGRAPH" | "TABLE_CELL" | "HEADER" | "FOOTER" | "TEXT_BOX" | "OTHER";
  text: string;
  order: number;
  locator: SourceLocator;
  styleName?: string | null;
}

export interface ParsedDocument {
  sourceDocumentId: string;
  parserName: string;
  parserVersion: string;
  detectedMimeType: string;
  text: string;
  blocks: ParsedBlock[];
  pageCount?: number | null;
  warnings: string[];
  unsupportedStructures: string[];
  isReadable: boolean;
}

export interface ResumeInput {
  resumeId: string;
  candidateId: string;
  sourceDocumentId: string;
  sourceKind: SourceKind;
  displayReference: string;
  originalFilename?: string | null;
  rawText: string;
  normalizedText: string;
  blocks: ParsedBlock[];
  contentFingerprint: string;
  parser: { name: string; version: string };
  warnings: string[];
}

export type QualityCheckStatus = "PASS" | "WARNING" | "FAIL" | "NOT_APPLICABLE";
export interface ExtractionQuality {
  status: "HIGH" | "MEDIUM" | "LOW" | "UNASSESSABLE";
  checks: Array<{ key: string; label: string; status: QualityCheckStatus; detail: string }>;
  reviewRequired: boolean;
}

/** A quote from the resume that has been checked against the source text. */
export interface VerifiedEvidence {
  quote: string;
  section: string | null;
  verified: boolean;
  locator: SourceLocator | null;
}

export type MandatoryStatus =
  | "ESTABLISHED"
  | "NOT_ESTABLISHED"
  | "STATED_IN_RESUME"
  | "CANDIDATE_CONFIRMATION_REQUIRED";

export interface MandatoryCheck {
  key: string;
  label: string;
  status: MandatoryStatus;
  detail: string;
  evidence: VerifiedEvidence[];
}

export interface CriterionResult {
  key: string;
  label: string;
  weight: number;
  state: EvidenceState;
  multiplier: number;
  points: number;
  reviewRequired: boolean;
  explanation: string;
  evidence: VerifiedEvidence[];
}

export interface RoleAssessment {
  jobKey: JobKey;
  jdVersion: string;
  rubricVersion: string;
  scoringVersion: string;
  score: number;
  band: ScoreBand;
  criteria: CriterionResult[];
  mandatory: MandatoryCheck[];
  reviewFlags: string[];
}

export type ScoreBand = "STRONG" | "POTENTIAL" | "LIMITED" | "WEAK" | "UNASSESSABLE";

export interface ExperienceSummary {
  /** Months from the union of non-overlapping intervals; null when no usable dates. */
  lcaProfessionalMonths: number;
  lcaInternshipMonths: number;
  lcaAcademicMonths: number;
  uiuxMonths: number;
  totalProfessionalMonths: number;
  excludedForDates: number;
  warnings: string[];
}
