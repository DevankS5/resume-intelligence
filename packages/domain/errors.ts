// Error taxonomy (LLD §4.1, Workflow standard §9). HR sees `message`; logs see `code`.

export const ERROR_CATALOG = {
  UNSUPPORTED_FORMAT: { retryable: false, message: "This file type is not supported. Upload a .docx or a text-based PDF." },
  FILE_TOO_LARGE: { retryable: false, message: "The file is larger than the 5 MB limit." },
  MIME_MISMATCH: { retryable: false, message: "The file's contents do not match its extension." },
  EMPTY_DOCUMENT: { retryable: false, message: "The document contains no readable text." },
  UNREADABLE_DOCUMENT: { retryable: false, message: "The document could not be opened. It may be corrupt or password-protected." },
  OCR_REQUIRED: { retryable: false, message: "This looks like a scanned PDF. Text extraction needs OCR, which V1 does not run; review the original manually." },
  SEGMENTATION_AMBIGUOUS: { retryable: false, message: "The resume boundary is unclear and needs manual review." },
  SEGMENTATION_COUNT_MISMATCH: { retryable: false, message: "The number of detected resumes does not match the expected count." },
  DUPLICATE_SOURCE: { retryable: false, message: "This exact file has already been uploaded." },
  PARSER_ERROR: { retryable: false, message: "Text extraction failed for this document." },
  MODEL_TIMEOUT: { retryable: true, message: "The extraction service timed out. The job will retry." },
  MODEL_RATE_LIMIT: { retryable: true, message: "The extraction service is busy. The job will retry." },
  MODEL_PROVIDER_ERROR: { retryable: true, message: "The extraction service returned an error. The job will retry." },
  INVALID_MODEL_OUTPUT: { retryable: true, message: "The extraction result was not in the expected format." },
  EVIDENCE_NOT_FOUND: { retryable: false, message: "Some extracted claims could not be found in the resume text and were excluded." },
  DATE_PARSE_UNCERTAIN: { retryable: false, message: "Some dates could not be read reliably; affected experience is excluded from totals." },
  PERSISTENCE_ERROR: { retryable: true, message: "Saving results failed. The job can be retried safely." },
  AUTHORIZATION_ERROR: { retryable: false, message: "You do not have access to this action." },
  CONFIGURATION_ERROR: { retryable: false, message: "The service is not configured (missing credentials)." },
  UNKNOWN_ERROR: { retryable: true, message: "Something went wrong. The job can be retried." },
} as const;

export type ErrorCode = keyof typeof ERROR_CATALOG;

export class PipelineError extends Error {
  readonly code: ErrorCode;
  readonly retryable: boolean;
  constructor(code: ErrorCode, detail?: string) {
    super(detail ?? ERROR_CATALOG[code].message);
    this.code = code;
    this.retryable = ERROR_CATALOG[code].retryable;
  }
}

export const hrMessage = (code: string): string =>
  (ERROR_CATALOG as Record<string, { message: string }>)[code]?.message ?? ERROR_CATALOG.UNKNOWN_ERROR.message;
