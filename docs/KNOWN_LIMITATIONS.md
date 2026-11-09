# Known Limitations

| # | Limitation | Impact | Mitigation in V1 | Future work |
|---|---|---|---|---|
| 1 | Quote verification proves a passage exists, not that the model interpreted it correctly | A real quote could be attached to the wrong criterion | Guards require criterion vocabulary for Direct; HR sees every quote beside the source | Reviewer correction workflow creating a new profile version |
| 2 | Headers, footers, comments, text boxes and text inside images are not extracted | Evidence placed there is missed | Reported as "content not extracted" in quality checks; original document is one click away | Structural DOCX XML reader |
| 3 | Scanned / image-only PDFs are not OCR'd | Such uploads fail with `OCR_REQUIRED` | Counted and listed, never silently scored | OCR with confidence and provenance |
| 4 | One dataset file is empty | It cannot be assessed | Counted as failed; visible on the overview and All records | Ask the source for the correct file |
| 5 | Portfolios are not inspected | Visual design is capped at Related for everyone | Stated on the criterion, the mandatory check and the methodology page | Reviewer-recorded portfolio assessment |
| 6 | Project counts come from explicit statements only | A resume describing projects without saying "completed" may under-count | Shown as a mandatory check with the evidence used | Reviewer confirmation |
| 7 | Year-only dates are excluded from experience totals | Experience can be under-stated | Excluded roles are listed with the reason | Reviewer-entered date corrections |
| 8 | Extraction uses an external API (Gemini) | Resume text leaves the system once per resume | One resume per call, no other candidates' data, billing-enabled key required for no-training terms (ADR-009) | Self-hosted or zero-retention provider |
| 9 | Score bands and routing thresholds are heuristics | Not validated against hiring outcomes | Labelled as prototype thresholds everywhere they appear | Calibration against reviewer decisions |
| 10 | Jobs run in the request's `after()` callback | A function timeout could interrupt a job | Leases expire and the next status poll or batch run resumes the job | Cron/queue worker |
| 11 | No retention/deletion workflow is automated | Data persists until removed by an admin | Documented manual deletion path in DEPLOYMENT_GUIDE | Retention job with audit |
| 12 | Composite (multi-resume) Word documents are not segmented | A future composite source would be treated as one resume | Schema supports segments; ADR-003a | Segmentation adapter per LLD §5 |
| 13 | Demo reviewer credentials are published in the public README (owner decision for assignment evaluation) | Anyone with the README can read the anonymized candidate data | Account is HR_REVIEWER (read + review notes only); public sign-up grants no access without an app_users row | Rotate the password and remove the README entry after evaluation |
