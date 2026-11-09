# Architecture Decisions

ADR-001 to ADR-007 are adopted as written in [spec/HLD.md §12](spec/HLD.md). This file records decisions taken during implementation, each with the evidence that forced it.

## ADR-003a — The dataset arrived as 47 individual DOCX files, not one composite Word document

**Context.** The specs assume one consolidated Word attachment that would need segmentation (CONSTRUCTION §2.2, LLD §5).
**Evidence.** `npm run inspect:dataset` found a folder of 47 separate `.docx` files, each a complete resume ([IMPORT_MANIFEST.md](IMPORT_MANIFEST.md)).
**Decision.** Each file is its own source document of kind `INDIVIDUAL_DOCX`, imported through the same register → store → job path as a live upload. No segmentation adapter is built; none would have anything to segment. The `COMPOSITE_DOCX` kind, `source_segment_index` and `segmentation_status` remain in the schema so a composite source can be added later without a migration.
**Consequence.** Segmentation risk is zero for this dataset; the reconciliation check (47 expected vs found) still runs and is shown on every screen.

## ADR-008 — The model proposes evidence; code decides the state

**Context.** Pure rule matching misses paraphrase; letting the model pick DIRECT/RELATED gives it scoring power.
**Decision.** The model returns per-criterion evidence with verbatim quotes and a proposed state. Deterministic guards then decide: unverifiable quotes are dropped (criterion becomes UNCERTAIN), skills-list-only evidence is capped at RELATED, DIRECT needs criterion vocabulary in the quote, OpenLCA never satisfies GaBi/SimaPro, visual design caps at RELATED, LCA experience is computed from verified month intervals. Weights are never shown to the model.
**Consequence.** Scores are reproducible from the stored profile; the model's influence is bounded and visible in each criterion's explanation.

## ADR-009 — Gemini for extraction, chosen by the project owner

**Decision.** Google Gemini (`gemini-2.5-flash`, configurable via `GEMINI_MODEL`) with JSON-schema-constrained output and temperature 0. One resume per call, no tools.
**Data use (Security §7.2).** On the Gemini API free tier, Google may use prompts and responses to improve its products; on a billing-enabled (paid) project it does not. Enable billing on the key's Google Cloud project before processing real resumes. The adapter is one file (`packages/extraction/gemini.ts`) behind the `ExtractionProvider` interface, so a provider swap does not touch scoring.

## ADR-010 — Processing runs in the request's `after()` callback, not a queue service

**Context.** HLD §8 allows a worker or edge function; volume is 47 plus occasional uploads.
**Decision.** Jobs live in `processing_jobs` with an atomic lease (`claim_processing_job`, `FOR UPDATE SKIP LOCKED`). Live uploads run their job in Next.js `after()` once the upload is verified; a status poll resumes a job whose retry backoff has elapsed. The batch CLI runs the same `runJob` locally.
**Upgrade path.** If jobs outgrow a function's duration, a cron or queue worker can call `runJob` on `QUEUED`/`RETRY_WAIT` rows with no schema change.

## ADR-011 — Evidence lives with each criterion assessment, not a separate `evidence_snippets` table

**Decision.** Each `criterion_assessments` row stores its verified quotes and source locators as JSON, and the full verified profile is kept in `candidate_profiles.normalized_profile`. The raw model output is kept unmodified in `document_extractions`.
**Reason.** Every quote is only ever read with its criterion; a join table would add writes without a query that needs it. Add `evidence_snippets` when evidence must be corrected or reviewed independently of its criterion.

## ADR-012 — No `candidate_experiences` / `candidate_skills` / `candidate_projects` tables in V1

**Decision.** Structured details stay inside the versioned profile JSON. Experience totals the UI filters on are exposed through the `v_candidate_overview` view.
**Upgrade path.** Promote a field to a table when a query needs to filter or aggregate on it across candidates.

## ADR-013 — Rubric seed is generated from TypeScript and drift-tested

**Decision.** `packages/domain/rubrics.ts` is the single source of truth. The seed migration is generated from it, and a unit test fails if the committed SQL differs from the generator's output.
