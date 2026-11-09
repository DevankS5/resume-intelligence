# Methodology

How a resume becomes two explainable scores. The in-app Methodology page renders the same rules from the live config.

## 1. Pipeline

| Stage | What happens | Where |
|---|---|---|
| Register | SHA-256 of the bytes; identical bytes resolve to the existing candidate. File stored privately under a UUID path. | `lib/pipeline/register.ts` |
| Validate | Format sniffed from file signature (not extension); size ≤ 5 MB; encrypted or image-only PDFs flagged. | `packages/parsers/detect.ts` |
| Parse | DOCX via Mammoth HTML → ordered blocks with paragraph / table-cell locators and detected section. PDF via PDF.js with page numbers. Raw and normalized text stored separately. | `packages/parsers/` |
| Extract | Gemini, one resume per call, JSON-schema-constrained, temperature 0. The resume is passed only between data markers; the model has no tools and never sees weights. | `packages/extraction/` |
| Validate output | Zod schema; unknown criterion keys or invented score fields are rejected. | `packages/schemas/extraction.ts` |
| Verify evidence | Each quote is canonicalised (case, punctuation, whitespace) and searched for in the source. Found → locator attached. Not found → kept, marked unverified, excluded from scoring. | `packages/extraction/verify.ts` |
| Normalize | Tool aliases (GaBi / SimaPro / OpenLCA stay distinct), month-precision dates, safe portfolio URLs only. | `packages/normalization/` |
| Experience | Half-open month intervals, overlaps merged, current roles end at the fixed reference month (2026-11). Year-only or invalid dates are excluded and reported. | `packages/scoring/experience.ts` |
| Score | Deterministic guards decide each criterion's state; points = weight × multiplier. | `packages/scoring/criteria.ts`, `assess.ts` |
| Classify & rank | Configurable routing rules; per-role ranking snapshot with documented tie-breaks. | `packages/scoring/assess.ts` |

## 2. Evidence states

| State | Multiplier | Meaning |
|---|---:|---|
| Direct | 1.0 | Demonstrated in a role or project, quote verified |
| Related | 0.5 | Adjacent or partial evidence; or skills-list only |
| Not evidenced | 0 | Not established by the resume (not proof of absence) |
| Uncertain | 0 + review flag | Proposed evidence could not be verified, or dates unusable |

## 3. Deterministic guards

- Evidence proposed by the model counts only if at least one of its quotes is found in the source.
- If every verified quote for a criterion sits in a skills / tools section, the state is capped at Related (keyword-stuffing defence).
- Direct requires criterion vocabulary in the quote for project delivery (LCA / life cycle), LCI data (inventory), ISO modelling, benchmarking/EPD, Figma/prototyping and high fidelity.
- GaBi/SimaPro is Direct only when GaBi or SimaPro is demonstrated in context; OpenLCA or a listed tool is Related.
- LCA experience is computed, not proposed: verified professional LCA months ≥ active scenario minimum → Direct; any LCA professional, internship or academic months → Related; unusable dates → Uncertain.
- Visual design caps at Related: V1 does not inspect portfolios.
- Completed LCA projects = max(distinct completed LCA project entries, an explicit count directly preceding LCA vocabulary in a verified quote).

## 4. Rubrics

LCA Consultant (`lca-rubric-1.0.0`): experience 10, project delivery 20, GaBi/SimaPro 15, LCI data 15, ISO/modelling 15, operational data 10, education 5, benchmarking/EPD 5, stakeholder 5.
UI/UX Design Intern (`uiux-rubric-1.0.0`): Figma/prototyping 20, UX/UI principles 15, user research 15, interface experience 15, high fidelity 10, visual design 10, responsive 5, design systems 5, collaboration 5.
No UI/UX criterion measures years of employment, so 0–1-year candidates are not penalised.

## 5. LCA experience conflict

Detailed JD: 2–3 years (active baseline, `detailed_jd_baseline`). Problem summary: 4–6 years (`problem_summary_sensitivity`). The scenario is part of the scoring version (`scoring-1.0.0+detailed_jd_baseline`), so a sensitivity run produces separate, non-overwriting assessments.

## 6. Mandatory and logistical checks

Kept outside the score. LCA: GaBi/SimaPro hands-on and ≥3 completed projects are Established / Not established from evidence; onsite, relocation, travel, one-year commitment and English are "Stated in resume" only when explicitly stated, otherwise "Ask the candidate". UI/UX: user psychology from the user-research criterion; aesthetic sense always needs portfolio review by a person.

## 7. Extraction quality

Separate from the score and never used to rank. Checks: parser readability, content not extracted, section coverage, resume boundary, schema validity, evidence verification rate (≥90 % pass, ≥70 % warning), date validity, manipulation check. Any fail → Low (review required); two or more warnings → Medium; else High. Low or unassessable quality forces the routing label to Uncertain.

## 8. Classification

Unreliable extraction → Uncertain. Both ≥ 55 → Both. One ≥ 55 and ahead by ≥ 10 → stronger for that role. Both < 35 → Neither evidenced. Otherwise Uncertain. Labels route attention; none rejects.

## 9. Ranking

Order: score ↓, primary-criterion points ↓ (LCA project delivery; UI/UX Figma/prototyping), review flags ↑, candidate reference ↑. Each rebuild writes an immutable snapshot with the versions used; filters in the UI never renumber ranks.

## 10. Cleaning the AI output

The assignment requires cleaning model output rather than trusting it. In this system cleaning is mechanical and auditable: schema rejection, quote verification against the source, tool-alias canonicalisation, date precision checks, interval merging, URL allowlisting, and the guards in §3. The raw model output is preserved unmodified next to the cleaned profile so every correction can be inspected.
