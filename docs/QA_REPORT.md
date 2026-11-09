# QA Report

Status as of 2026-11-09. Items are marked **Verified** only when a test, a build or a live check ran.

## Automated tests: 76 / 76 passing (`npm test`)

| Suite | Tests | Covers |
|---|---:|---|
| `tests/unit/experience.test.ts` | 21 | date precision, inclusive end month, fixed reference month, overlap merge, academic ≠ professional, excluded partial dates |
| `tests/unit/scoring.test.ts` | 30 | rubric totals and rejection, multipliers, OpenLCA ≠ GaBi/SimaPro, skills-list capping, unverifiable claims → Uncertain, visual-design cap, emissions ≠ LCA project, 2-year vs 4-year scenarios, determinism, logistics as confirmations, all routing rules, tie-breaks, stated project counts |
| `tests/unit/extraction.test.ts` | 12 | quote verification and locators, fabricated quote rejected, quote text never rewritten, schema rejects invented fields, prompt-injection boundary, weights withheld from the model, tool aliases, normalization |
| `tests/unit/parsers.test.ts` | 8 | content sniffing, MIME mismatch, paragraph and table-cell locators, embedded-object reporting, empty documents |
| `tests/unit/seed.test.ts` | 1 | database rubric seed equals the TypeScript config |
| `tests/integration/analyze.test.ts` | 4 | full analysis path on a synthetic resume: injection ignored and flagged, fabricated EPD quote excluded, `javascript:` link dropped, model-supplied score ignored, identical input → identical persistence bundle |

All fixtures are synthetic; no candidate data is in the repository.

## Build and static checks

| Check | Result |
|---|---|
| `tsc --noEmit` (strict, `noUncheckedIndexedAccess`) | Verified: clean |
| `next build` (Next 16) | Verified: all 14 routes compile |
| Secret scan of tracked files before first push | Verified: no keys, no resume files |
| Supabase security advisor after migrations | Verified: only the 3 intentional HR-callable definer functions flagged |
| Rubric seed applied | Verified in DB: 9 criteria per role, weights total 100 |
| Dataset inspection on the real 47 files | Verified: 47 found, 46 readable, 1 `EMPTY_DOCUMENT`, 0 duplicates |

## Live verification (2026-11-09)

| Check | Result |
|---|---|
| Batch import of the real dataset | Verified: 47/47 accounted (44 scored, 2 scored + flagged, 1 empty file failed); see DATA_QUALITY_REPORT.md |
| Evidence verification on real output | Verified: 999/999 quotes found in source; scoring quotes 22 to 300+ chars |
| Top-of-ranking spot check | Verified: LCA top 4 are LCA professionals (27 to 57 verified months); UI/UX top 4 are UI/UX designers |
| Production deploy | Verified: https://resume-intelligence-pearl.vercel.app, security headers present |
| Unauthenticated access | Verified: pages redirect to sign-in, API returns 401 |
| Anonymous key against tables, views, RPC | Verified: permission denied (42501) on all; storage listing empty; no public object URL |
| Signed-in HR session in Chrome | Verified: overview, LCA result sheet, candidate evidence view render real data |
| Original-document route | Verified: real candidate gets a signed redirect; unknown or malformed ids return 404 |

### Findings
- The model once used the suspicious-content field to note garbled resume text (CAND-0026), so that profile carries a manipulation flag that is really a text-quality note. Wording to neutralise in the next scoring version.
- Gemini free-tier quota for 2.5 Flash ran out after 20 resumes; Gemini 3 Flash timed out or returned 503. All resumes were re-extracted on gemini-3.1-flash-lite for one consistent model.

### Still unverified
- Phone-width layout (the browser window could not be resized); layouts use responsive breakpoints but were not looked at.
- Live upload of a new resume through the deployed site, duplicate upload, and a signed-in non-HR account.
