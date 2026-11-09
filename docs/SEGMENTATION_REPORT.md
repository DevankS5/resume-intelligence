# Segmentation Report

**Result: no segmentation required.** The dataset was delivered as 47 individual DOCX files (see [IMPORT_MANIFEST.md](IMPORT_MANIFEST.md) and ADR-003a), so every resume boundary is a file boundary.

| Check | Result |
|---|---|
| Expected records | 47 |
| Source files found | 47 |
| Byte-identical duplicates (SHA-256) | 0 |
| Same-text duplicates (canonical fingerprint) | 0 |
| Files with no readable text | 1 (`anonymized_resume_1793685080327.docx`: one blank text run, recorded as `EMPTY_DOCUMENT`) |
| Ambiguous boundaries | 0 |
| Segments with `REVIEW_REQUIRED` | 0 |

Every resume record has `segmentation_status = CONFIRMED`, `source_segment_index = NULL` and a `source_record_key` of `<source_document_id>#0`.
