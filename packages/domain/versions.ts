// Every stored result carries these so it can be reproduced (LLD §23).
// Bump the relevant constant whenever its module's behaviour changes.
export const VERSIONS = {
  parser: "parse-1.0.0",
  normalization: "norm-1.1.0",
  extractionSchema: "extract-schema-1.0.0",
  prompt: "extract-prompt-1.0.0",
  scoring: "scoring-1.1.0",
  classification: "classify-1.0.0",
} as const;
