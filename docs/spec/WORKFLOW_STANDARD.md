# Workflow Standard — Engineering and Operational Conventions

> **Document role:** Mandatory standard governing every workflow, batch operation, asynchronous job and AI-assisted task.  
> **Audience:** AI implementation agent, engineers, QA, operators.  
> **Status:** Mandatory.  
> **Relationship:** `Workflow library.md` defines individual workflows; this document defines the rules every workflow must obey.

---

## 1. Purpose

This standard ensures that the application behaves consistently across initial import, individual uploads, extraction, normalization, ranking, reviewer activity, retries, exports and future source connectors.

A workflow is not complete merely because its happy path works. It must validate inputs, preserve provenance, maintain integrity, expose failures, support safe retries and be testable.

## 2. Mandatory workflow structure

Every workflow specification and implementation must define the following fields:

1. **Workflow ID and name** — stable ID such as `WF-03`.
2. **Purpose** — why the workflow exists.
3. **Trigger** — event that starts it.
4. **Actor** — user/system/worker responsible.
5. **Inputs** — typed fields and referenced records.
6. **Preconditions** — what must already be true.
7. **Authorization** — what permission is required.
8. **Steps** — ordered operations and validation points.
9. **Outputs** — typed result and created/updated records.
10. **Side effects** — storage/database/provider actions.
11. **Idempotency** — how repeated execution is handled.
12. **Concurrency** — how simultaneous execution is controlled.
13. **Failure modes** — expected errors and recovery.
14. **Observability** — events/metrics/log fields.
15. **Security/privacy** — sensitive-data and permission rules.
16. **Tests** — unit/integration/E2E coverage.
17. **Acceptance criteria** — evidence that the workflow is complete.

If a workflow has no side effects, record that explicitly. If a workflow cannot be retried safely, document why and require human intervention.

## 3. General workflow lifecycle

Use this lifecycle unless a workflow has a documented reason to differ:

```text
TRIGGERED
   ↓
VALIDATE INPUT
   ↓
AUTHORIZE ACTOR
   ↓
CHECK IDEMPOTENCY / DUPLICATE
   ↓
ACQUIRE CONCURRENCY CONTROL
   ↓
EXECUTE BUSINESS STEPS
   ↓
VALIDATE OUTPUT AND PROVENANCE
   ↓
PERSIST ATOMICALLY
   ↓
EMIT SAFE AUDIT/OPERATIONAL EVENT
   ↓
RETURN RESULT / UPDATE STATUS
```

Do not perform irreversible or expensive side effects before validation and authorization. Use explicit transactions or compensating actions for operations spanning storage and database systems.

## 4. Input validation standards

### 4.1 Validate at every trust boundary

Validate input when it crosses:

- Browser to API.
- API to domain service.
- File upload to parser.
- Parser to extraction service.
- LLM provider to application.
- Application to database.
- Worker queue to job handler.
- Reviewer form to persistence.
- External source connector to stored data.

A TypeScript type alone is not runtime validation. Use Zod or an equivalent runtime schema at untrusted boundaries.

### 4.2 Reject or flag unknown values

- Reject malformed IDs and invalid enum values.
- Preserve unknown skill names rather than discarding them.
- Preserve unknown resume sections as raw content.
- Mark ambiguous data as uncertain instead of forcing a value.
- Do not convert missing values to empty strings when `null` or an explicit state is more accurate.

### 4.3 File input rules

- Verify extension, MIME/signature, size and parser readability.
- Do not trust client-supplied MIME or filename.
- Generate internal storage paths.
- Preserve original filename as metadata.
- Do not execute embedded scripts/macros.
- Report structures that the parser cannot inspect.

## 5. Identity, correlation and provenance standards

### 5.1 Identity

Use stable UUIDs for source documents, candidates, resumes, extractions, profiles, assessments and processing jobs. A display reference may be human-readable, but it is not the database primary key.

Never use:

- Current rank position.
- Array index.
- Table row number.
- Filename prefix alone.
- Mutable name/title text.

as durable identity.

### 5.2 Correlation IDs

Every multi-step operation must have a correlation ID. Propagate it through:

- API request.
- Upload/source registration.
- Processing job.
- Parser/extraction/validation.
- Assessment and snapshot generation.
- Audit/operational events.

This permits debugging without logging the resume text itself.

### 5.3 Source provenance

Every extracted claim that can affect ranking must retain:

- Original source document ID.
- Resume segment ID where relevant.
- Source locator.
- Raw/extracted quote.
- Evidence validation status.
- Extraction/profile version.

If an exact page/paragraph locator is unavailable, state the best available locator. Never fabricate a page number or section.

## 6. Idempotency standards

A workflow is idempotent when repeating the same request with the same key/input does not create duplicate or conflicting effects.

Required idempotency for:

- Source document registration.
- Resume segment creation.
- Processing job creation/claim.
- Extraction version creation.
- Candidate profile version creation.
- Role assessment creation.
- Ranking snapshot activation.
- Reviewer mutations where clients may retry.

### 6.1 Idempotency key design

Keys should encode the stable input identity and relevant processing version. Do not include volatile timestamps unless the operation is intentionally a new run.

Example extraction idempotency components:

```text
resume_id
source_version
parser_version
segmentation_version
prompt_version
schema_version
```

Example assessment idempotency components:

```text
candidate_profile_version
job_id
jd_version
rubric_version
scoring_version
classification_version
```

Use database unique constraints to enforce the key. In-memory checks are insufficient.

## 7. Concurrency and transaction standards

### 7.1 Atomic claims

Only one worker may own a processing job at a time. Use a database transaction/locking strategy and a lease with an expiry. A worker that loses its lease must not continue writing results.

### 7.2 Avoid cross-candidate writes

Every operation must receive explicit `candidateId`, `resumeId`, `sourceDocumentId` and `processingJobId` where relevant. Validate that the foreign-key relationships agree before persistence.

Do not rely on global mutable variables or reuse a previous loop's candidate ID.

### 7.3 Database transaction boundaries

Use transactions for logically inseparable changes, such as:

- Persist profile version and related normalized records.
- Persist assessment and criterion assessments.
- Persist ranking snapshot and all ranking items.
- Activate a rubric version after weight validation.

Object-storage writes cannot participate in a PostgreSQL transaction. Use a compensating/reconciliation process for orphaned objects or incomplete records.

### 7.4 Avoid long-running database transactions

Do not keep a transaction open while waiting for an LLM or file parser. Create/claim job, perform external work, validate, then persist results in a short transaction.

## 8. State-machine standards

- Use explicit finite status values.
- Validate state transitions in domain logic/database operations.
- Record timestamps for material transitions.
- Do not represent errors only through a free-text message.
- Keep `FAILED`, `REVIEW_REQUIRED` and `COMPLETED` distinct.
- A partial parent-batch success must not be collapsed into an ambiguous generic status.
- Terminal failure should preserve enough metadata to diagnose and retry safely.

Recommended processing states are defined in `LLD.md` and `Workflow library.md`. Use one canonical set across UI, database and worker.

## 9. Error taxonomy and user-facing messages

### 9.1 Error representation

Every error should include:

- Stable error code.
- Safe message.
- Retryable boolean.
- Correlation ID.
- Technical diagnostic in protected logs, if appropriate.
- Related source/resume/job ID.

### 9.2 Error categories

| Category | Example | Typical response |
|---|---|---|
| Validation | Unsupported file | Ask user to provide DOCX/PDF |
| Parsing | Document cannot be read | Mark failed/review-required and preserve source |
| Segmentation | Resume boundary unclear | Queue manual review; do not score as confirmed |
| Model | Rate limit/timeout | Bounded retry |
| Model output | Invalid JSON | Reject and optionally targeted retry |
| Evidence | Quote not found | Mark field uncertain and review |
| Data integrity | Foreign-key/unique conflict | Roll back and investigate/idempotently reconcile |
| Authorization | User lacks permission | Deny without leaking record existence unnecessarily |
| Infrastructure | Storage/database unavailable | Retry when transient; preserve job state |

### 9.3 User-facing messages

Messages must be useful to non-technical HR users. Examples:

- `This document could not be read. The original file has been retained for review.`
- `The resume boundary in the imported Word document is unclear. This record has not been included as a verified candidate.`
- `The resume was uploaded, but extraction needs review before a reliable ranking can be shown.`
- `The processing service is temporarily unavailable. The system will retry automatically.`

Do not expose stack traces, provider payloads, SQL errors or API credentials.

## 10. Retry and recovery standards

### 10.1 Retry only transient failures

Retry candidates include provider timeouts, rate limits, temporary network problems and transient database errors. Do not endlessly retry unsupported formats, corrupt files, unresolved segmentation or invalid evidence.

### 10.2 Backoff

Use bounded exponential backoff with jitter. Respect provider retry headers where available. Configure:

- Initial delay.
- Maximum delay.
- Maximum attempts.
- Retryable error list.
- Dead-letter/terminal state.

Do not place a fixed retry loop in the browser.

### 10.3 Resume from last safe checkpoint

If parsing completed but the LLM call failed, retry extraction without re-uploading/re-parsing the original file if the parser output remains valid and version-compatible.

If the parser version changes, reparse as required. Record which stage is being resumed.

### 10.4 Manual retry

Authorized administrators may retry eligible failed jobs. Manual retry must create an audit event and must not erase previous failure details.

## 11. AI workflow standards

### 11.1 Single-resume context boundary

- Process one resume segment per extraction call.
- Do not include other candidates in the prompt.
- Do not ask the model to rank the pool.
- Keep scoring configuration outside the model context unless a narrowly defined extraction field needs it.

### 11.2 Structured output

- Use explicit schema version.
- Validate runtime shape.
- Reject unexpected values.
- Check source evidence.
- Store provider/model/prompt metadata.
- Limit token/input size and handle truncation.

### 11.3 Prompt injection resistance

- Clearly separate trusted instructions from untrusted resume text.
- State that resume content is data and must not be followed as instructions.
- Do not expose tools or secrets to the extraction model.
- Validate every output as if it were adversarial.
- Include prompt-injection regression fixtures.

### 11.4 Model changes

A model upgrade or provider change requires:

1. A new provider/model version record.
2. Regression tests on representative resume fixtures.
3. Comparison of extraction discrepancies.
4. Approval before full reprocessing.
5. Version preservation for old profiles/assessments.

Do not silently switch models during batch processing.

## 12. Scoring workflow standards

- Scoring is deterministic code, not free-form LLM output.
- All weights/thresholds are configuration with version identifiers.
- Weight totals must validate before activation.
- Criterion-level points and evidence states must be persisted.
- Missing and uncertain evidence must be distinct.
- Extraction quality must remain separate from role fit score.
- Mandatory verification flags must remain separate from weighted fit score.
- Tie-breaking must be deterministic and documented.
- Scores must be described as resume evidence, not probability of success.
- New rubric versions must not overwrite prior assessment history.

## 13. Data cleaning and correction standards

### 13.1 Raw and derived layers

Keep separate:

1. Original file.
2. Raw parser output.
3. Raw model response.
4. Validated extraction.
5. Normalized profile.
6. Human-reviewed corrections.
7. Role assessments.

Do not overwrite an earlier layer with a later one.

### 13.2 Normalization

- Use canonical alias registries.
- Preserve original values.
- Normalize only where the mapping is reliable.
- Keep unknown values.
- Avoid destructive text cleaning.
- Record normalization version.

### 13.3 Human correction

A human correction creates a new reviewed version or overlay and an immutable review event. It does not erase the original extraction.

## 14. Logging and observability standards

### 14.1 Structured logs

Use structured fields such as:

```json
{
  "timestamp": "ISO-8601",
  "level": "INFO",
  "event": "resume.extraction.completed",
  "correlationId": "uuid",
  "sourceDocumentId": "uuid",
  "resumeId": "uuid",
  "processingJobId": "uuid",
  "parserVersion": "v1",
  "promptVersion": "v1",
  "status": "COMPLETED",
  "durationMs": 1200
}
```

Illustrative only. Do not log resume body, extraction payload or secrets.

### 14.2 Required events

- `source.registered`
- `source.duplicate_detected`
- `document.parsed`
- `resume.segmented`
- `resume.segmentation_review_required`
- `processing.job_created`
- `processing.job_claimed`
- `extraction.started`
- `extraction.completed`
- `extraction.validation_failed`
- `profile.normalized`
- `assessment.completed`
- `ranking.snapshot_created`
- `review.event_created`
- `processing.retry_scheduled`
- `processing.failed`

### 14.3 Metrics

Track counts/durations/failure rates by stage. Avoid metrics labels containing candidate names, emails, full filenames or free-form resume text.

## 15. Workflow security and privacy standards

Every workflow must:

- Apply authorization before accessing candidate data.
- Use private source storage.
- Minimize data passed to external services.
- Avoid writing resume contents to logs.
- Keep credentials server-side.
- Validate model output and untrusted file content.
- Record privileged administrative operations.
- Protect exports and signed URLs.
- Respect data retention/deletion procedures.

See `Security.md` for the full security policy.

## 16. Code organization standards

### 16.1 Domain modules

Business logic should live in domain/service modules, not inside React components or route handlers. Example boundaries:

- `parsers/`
- `segmentation/`
- `extraction/`
- `normalization/`
- `experience/`
- `scoring/`
- `classification/`
- `ranking/`
- `reviews/`

### 16.2 External adapters

Wrap Supabase, LLM providers, object storage and parsers behind adapters/interfaces. Avoid allowing provider-specific response structures to leak through the entire application.

### 16.3 Typed functions

Every public service function should define typed inputs/outputs and explicit error outcomes. Prefer discriminated unions/result objects for expected business failures.

### 16.4 Configuration

Keep role criteria, thresholds, alias dictionaries, file limits and retry settings in validated versioned configuration. Do not duplicate constants across UI and backend.

## 17. Documentation standards

Update documentation whenever implementation changes a contract or observable behaviour.

Minimum documentation:

- HLD and LLD.
- API contracts.
- Database migrations/data dictionary.
- Extraction and prompt methodology.
- Scoring and classification methodology.
- Import/segmentation report.
- Data quality report.
- QA report.
- Deployment guide.
- Known limitations.

For each non-trivial architecture change, create an ADR entry with context, decision, alternatives and trade-offs.

## 18. Testing standards

### 18.1 Unit tests

Test pure logic: parsers' normalization helpers, alias mapping, interval union, criterion points, classification thresholds, tie-break sorting, schema validators and quote matching.

### 18.2 Integration tests

Test interactions with database/storage adapters, worker jobs, LLM provider mocks, transaction behaviour, RLS and version creation.

### 18.3 End-to-end tests

Test real user journeys: login, dashboard, rankings, candidate detail, source preview, upload, processing and review action.

### 18.4 Regression fixtures

Keep anonymized/approved fixture documents that test:

- Direct LCA experience.
- Related environmental experience without proven LCA project count.
- Non-matching analytics profile.
- UI/UX project with Figma/prototype evidence.
- Generic design-thinking mention without UI/UX evidence.
- Overlapping experience dates.
- Invalid/missing dates.
- Prompt-injection text.
- DOCX tables/columns.
- Ambiguous composite-document boundaries.

Use only authorized fixtures. Do not commit the full 47 real resumes into a public repository.

### 18.5 Test result reporting

Report test command, suite, pass/fail count, environment and known skips. A test not run is not a passing test.

## 19. User interface workflow standards

- Every asynchronous action must show a clear status.
- Do not block the whole dashboard while one resume processes.
- Use accessible labels and keyboard controls.
- Show partial batch completion honestly.
- Separate score, extraction quality and review status.
- Show source evidence adjacent to the claim where possible.
- Use understandable wording for HR users.
- Avoid color-only status encoding.
- Provide empty/error/loading states.
- Confirm destructive or irreversible operations.

## 20. Batch processing standards

A batch is a collection of independently tracked resume jobs under one import ID.

- Store batch ID and expected record count.
- Process individual resume segments independently.
- Use bounded concurrency.
- Persist per-record status.
- Continue safe independent records when one fails.
- Report total, complete, failed, review-required, duplicate and unaccounted records.
- Do not mark the batch complete until reconciliation is performed.
- Make the batch resumable.

Recommended initial concurrency should be conservative and configurable. Measure provider rate limits and parser resource use before increasing it. Do not hardcode aggressive parallelism.

## 21. Ranking and snapshot standards

- One ranking snapshot per job/rubric/scoring version combination.
- Stable tie-breakers.
- Store candidate and assessment IDs per rank row.
- Never update old snapshot rows in place.
- Publish a new snapshot atomically.
- If one candidate is unassessable, display it in a separate review-required section rather than fabricating a numeric score.
- Ensure frontend pagination/filtering does not alter canonical rank positions.

## 22. Change management standards

Every material change must identify impact on:

- Data schema.
- Parser output.
- Resume segmentation.
- Extraction prompt/schema.
- Normalization.
- Scoring/rubric.
- API contracts.
- UI display.
- Security/RLS.
- Tests and documentation.

For a scoring change, create a new scoring/rubric version and re-score. For parser/extraction changes, create new derived versions rather than mutating historical data.

## 23. Pull request / implementation review checklist

Before merging or considering a phase complete:

- [ ] Change has a clear purpose and scope.
- [ ] No unrelated file rewrites.
- [ ] Types and schemas updated.
- [ ] Error and status cases considered.
- [ ] Authorization and data access reviewed.
- [ ] Idempotency/concurrency reviewed where relevant.
- [ ] Source provenance preserved.
- [ ] Logs avoid resume content and secrets.
- [ ] Tests added and run.
- [ ] Documentation updated.
- [ ] Migration rollback/forward strategy understood.
- [ ] No fabricated data or result claims.

## 24. Definition of workflow done

A workflow is complete only when:

1. Its trigger and actor are clear.
2. Inputs are runtime-validated.
3. Authorization is enforced where data is protected.
4. IDs and source provenance are carried through.
5. Side effects are idempotent or otherwise safely controlled.
6. Concurrency does not create duplicate/cross-linked records.
7. Expected errors are explicit and recoverable where possible.
8. Logs/metrics are safe and useful.
9. Tests prove the important branches.
10. Documentation reflects implemented behaviour.
11. Acceptance criteria are met with evidence.

If any item is not satisfied, mark the workflow partially complete and state the gap.
