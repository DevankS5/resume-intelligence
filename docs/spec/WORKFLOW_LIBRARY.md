# Workflow Library — Reusable Project Workflows

> **Document role:** Catalogue of repeatable business and technical workflows.  
> **Audience:** AI implementation agent, engineers, operators and QA.  
> **Status:** V1 workflow catalogue.  
> **Rule:** Every workflow must conform to `Workflow standard.md`.

---

## 1. How to use this library

This document describes the workflows that make up the Resume Intelligence Platform. Each workflow has a stable identifier, purpose, trigger, inputs, preconditions, ordered steps, outputs, persistence requirements, failure cases and acceptance criteria.

The implementation agent should use these workflows as contracts, not merely as explanatory prose. Do not invent a separate process in code that contradicts a workflow. If implementation reveals a necessary change, update this library and its tests.

### 1.1 Workflow lifecycle

Every workflow should be:

1. Triggered by an explicit user/system event.
2. Validated before side effects occur.
3. Executed using stable IDs and typed contracts.
4. Idempotent when a retry is possible.
5. Observable through status transitions and correlation IDs.
6. Persisted with source/version references.
7. Recoverable or explicitly terminal when failure occurs.
8. Covered by unit, integration or end-to-end tests proportionate to its risk.

### 1.2 Workflow naming

Use identifiers `WF-XX` for stable documentation references. Code modules may use names such as `ingestCompositeDocx`, `processResume`, `rebuildAssessment` and `createRankingSnapshot`, but they should link to the appropriate workflow ID in comments or developer documentation when useful.

---

## 2. Workflow index

| ID | Name | Trigger | Priority |
|---|---|---|---|
| WF-01 | Inspect initial Word attachment | Initial dataset supplied | P0 |
| WF-02 | Register and store source document | Valid source file submitted | P0 |
| WF-03 | Segment resumes from composite Word document | Parsed composite DOCX available | P0 |
| WF-04 | Validate and deduplicate resume source | New resume/segment discovered | P0 |
| WF-05 | Parse individual DOCX | Individual DOCX upload | P0 |
| WF-06 | Parse individual PDF | Individual PDF upload | P0 |
| WF-07 | Normalize extracted text | Parsed source available | P0 |
| WF-08 | Create structured candidate extraction | Valid resume text ready | P0 |
| WF-09 | Validate model output and evidence | LLM response received | P0 |
| WF-10 | Normalize candidate profile | Extraction validated | P0 |
| WF-11 | Calculate relevant experience | Valid experience records available | P0 |
| WF-12 | Assess candidate against LCA JD | Profile and LCA rubric available | P0 |
| WF-13 | Assess candidate against UI/UX JD | Profile and UI/UX rubric available | P0 |
| WF-14 | Classify candidate across both roles | Both assessments available | P0 |
| WF-15 | Create role ranking snapshot | Assessment set updated | P0 |
| WF-16 | Process a new individual resume | HR submits upload | P0 |
| WF-17 | Human review and correction | HR opens/updates candidate | P0 |
| WF-18 | Reprocess or re-score existing records | New parser/prompt/rubric version or retry | P0 |
| WF-19 | Recover failed processing job | Retryable job or manual retry | P0 |
| WF-20 | Export results and quality report | Authorized HR/admin request | P1 |
| WF-21 | Retention/deletion request | Authorized admin instruction | P1 |
| WF-22 | Future public-source scraping connector | Approved source/configuration | Future |

---

## 3. WF-01 — Inspect initial Word attachment

### Purpose

Inspect the single attached Word document that contains, references or organizes the 47-resume dataset. This workflow prevents the implementation agent from assuming that a Word document is a ZIP file or a filesystem directory.

### Trigger

The project owner attaches the initial dataset Word document.

### Inputs

- One DOCX attachment.
- Expected resume count: 47.
- Allowed source formats and import rules from `Description.md`.

### Preconditions

- Operator has authority to process the file.
- Secure import environment is available.
- Source file can be read without exposing it publicly.

### Steps

1. Read the actual attachment bytes/path supplied by the platform.
2. Record filename, byte size, received time and source channel.
3. Calculate SHA-256.
4. Verify DOCX format/signature and parser compatibility.
5. Store the original in private storage or a controlled local import directory.
6. Parse paragraphs, tables, headings, section breaks and supported structures.
7. Inspect whether the document contains a directory listing, resume contents, embedded objects or a mixture.
8. Detect visible filenames and explicit separators.
9. Generate an initial inventory of content blocks and likely resume-start signals.
10. Compare detected content with the expected 47 records.
11. Produce an inspection report and segmentation-readiness status.
12. Stop and report if the file is only a listing without actual resume contents.

### Outputs

- `source_document` record.
- Parser inspection result.
- Source hash and metadata.
- Structure inventory.
- Preliminary record/boundary inventory.
- `IMPORT_READY`, `PARTIALLY_READY` or `BLOCKED` status.

### Failure handling

- Invalid file: `UNSUPPORTED_FORMAT` or `PARSER_ERROR`.
- Empty document: `EMPTY_DOCUMENT`.
- No resume content: mark blocked; do not fabricate data.
- Embedded objects inaccessible: list them as unavailable and request a supported source only if required.

### Acceptance criteria

- Original attachment checksum is persisted.
- Actual document structure is described.
- No assumption that a printed filename is a separate file.
- Expected count discrepancy is visible.
- No candidate profile is created before a defensible segment exists.

---

## 4. WF-02 — Register and store source document

### Purpose

Create an immutable source record and store the original source file securely.

### Trigger

A file passes initial validation.

### Inputs

- Source file bytes.
- Filename, MIME, size and source kind.
- Importing user or system actor.
- Idempotency key.

### Steps

1. Validate allowed extension and actual detected MIME.
2. Check size limit.
3. Calculate SHA-256.
4. Search for an exact checksum match.
5. If duplicate exists, return the existing source record or require explicit re-import/version action.
6. Generate UUID storage path.
7. Upload to private object storage.
8. Verify object exists and metadata is consistent.
9. Insert `source_documents` record.
10. Create audit event.
11. Return source document ID and safe metadata.

### Outputs

- Source document UUID.
- Private storage key.
- Checksum.
- Stored status.

### Failure handling

- Storage upload fails: do not create a completed source record; allow retry.
- Database insert fails after storage succeeds: record/orphan cleanup workflow must reconcile the object.
- Duplicate checksum: do not create a second source unless version/re-import is explicitly authorized.

### Acceptance criteria

- Storage object is private.
- Source record has stable UUID and checksum.
- Duplicate submissions are idempotent.

---

## 5. WF-03 — Segment resumes from composite Word document

### Purpose

Create individual resume records from the consolidated Word source without requiring a ZIP or a real folder.

### Trigger

WF-01 produces a parsed composite Word document.

### Inputs

- `ParsedDocument`.
- Source document ID and checksum.
- Expected count of 47.
- Segmentation rule/version.

### Steps

1. Order parsed blocks by source order.
2. Detect explicit filenames and anonymized references.
3. Detect author-supplied separators and heading patterns.
4. Detect page/section boundaries as supporting—not sole—signals.
5. Propose start/end block boundaries.
6. Score each boundary using transparent rules and stored signals.
7. Group blocks into candidate resume segments.
8. Validate each segment for plausible resume content.
9. Check for overlap, gaps, empty segments and duplicate fingerprints.
10. Preserve the visible original filename when present.
11. Otherwise assign `SOURCE-DOCX-RESUME-NNN` as an import label and mark original filename unavailable.
12. Generate candidate/resume UUIDs.
13. Create `resume_documents` records for confirmed/provisional segments.
14. Produce a segmentation manifest and count reconciliation.
15. Route ambiguous segments to review rather than confirmed scoring.

### Outputs

- Resume segment records.
- Segment fingerprints.
- Source locators.
- Segmentation status.
- Manifest and discrepancy report.

### Failure handling

- No defensible boundary: `SEGMENTATION_AMBIGUOUS`.
- Expected 47 but detected a different count: report discrepancy; do not force the count.
- Duplicate fingerprint: mark potential duplicate; do not merge people automatically.
- Segment with insufficient text: review/reject according to documented rules.

### Acceptance criteria

- Each confirmed segment has exact source range/locator.
- Segment boundaries are explainable.
- A page break alone does not guarantee a new candidate.
- Employer/job changes inside one resume do not produce new candidates.

---

## 6. WF-04 — Validate and deduplicate resume source

### Purpose

Check a single resume segment/file before expensive extraction.

### Trigger

A new segment is created or an individual file is uploaded.

### Steps

1. Verify file/segment is readable.
2. Verify MIME/content and supported format where applicable.
3. Check non-empty text and minimum content threshold.
4. Calculate raw and normalized fingerprints.
5. Check exact source checksum and segment fingerprint.
6. Search for possible duplicate content.
7. If exact duplicate: link to existing record or mark duplicate according to import policy.
8. If similar but not identical: flag for review only; never auto-merge.
9. Confirm candidate/resume ID relationships.
10. Create processing job with idempotency key.

### Outputs

- Validated `ResumeInput` or rejection/review state.
- Duplicate/possible-duplicate status.
- Processing job ID.

### Acceptance criteria

- Duplicate exact upload creates no duplicate candidate/processing result.
- Similar templates do not automatically merge different candidates.

---

## 7. WF-05 — Parse individual DOCX

### Purpose

Extract text and source structure from an individual uploaded Word resume.

### Trigger

An individual DOCX passes validation.

### Steps

1. Load file from private storage or controlled browser import.
2. Parse text with Mammoth.js or approved equivalent.
3. Extract paragraph/table order and heading/style information where available.
4. Identify likely section headings without discarding unknown sections.
5. Capture source locators.
6. Record unsupported structures (e.g. text boxes/floating content) where detectable.
7. Verify non-empty, readable content.
8. Persist raw extracted text separately from normalized text.
9. Return `ParsedDocument`.

### Failure handling

- Parser cannot open file: `PARSER_ERROR`.
- No useful text: `EMPTY_DOCUMENT` or `UNREADABLE_DOCUMENT`.
- Unsupported structure detected: warning and review status.

### Acceptance criteria

- Original file remains unchanged.
- Text and provenance are preserved.
- Parsing limitations are reported.

---

## 8. WF-06 — Parse individual PDF

### Purpose

Extract text-based PDF content and page provenance.

### Trigger

An individual PDF passes validation.

### Steps

1. Load PDF with PDF.js or approved equivalent.
2. Extract text page by page.
3. Capture page numbers and reading order.
4. Calculate page text density/readability indicators.
5. Identify image-only or textless pages.
6. Preserve raw page text and aggregate document text.
7. Mark OCR requirement when relevant.
8. Return `ParsedDocument`.

### Failure handling

- Encrypted/unreadable PDF: review/fail according to parser support.
- Image-only PDF: `OCR_REQUIRED`.
- Partial text extraction: `REVIEW_REQUIRED` with affected pages.

### Acceptance criteria

- Page references are correct.
- Textless pages are not represented as fully parsed.
- OCR is not silently implied when none occurred.

---

## 9. WF-07 — Normalize extracted text

### Purpose

Create a consistent text representation for extraction while preserving source fidelity.

### Trigger

A parser returns `ParsedDocument`.

### Steps

1. Preserve parser output unchanged as raw text/blocks.
2. Normalize Unicode and line endings.
3. Normalize repeated whitespace without deleting meaningful boundaries.
4. Preserve headings, bullets, dates, units and section order.
5. Keep table row/cell context where possible.
6. Generate offsets that map normalized text back to source blocks where feasible.
7. Record normalization version.
8. Produce `ResumeInput`.

### Acceptance criteria

- Raw content remains available.
- Normalized text does not erase dates, units, negations or tool names.
- Every normalized segment maps to source provenance or carries a documented locator limitation.

---

## 10. WF-08 — Create structured candidate extraction

### Purpose

Use an LLM to extract structured, job-relevant facts from one resume at a time.

### Trigger

A validated `ResumeInput` is queued.

### Steps

1. Load active extraction prompt and schema version.
2. Build a minimal input payload containing only this resume's text and source block IDs.
3. Mark resume content as untrusted data in the prompt.
4. Call the configured provider from a trusted backend environment.
5. Request strict structured output.
6. Parse response.
7. Store raw response securely with provider/model/prompt metadata.
8. Pass response to WF-09.

### Rules

- One resume per extraction request.
- Do not ask for final scores/rankings.
- Do not include other candidates' documents.
- Do not permit external tool calls from the resume content.
- Do not include secret values in the prompt.

### Failure handling

- Timeout/rate limit: bounded retry.
- Provider outage: `RETRY_WAIT` then terminal failure after configured attempts.
- Invalid structured response: `INVALID_MODEL_OUTPUT` and optional targeted retry.

### Acceptance criteria

- Model/prompt/schema versions are recorded.
- Raw response is preserved.
- Candidate/resume IDs come from the application, not the model.

---

## 11. WF-09 — Validate model output and evidence

### Purpose

Ensure that structured output is valid and supported by the source document.

### Trigger

A model response is received.

### Steps

1. Validate JSON against the current runtime schema.
2. Reject unexpected types and invalid enum values.
3. Ensure required arrays/fields have correct shape.
4. Confirm IDs match application-supplied IDs.
5. Locate each important evidence quote in source text or source blocks.
6. Apply conservative normalization for whitespace/Unicode quote matching.
7. Mark evidence as verified, invalid or uncertain.
8. Check date ordering and impossible ranges.
9. Check whether direct/related evidence labels have supporting context.
10. Check that no unsupported project count or tool proficiency was invented.
11. Record validation results and warnings.
12. Route unresolved material failures to review/re-extraction.

### Outputs

- Validated extraction or rejected output.
- Evidence verification records.
- Warnings and error codes.

### Acceptance criteria

- A schema-valid but fabricated quotation is rejected.
- A missing skill remains missing/unverified.
- OpenLCA is not normalized to GaBi or SimaPro.

---

## 12. WF-10 — Normalize candidate profile

### Purpose

Transform validated extraction into canonical profile fields.

### Steps

1. Map raw skill names to canonical aliases while preserving raw value.
2. Normalize tool categories.
3. Normalize date precision.
4. Categorize experience type and relevant domains.
5. Deduplicate repeated statements that refer to the same evidence item.
6. Identify likely duplicate project entries without deleting the original references.
7. Normalize education fields while preserving the original text.
8. Store missing and uncertain fields explicitly.
9. Link all profile facts to evidence IDs/source locators.
10. Create a new immutable profile version.

### Acceptance criteria

- Raw extraction remains unchanged.
- Canonical value and raw value remain linked.
- Unknown terms are retained rather than dropped.

---

## 13. WF-11 — Calculate relevant experience

### Purpose

Calculate non-overlapping duration by relevant experience category.

### Steps

1. Read experience entries and source evidence.
2. Validate start/end date precision.
3. Use assessment-date snapshot for current roles.
4. Classify relevant role domains with an auditable reason.
5. Separate professional, internship, academic research and project-based experience.
6. Convert dates to month intervals.
7. Merge overlapping intervals for each requested metric.
8. Exclude incomplete/uncertain intervals from verified total, but retain and display them.
9. Persist total months and the included interval IDs.
10. Emit warnings for partial dates and uncertain relevance.

### Outputs

- Relevant professional months/years.
- Relevant internship months/years.
- Relevant academic/research months/years.
- Combined relevant exposure where useful.
- Calculation provenance.

### Acceptance criteria

- Overlapping positions are not double-counted.
- Academic research is not automatically reported as professional employment.
- A reviewer can inspect which intervals contributed to a total.

---

## 14. WF-12 — Assess candidate against LCA JD

### Purpose

Calculate an evidence-based LCA score.

### Inputs

- Validated current profile version.
- LCA JD version.
- LCA rubric version.
- Experience calculation.
- Evidence registry.

### Steps

1. Load active LCA rubric.
2. Validate weights total 100.
3. Evaluate each criterion using stored evidence.
4. Assign `DIRECT`, `RELATED`, `NOT_EVIDENCED` or `UNCERTAIN`.
5. Calculate points using the configured multiplier.
6. Store criterion explanation and evidence IDs.
7. Evaluate mandatory verification flags independently of score.
8. Calculate total score and score band.
9. Store the exact profile/JD/rubric/scoring versions.

### Important rules

- GaBi/SimaPro and OpenLCA remain separate.
- LCA project count must be supported by distinct evidence.
- Emissions inventories/environmental monitoring may be related evidence but are not automatically LCA project completions.
- Onsite, relocation, travel and commitment questions are not inferred from address or demographic context.
- Detailed JD baseline is 2–3 years; 4–6 years remains a disclosed sensitivity scenario until explicitly resolved.

### Acceptance criteria

- Every criterion has a reason and source evidence or an explicit missing/uncertain state.
- Total is the sum of criterion points.
- Mandatory verification does not silently become a hidden score penalty.

---

## 15. WF-13 — Assess candidate against UI/UX JD

### Purpose

Calculate an independent evidence-based UI/UX score.

### Steps

1. Load active UI/UX rubric.
2. Validate weights total 100.
3. Evaluate Figma/prototyping, UX principles, research, interface projects, high-fidelity work, visual design evidence, responsiveness, design systems and collaboration.
4. Distinguish skill-list mentions from project demonstrations.
5. Identify portfolio links where explicitly provided.
6. Do not claim visual-quality evaluation without a portfolio review.
7. Apply configured evidence multipliers.
8. Store criterion explanations/evidence IDs.
9. Calculate total and score band.
10. Record profile/JD/rubric/scoring versions.

### Acceptance criteria

- No arbitrary multi-year experience penalty.
- Generic design thinking does not automatically become UI/UX proficiency.
- A portfolio not supplied is marked absent/unverified, not fabricated.

---

## 16. WF-14 — Classify candidate across both roles

### Purpose

Provide a high-level cross-role label for navigation and review.

### Steps

1. Load current LCA and UI/UX assessments.
2. Check extraction/segmentation reliability.
3. If unreliable, mark `UNCERTAIN`.
4. If both scores >= 55, mark `BOTH`.
5. If LCA >= 55 and exceeds UI/UX by >= 10, mark `LCA_STRONGER`.
6. If UI/UX >= 55 and exceeds LCA by >= 10, mark `UIUX_STRONGER`.
7. If both scores < 35 and extraction is reliable, mark `NEITHER_EVIDENCED`.
8. Otherwise mark `UNCERTAIN`.
9. Save classification version and rule explanation.

### Acceptance criteria

- Candidate is not forced into one role.
- Classification does not automatically reject a candidate.
- Thresholds are versioned and configurable.

---

## 17. WF-15 — Create role ranking snapshot

### Purpose

Create a deterministic ranked list for one role.

### Steps

1. Load all eligible current assessments for one job/rubric/scoring version.
2. Exclude only records that are explicitly unassessable from numeric ranking; list them separately as review-required.
3. Sort by total score descending.
4. Apply configured role-primary-criterion score as first tie-breaker.
5. Apply configured critical-review-flag tie-breaker if appropriate.
6. Apply stable candidate reference as final tie-breaker.
7. Assign positions.
8. Persist immutable snapshot and items.
9. Publish current snapshot pointer transactionally.
10. Record the candidate/profile/assessment versions used.

### Acceptance criteria

- Rebuilding from the same exact inputs yields the same order.
- A new candidate does not change existing candidate identity.
- Tied scores have deterministic documented ordering.
- Historical snapshots remain available.

---

## 18. WF-16 — Process a new individual resume

### Purpose

Support the mandatory testing workflow: HR uploads a new resume and it is ranked in the existing pool.

### Trigger

Authenticated HR user submits a DOCX or text-based PDF.

### Steps

1. Validate authorization and request.
2. Verify file format/content/size.
3. Calculate checksum.
4. Detect exact duplicate.
5. Request or create a private storage upload path.
6. Store source file and verify it.
7. Create candidate/resume record with stable UUIDs.
8. Create idempotent processing job.
9. Parse and normalize text.
10. Run structured extraction and validation.
11. Create new profile version.
12. Calculate experience metrics.
13. Run WF-12 and WF-13.
14. Run WF-14.
15. Rebuild WF-15 snapshots for both roles.
16. Notify UI of terminal processing status.
17. Show the new candidate and updated rankings.

### Acceptance criteria

- One upload produces one stable candidate/resume record unless it is an exact duplicate.
- The new resume enters both role assessments or an explicit review/unassessable state.
- Existing assessments are not overwritten.

---

## 19. WF-17 — Human review and correction

### Purpose

Allow HR to confirm, correct or annotate extracted information without erasing source/model history.

### Steps

1. HR opens candidate detail.
2. UI displays profile, evidence, extraction warnings and source document.
3. HR records status/note or proposes a correction.
4. Backend validates permission and input.
5. Persist a `review_event` with before/after values and actor/time.
6. If a structured field is corrected, create a new reviewed profile version or overlay—not an overwrite of raw extraction.
7. Recalculate affected assessments if the correction changes evidence/criteria.
8. Store the new assessment versions and ranking snapshots.
9. Show the user what changed.

### Rules

- Do not erase the original extracted value.
- Distinguish human-confirmed facts from model-extracted facts.
- Do not let reviewer notes silently change scores unless the reviewer explicitly corrects a criterion/evidence state through a controlled action.
- Keep audit history.

### Acceptance criteria

- Every change has actor, time, affected record and reason/note where required.
- Old versions remain reconstructable.

---

## 20. WF-18 — Reprocess or re-score existing records

### Purpose

Handle changes to parser, prompt, schema, normalization, JD or scoring configuration.

### Reprocessing matrix

| Change | Reparse source? | Re-run LLM? | Renormalize? | Rescore? |
|---|---|---|---|---|
| Score weight change | No | No | No | Yes |
| Classification threshold change | No | No | No | Classification only |
| JD wording change with same extraction schema | Usually no | Usually no | No | Yes |
| New extraction field required | No if raw text retained | Yes | Yes | Yes |
| Prompt change | No | Yes | Yes | Yes |
| Parser bug fix affecting text | Yes | Yes | Yes | Yes |
| Skill alias registry change | No | No | Yes | Yes |
| Experience algorithm change | No | No | Recalculate metric | Yes |

### Steps

1. Identify affected records from version metadata.
2. Calculate target idempotency keys.
3. Preserve current/historical versions.
4. Queue only necessary stages.
5. Process and validate new outputs.
6. Recalculate affected assessments.
7. Create new ranking snapshots.
8. Compare result changes and record reason/version.

### Acceptance criteria

A weight-only change must not incur an unnecessary model call or alter stored raw extraction.

---

## 21. WF-19 — Recover failed processing job

### Purpose

Provide safe retry/recovery for transient failures.

### Steps

1. Load failed/retry-wait job.
2. Check error category and retry eligibility.
3. Confirm attempt count is below maximum.
4. Confirm no active unexpired worker lease exists.
5. Schedule with bounded exponential backoff and jitter.
6. Claim atomically when eligible.
7. Resume from the last safely persisted stage where possible.
8. Avoid duplicating prior extraction/profile/assessment versions.
9. Mark complete or terminal failed.
10. Record recovery event.

### Retryable examples

- Temporary provider outage.
- Rate limit.
- Network timeout.
- Transient database connection failure.

### Non-retryable without correction

- Unsupported file type.
- Corrupt document.
- Ambiguous segmentation requiring review.
- Persistent evidence mismatch.
- Unauthorized operation.

### Acceptance criteria

Retries are bounded, observable and idempotent.

---

## 22. WF-20 — Export results and quality report

### Purpose

Provide HR/admin with a controlled export for review and assignment evidence.

### Export options

- LCA ranked list.
- UI/UX ranked list.
- All-candidate classification summary.
- Data-quality/import manifest.
- Criterion-level explanation report.

### Rules

- Export only to authorized users.
- Include generation time and JD/rubric/scoring version.
- Include candidate reference, not unnecessary personal information.
- Avoid embedding full resume text by default.
- Do not present synthetic fixtures as real candidates.
- Mark unresolved extraction/segmentation states.

### Acceptance criteria

Exported ranking matches the selected database snapshot exactly.

---

## 23. WF-21 — Retention and deletion request

### Purpose

Handle approved deletion/de-identification without leaving orphaned source files or misleading audit history.

### Steps

1. Authenticate and authorize admin.
2. Identify candidate/source/segment graph.
3. Check organizational retention and legal-hold requirements.
4. Confirm deletion scope.
5. Remove or de-identify derived profiles/assessments according to policy.
6. Delete private source objects.
7. Verify no active signed access remains.
8. Record a minimal deletion audit event.
9. Verify API no longer returns deleted records.

### Acceptance criteria

Deletion scope is complete and documented; audit records do not preserve the deleted content itself.

---

## 24. WF-22 — Future public-source scraping connector

### Status

Future extension; not part of V1 resume ranking.

### Purpose

Retrieve approved public benchmarking material that may support sustainability/LCA research, not candidate ranking.

### Proposed steps

1. Register an approved source with terms/access rules and rate limits.
2. Select an appropriate fetch adapter (ordinary HTTP first; browser automation only when required).
3. Fetch content under source-specific policy.
4. Record URL, timestamp, content hash and retrieval metadata.
5. Parse and normalize content.
6. Validate extracted data and preserve citation/source provenance.
7. Deduplicate content.
8. Store in a separate benchmarking data domain.
9. Surface failures and parser changes.

### Guardrails

- Respect applicable laws, source terms, rate limits and robots instructions where relevant.
- Do not bypass access controls or CAPTCHA.
- Do not scrape private personal data or restricted pages.
- Do not blend benchmark data into candidate fit scores without a separately approved, explainable methodology.

---

## 25. Cross-workflow data contracts

Every workflow must use:

- UUIDs for internal identity.
- Candidate/resume/source IDs explicitly passed in inputs.
- Version IDs for transformations and assessments.
- Correlation IDs across asynchronous operations.
- Explicit status and error codes.
- Stable source locators.
- Idempotency keys for retryable mutations.
- Typed input/output contracts.

Do not rely on list order, filename substring, object key guessing or client-supplied candidate IDs as trusted identity.

## 26. Workflow acceptance and test mapping

| Workflow | Minimum test evidence |
|---|---|
| WF-01 | Composite Word inspection tests, listing-only detection |
| WF-02 | Checksum/storage/idempotency integration tests |
| WF-03 | Explicit, ambiguous and malformed segmentation fixtures |
| WF-04 | Exact and similar duplicate tests |
| WF-05 | DOCX paragraph/table tests |
| WF-06 | Multi-page and scanned PDF tests |
| WF-07 | Raw/normalized text preservation tests |
| WF-08 | Provider adapter mocked tests, prompt-injection fixture |
| WF-09 | Schema and fabricated-quote rejection tests |
| WF-10 | Alias and unknown-skill preservation tests |
| WF-11 | Overlap/current/partial-date tests |
| WF-12 | LCA weights/evidence/mandatory flags tests |
| WF-13 | UI/UX criteria/entry-level experience tests |
| WF-14 | All threshold boundary tests |
| WF-15 | Deterministic ordering and snapshot tests |
| WF-16 | Full new-upload E2E test |
| WF-17 | Reviewer audit/versioning test |
| WF-18 | No unnecessary extraction on weight change |
| WF-19 | Retry/lease/idempotency tests |
| WF-20 | Export matches selected snapshot |
| WF-21 | Deletion completeness test in non-production test environment |
| WF-22 | Mocked source connector and policy tests |

## 27. Change control

When a workflow is added or modified:

1. Update this library.
2. Update `Workflow standard.md` if a reusable convention changes.
3. Update `LLD.md` if contracts/schema/algorithms change.
4. Update tests and fixtures.
5. Record the change in the project change log/architecture decision records where material.
6. Preserve historical result versions where the change affects data or scoring.
