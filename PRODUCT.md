# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primary: HR reviewers and recruiters doing a first-pass review of a resume pool against two job profiles (LCA Consultant, UI/UX Design Intern). They are non-technical, work at a desk on a laptop or larger screen, and need to decide whom to look at closely, not whom to hire. Secondary: hiring managers checking the evidence behind a candidate for their role. No applicant-facing surface exists.

## Product Purpose

Turn 47 anonymized resumes (plus any new upload) into two separate, explainable rankings. Every score is reconstructable from versioned criteria, evidence states and verbatim resume quotes, and every record, including the ones that failed to parse, is accounted for. Success: an HR reviewer finishes a first-pass review without engineering help and never mistakes a score for a hiring decision.

## Positioning

Evidence-first screening: the model only extracts and quotes; deterministic, versioned code scores. Every claim shown links to an exact passage in the source, unverifiable claims are marked uncertain instead of hidden, and missing logistics (relocation, travel, onsite) are confirmation items, never rejections.

## Operating Context

HR signs in, checks dataset health on an overview, opens one role's ranking, filters and sorts, opens a candidate, compares the criterion breakdown with quoted evidence and the original document, records a review status and note, and uploads new resumes that are processed by the same pipeline. Candidate data is restricted personal data.

## Capabilities and Constraints

- Two independent role assessments per candidate; classification labels (LCA stronger, UI/UX stronger, both, neither evidenced, uncertain) route attention only.
- Score (evidence fit) and extraction quality are separate measures and must never be merged.
- Evidence states: Direct (1.0), Related (0.5), Not evidenced (0), Uncertain (0 + review flag).
- LCA experience requirement conflict (2–3 vs 4–6 years) is disclosed, with the detailed JD as baseline.
- Visual/aesthetic quality of UI/UX candidates is never judged from text; portfolio review is a human task.
- Score bands (75/55/35) are prototype heuristics, not validated cutoffs.
- Stack: Next.js App Router, Tailwind v4, Supabase (Auth, Postgres with RLS, private storage), Vercel.

## Brand Commitments

Original product name "Resume Intelligence". No logo or brand assets. Plain, neutral, professional language suitable for non-technical HR; status never conveyed by colour alone. The owner prefers soft rounded corners over sharp boxes, but not full pills.

## Evidence on Hand

The real 47-file dataset (46 readable, 1 empty) processed by the pipeline. No testimonials, customers or accuracy benchmarks exist; never invent them, and never show an "AI accuracy" number.

## Product Principles

1. Evidence over assertion: show the quote and where it came from.
2. Uncertainty is visible, never alarming.
3. Human accountability: the tool prioritises review; people decide.
4. Two roles, two separate lists; never force one label.
5. Every record accounted for, including failures.

## Accessibility & Inclusion

WCAG 2.2 AA: keyboard operable, visible focus, sufficient contrast, labels plus icons for every status, responsive from phone to desktop.
