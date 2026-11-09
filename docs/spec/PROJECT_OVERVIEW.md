# Project Overview — Resume Intelligence Platform

> **Document role:** Concise product charter and shared project context.  
> **Audience:** Project owner, AI implementation agent, engineers, QA and HR stakeholders.  
> **Status:** Approved product direction for V1.

---

## 1. Project at a glance

| Item | Definition |
|---|---|
| Project name | Resume Intelligence Platform |
| Product type | HR-facing recruitment decision-support prototype |
| Primary users | Recruiters and HR reviewers |
| Secondary users | Hiring managers reviewing evidence |
| Primary dataset | 47 anonymized resumes supplied through one attached Word document |
| Job profiles | LCA Consultant and UI/UX Design Intern |
| Frontend deployment target | Vercel, subject to plan and data-use eligibility verification |
| Data layer | Supabase/PostgreSQL and private object storage, or a justified equivalent |
| Primary AI role | Structured extraction and evidence interpretation |
| Ranking authority | Deterministic, versioned application logic |
| Final decision authority | Human HR/recruiter review |

## 2. Why this product exists

The HR team has a pool of 47 resumes for two materially different positions. The resumes may be inconsistent in formatting and may describe relevant experience using different terminology. Manually reading and comparing every document is time-consuming, while relying on an unconstrained LLM to produce a final ranked list is difficult to audit and can result in unsupported claims.

The platform provides a repeatable process to transform documents into structured candidate evidence, compare that evidence against two job-specific rubrics, and help HR focus review effort where it is most useful.

The product is intentionally designed around **traceable evidence, data integrity and human review**, rather than the appearance of AI sophistication.

## 3. Product goals

### 3.1 Primary goals

1. Account for all expected input records.
2. Extract job-related resume information with source provenance.
3. Clean and normalize extracted fields without destroying original information.
4. Assess every candidate separately against the LCA and UI/UX roles.
5. Produce understandable and reproducible scores and rankings.
6. Show why a candidate received each score and what remains unverified.
7. Let HR inspect original source material.
8. Process a new individual resume using the same rules and safely update rankings.
9. Make operational failures visible, recoverable and auditable.
10. Provide complete implementation and methodology documentation.

### 3.2 Secondary goals

- Make it straightforward to add future job descriptions.
- Allow criteria/weights to be changed through controlled, versioned configuration.
- Provide reviewer notes and shortlist states.
- Keep a future extension point for authorized public-data scraping and benchmarking.
- Support future separation of ingestion workers from the web application if scale requires it.

## 4. Explicit non-goals for V1

The following are not required for the first release:

- An applicant-facing job portal.
- Candidate communications or interview scheduling.
- Autonomous hiring or rejection.
- Background checks or identity verification.
- Social-media scraping or personal-data enrichment.
- A vector database for the 47-resume dataset.
- Multiple autonomous agents.
- Microservices as an architectural objective.
- A general-purpose web crawler.
- Automated AI-generated-resume detection used to score candidates.
- A claim that AI can objectively measure a person's potential, creativity or job performance from a resume alone.

## 5. Core product principles

### 5.1 Evidence over assertion

A displayed candidate claim should be traceable to a resume excerpt or source locator. A skill mentioned in a skills list is not equivalent to demonstrated project experience. Related experience is not the same as an explicit mandatory qualification.

### 5.2 Separate evidence score from capability

The score measures evidence found in the submitted resume under the configured rubric. It is not a probability of job success. Absence of evidence is not proof of absence of capability.

### 5.3 Independent role assessments

Each candidate receives an LCA assessment and a UI/UX assessment. The candidate can be relevant to both, stronger for one, neither evidenced or uncertain. Do not force exactly one role assignment.

### 5.4 Human accountability

The system organizes evidence and prioritizes review. HR remains responsible for verification, interviews, logistical confirmations and final decisions.

### 5.5 Data integrity by design

Use stable IDs, immutable source references, checksums, foreign keys, versioned processing and idempotent workflows. Sorting or re-ranking must never change candidate identity.

### 5.6 Explainability and reproducibility

A reviewer or engineer should be able to reconstruct a score from the criteria version, evidence state, weights and formula used at the time.

### 5.7 Maintainability before cleverness

Prefer a modular monolith, clear contracts and a small number of reliable technologies. Add infrastructure only when a demonstrated requirement justifies it.

## 6. Users and jobs to be done

### 6.1 Recruiter / HR reviewer

**Needs:**

- Know how many resumes were received and processed.
- View separate role-specific rankings.
- Filter by score, experience and review status.
- Understand a candidate's strengths, evidence gaps and mandatory verification flags.
- Inspect the original resume.
- Add reviewer notes and a shortlist/review state.
- Upload a new resume and see the resulting position in both rankings.

**Success:** HR can complete a first-pass review without understanding the technical pipeline and without treating the score as a final hiring decision.

### 6.2 Hiring manager

**Needs:**

- See role-specific evidence.
- Verify mandatory capabilities.
- Understand why related experience received partial credit.
- Identify questions to ask during screening.

**V1 delivery:** Candidate detail page and shareable/exportable review summary may satisfy the need; a separate manager portal is not required.

### 6.3 Job seeker

The broader role context includes job seekers, but this assignment does not require a public applicant workflow. Individual resumes are uploaded by an authorized HR user for testing.

## 7. Product information architecture

```text
Resume Intelligence
│
├── Overview
│   ├── Dataset status
│   ├── Processing health
│   ├── LCA summary
│   └── UI/UX summary
│
├── LCA Consultant
│   ├── Ranked candidates
│   ├── Candidate detail
│   └── Shortlisted / review states
│
├── UI/UX Design Intern
│   ├── Ranked candidates
│   ├── Candidate detail
│   └── Shortlisted / review states
│
├── All candidates
│   ├── Classification
│   ├── Extraction quality
│   └── Processing errors
│
├── Upload resume
│
└── Methodology & data quality
    ├── Extraction method
    ├── Scoring rubric
    ├── Version history
    ├── QA report
    └── Known limitations
```

## 8. Main user journeys

### Journey A — Initial dataset import

1. Authorized operator supplies the consolidated Word attachment.
2. System records its checksum and metadata.
3. Parser inspects its actual structure.
4. Segmentation process identifies resume records and boundaries.
5. Manifest lists all detected, ambiguous, missing or duplicate records.
6. Each valid segment receives a stable source/resume identity.
7. Extraction and validation run independently for each segment.
8. Clean profile versions are persisted.
9. Both role assessments are generated.
10. Rankings are built and the dataset-level report is published.

### Journey B — HR reviews a role ranking

1. HR opens the role page.
2. HR sees a ranked table and filters/sorts it.
3. HR opens a candidate detail page.
4. HR reads the profile, relevant experience, score breakdown and evidence.
5. HR inspects the original document/source segment.
6. HR records a review outcome and notes.

### Journey C — New resume upload

1. HR selects a DOCX or text-based PDF.
2. Application validates the file and calculates its checksum.
3. Existing duplicate is detected or a new resume record is created.
4. Source is uploaded to private storage.
5. Processing job is created idempotently.
6. Parser extracts text and provenance.
7. LLM extraction produces structured data.
8. Validators check schema and evidence.
9. Both role scores are calculated using the currently active versions.
10. Rankings are refreshed in a deterministic way.
11. HR sees completion or a clear review/error state.

### Journey D — Criteria change

1. Authorized administrator creates a new rubric version.
2. Previous assessments remain immutable.
3. New assessments are generated using the new version.
4. The UI makes the active version clear.
5. Ranking differences can be reviewed.

## 9. Role-specific product logic

### 9.1 LCA Consultant

The scoring model must emphasize actual LCA study delivery, completed project evidence, LCA software, LCI data collection and validation, ISO 14040/14044 application, modelling assumptions and operational/benchmarking data.

The detailed JD specifies 2–3 years of independent LCA experience, while the assignment summary says 4–6 years. Preserve this discrepancy as a configurable scenario and disclose it. The detailed JD's 2–3-year value is the initial baseline unless the project owner gives a later explicit decision.

GaBi/SimaPro evidence is distinct from OpenLCA. OpenLCA is relevant but does not automatically satisfy the exact GaBi/SimaPro criterion.

Relocation, onsite availability, travel willingness and one-year commitment are candidate-confirmation items unless explicitly and credibly documented.

### 9.2 UI/UX Design Internship

The scoring model must emphasize Figma/prototyping, human-centred design, user research and psychology, product/web interfaces, high-fidelity prototypes, aesthetic/design evidence, responsiveness, design systems and collaboration.

The role welcomes 0–1 year of experience. Do not use a seniority-oriented experience penalty. A skill list alone is weaker evidence than a documented project or portfolio.

## 10. Product quality indicators

The overview should distinguish operational and evaluation metrics.

### Operational metrics

- Expected records: 47.
- Records detected.
- Records segmented successfully.
- Records awaiting segmentation review.
- Records parsed successfully.
- Records requiring OCR/manual review.
- Records with extraction errors.
- Records scored for both roles.
- Duplicate uploads detected.
- Last successful batch import.

### Data quality metrics

- Schema-valid extraction rate.
- Evidence quote verification rate.
- Percentage of criterion claims with source locators.
- Date parsing exceptions.
- Experience-overlap warnings.
- Missing mandatory evidence flags.
- Manual correction count.
- Spot-check discrepancy rate.

Do not display a single opaque "AI accuracy" number. Define the denominator and calculation for every metric. A parser-success status is not proof of factual correctness.

## 11. UX guidance

- Use neutral, professional visual design.
- Put the two job roles in separate navigation destinations.
- Make status and uncertainty visible without alarmist language.
- Use plain language suitable for non-technical HR users.
- Do not use colour as the only indicator; combine labels and icons with text.
- Avoid dense technical payloads on the main candidate view; expose technical detail in methodology or expandable sections.
- Show score and extraction quality as separate measures.
- Make it easy to compare evidence and source material.
- Provide useful empty, loading, partial and error states.
- Support desktop/tablet/mobile and keyboard navigation.

## 12. Success measures and release criteria

V1 success means:

- All 47 expected records are accounted for with transparent statuses.
- No candidate/resume cross-assignment is found in QA.
- The system can produce two separate rankings from the cleaned dataset.
- Criterion scores can be reconstructed from stored records.
- The original source can be inspected for each assessable candidate.
- A new resume can be added and assessed without manual database edits.
- Unreadable/ambiguous documents do not silently become valid candidate profiles.
- HR users can complete core review tasks without engineering help.
- Documentation explains the methodology and limitations.
- The deployed application and its access controls are verified.

## 13. Future evolution

Potential future work, only after validating V1 value:

- Add more job descriptions using reusable rubric configuration.
- Add a formal reviewer calibration workflow.
- Add OCR for scanned documents with confidence/provenance.
- Add portfolio review support for UI/UX candidates.
- Add structured candidate confirmation questionnaires for onsite/relocation/travel requirements.
- Add public-source LCA benchmarking through authorized source connectors.
- Introduce a background worker/queue if job volume or processing time justifies it.
- Add organization tenancy and reviewer roles if the product expands to multiple employers.
- Add analytics on review throughput and where extraction errors occur.

Do not add these to V1 simply because they appear technically interesting.

## 14. How to use this overview

Use this file to maintain common understanding of the product, users, scope and intended experience. Use `Description.md` for the complete assignment facts, `HLD.md` and `LLD.md` for technical design, and the workflow/security documents for implementation controls.
