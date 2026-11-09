# Description — Resume Intelligence Platform

> **Document role:** Product and assignment source of truth.  
> **Audience:** Product owner, engineering team, AI coding agent, QA reviewer, HR reviewer.  
> **Status:** Build specification.  
> **Priority:** This document records the assignment brief and the agreed product intent. Architecture and implementation detail are defined in `HLD.md`, `LLD.md`, `Security.md`, and the workflow documents.

---

## 1. Purpose of this document

This document consolidates the role context, assignment brief, job descriptions, input-data constraints, product objectives, functional requirements, non-functional requirements, assumptions and acceptance criteria for the Resume Intelligence Platform.

The implementation agent must read this document before making architectural or coding decisions. It must not silently replace the stated requirements with generic resume-screening assumptions. Where the supplied material contains an ambiguity or conflict, the agent must preserve the conflict, make it configurable where possible, and surface it in the application and methodology documentation.

## 2. Product vision

Build a practical, explainable and maintainable recruitment-assistance prototype that helps an HR team review a pool of anonymized resumes against two distinct job profiles:

1. **Life Cycle Assessment (LCA) Consultant** — an experienced sustainability/LCA position based in Chennai, onsite, with relocation requirements.
2. **UI/UX Design Intern** — an early-career design internship, remote, focused on user-centred design, Figma, prototypes and a sustainability-oriented digital product.

The product must ingest resumes, extract job-related information, compare each candidate independently against both job descriptions, calculate explainable role-specific scores, create two separately ranked lists, and let HR inspect the evidence and original source material.

This is a decision-support tool. It is not an autonomous hiring system and must not make final hiring decisions, silently reject candidates, infer sensitive attributes, or present an evidence score as a probability of job performance.

## 3. Broader role context supplied with the assignment

The role for which the project is being built describes a need to bring diverse algorithms together into one coherent, intentful hiring experience.

The responsibilities described are:

1. Implement user flows for different audiences, including hiring managers, recruiters and job seekers, while discouraging AI manipulation.
2. Manage diverse databases and data flows while preventing data loss, cross-assignment and record mix-ups.
3. Deliver responsive interfaces across supported surfaces.
4. Maintain proper documentation and QA checks for everything built.
5. Support data-scraping capabilities and maintain existing scraping systems when they fail.

The required skills and qualifications described are:

1. Familiarity with databases and data flows.
2. Attention to detail and ability to QA one's own work.
3. Structured thinking.

### 3.1 How this context affects the prototype

The first release should prioritize the recruiter/HR experience because that is the principal user in the assignment. The system should nevertheless use modular boundaries that can later support hiring-manager and job-seeker experiences.

The prototype must demonstrate:

- Reliable data ingestion and storage.
- Clear separation between source documents, parsed text, normalized profiles and assessments.
- Data integrity and duplicate handling.
- Resistance to resume-borne prompt injection and keyword manipulation.
- Responsive design.
- Evidence-backed explanations.
- Documented workflows and test coverage.
- A clearly bounded extension point for authorized public-web scraping. Web scraping is not a prerequisite for ranking the supplied resumes.

## 4. Assignment problem statement

A company has posted two job profiles and received **47 anonymized resumes**. Some resumes relate to the LCA role and others to the UI/UX internship. The supplied pool does not provide a reliable pre-classification for every document.

The task is to build and host a prototype on a Vercel instance, with a link that can be submitted through the assignment form. The prototype must also support a new resume upload and rank the new resume within the existing resume pool according to the same documented ranking logic.

The system must not depend on manual data entry for all 47 resumes. Automated extraction is expected, but AI-generated output must be cleaned, validated and accompanied by the methodology used.

The assignment explicitly warns that not every resume may be scraped/extracted correctly. The system must therefore expose extraction problems instead of silently treating incomplete data as valid.

## 5. Product objectives

The prototype must:

1. Ingest the supplied resumes and both job descriptions.
2. Extract relevant, job-related information from each resume.
3. Classify each resume as a stronger match for LCA, a stronger match for UI/UX, potentially relevant to both, neither evidenced, or uncertain/review-required.
4. Rank candidates separately for each role using a documented, repeatable method.
5. Explain the evidence behind every important score and classification.
6. Let HR inspect the candidate's structured information, source evidence, original resume and extraction warnings.
7. Support filtering and sorting, including by score and role-relevant experience.
8. Show extraction and processing errors in understandable language.
9. Accept a new resume, process it using the same versioned pipeline, and update the relevant rankings without corrupting or duplicating existing records.
10. Expose the methodology, known limitations and QA results.

## 6. Job description 1 — LCA Consultant

### 6.1 Organization and role context

The supplied description identifies a leading global sustainability consultancy based in Pune, serving manufacturing, construction, healthcare and corporate sectors. The deployment location for the consultant is Chennai, onsite. Relocation assistance may be available.

### 6.2 Role summary

The consultant supports sustainability goals by building Life Cycle Inventory (LCI) datasets, running LCA studies and comparing results against industry peers.

### 6.3 Key responsibilities

- Collect and compile Life Cycle Inventory (LCI) data.
- Validate and standardize LCI data for accuracy, completeness and consistency.
- Document missing data thoroughly.
- Build LCI models using collected inventory data in appropriate LCA software.
- Document modelling assumptions so datasets and models are traceable and audit-ready.
- Work with cross-functional teams to collect plant-level assembly details, resources, energy use and logistics data.
- Gather inbound and outbound transportation modes, distances and supplier logistics information.
- Collect public benchmarking data from databases, industry reports, research papers, academic studies, regulatory filings and previous LCA research.
- Meet project deadlines and deliver high-quality work.

### 6.4 Requirements stated in the detailed JD text

- Experience: **2–3 years** of experience running LCA projects independently.
- Software: Hands-on experience with either **GaBi or SimaPro**.
- Project history: At least **three completed LCA projects**.
- Standards: Follow **ISO 14040 and ISO 14044** guidelines.
- Location: Work onsite at the client location with the Sustainability team.
- Workplace expectations: Full-time office attendance, work-hour compliance and attendance tracking.
- Stakeholder management: Represent the client and maintain long-term customer relationships.

### 6.5 Candidate profile

- Education: Bachelor's or Master's degree; an environmental-domain degree is highly desired.
- Language: Fluent spoken and written English.
- Skills: Experience in LCA studies.
- Attributes: Flexible, self-motivated and able to manage multiple tasks.
- Travel: High willingness to travel extensively across India.
- Commitment: Minimum one-year commitment.

### 6.6 Preferred qualifications

- Prior LCA and Environmental Product Declaration (EPD) experience.
- Basic understanding of business finance and accounting.
- Initiative to learn and contribute ideas in a dynamic team.

### 6.7 Compensation and location

The supplied JD says compensation is industry-level and finalized based on qualifications and skills. The role is onsite at the client location in Chennai.

### 6.8 Experience requirement discrepancy

The broader problem-statement summary describes the LCA role as requiring **4–6 years** of experience, while the detailed JD text above states **2–3 years** of independently running LCA projects. These values conflict.

Implementation rule:

- Do not silently choose one and erase the other.
- Store the experience criterion in versioned role configuration.
- Use the detailed JD's 2–3-year requirement as the initial baseline for the prototype unless the project owner supplies a different confirmed instruction.
- Preserve a separate 4–6-year sensitivity scenario so the team can compare how rankings change.
- Show a methodology warning that the source materials contain this discrepancy.
- Display calculated relevant experience as a factual estimate separately from the score and separately from the mandatory verification status.
- Do not describe the candidate as ineligible solely because a resume does not establish willingness to relocate, travel, attend onsite or commit for one year. Those are confirmation items for HR/candidate follow-up.

## 7. Job description 2 — Growth For Impact UI/UX Internship

### 7.1 Product and organization context

The supplied description says Growth For Impact is building a LinkedIn-like platform for sustainability (`growthforimpact.co`).

### 7.2 Role overview

The organization is seeking a creative, detail-oriented UX/UI Design Intern. The intern would be the first member of the design team and help shape the experience and visual design of the organization's website and job board.

### 7.3 Key responsibilities

- Design engaging user interfaces for the website and job board.
- Ensure usable experiences across devices and platforms.
- Conduct user research to understand user psychology and behaviour.
- Use research to inform design decisions that meet user needs.
- Collaborate with cross-functional teams and align design solutions with business objectives.
- Create high-fidelity prototypes and design specifications using Figma.
- Participate in design critiques and feedback sessions.
- Follow industry trends and design best practices.
- Maintain a consistent design language and visual identity.

### 7.4 Expected qualifications

- Experience: 0–1 year of UI/UX design experience; recent graduates and career-transition candidates are encouraged.
- UI/UX design principles and human-centred design methodologies.
- Figma and prototyping tools.
- Understanding of user psychology and behaviour.
- Strong aesthetic sense and attention to detail.

### 7.5 Mandatory requirements described

- Strong understanding of user psychology.
- Creative outlook and willingness to experiment.
- Attention to detail.
- Strong aesthetic sense.

### 7.6 Work environment and success criteria

- The position is fully remote.
- The organization describes an international, distributed team and values communication, transparency and collaboration.
- Within the first 90 days, the intern is expected to contribute to a website revamp and help build a strong job-board solution informed by user feedback and testing.
- Stipend: ₹10,000–₹15,000 per month.

### 7.7 UI/UX evaluation principles

- Do not penalize a candidate for lacking multiple years of employment; the role is explicitly open to 0–1 year of experience.
- Distinguish a skill merely listed from a design capability demonstrated in a project or portfolio.
- Do not equate generic "design thinking" or general web development with demonstrated UI/UX design.
- Give credit for credible project evidence involving user research, interaction design, prototyping, usability, design systems, responsive interfaces or design specifications.
- A portfolio link is useful evidence if supplied, but its absence must not be fabricated or automatically treated as proof of poor design ability.

## 7A. Reference links supplied with the assignment

The project owner supplied the following resources as background references:

- Web Scraping FYI: https://webscraping.fyi/
- Reddit web-scraping community: https://www.reddit.com/r/webscraping/
- LCA job-description form: https://tally.so/r/9q5plp
- UI/UX internship job-description form: https://tally.so/r/0QovpQ
- Zoho WorkDrive folder containing the original 47 anonymized resumes: https://workdrive.zohoexternal.in/folder/nyche10b5dccdb33743dfa46604e3aa2a2e2b

The role descriptions included in this document are the supplied text and should be treated as the working JD content. The external links are reference material; their presence does not mean that the application must scrape those pages or the WorkDrive folder at runtime.

### Reference-resource usage

- Use Web Scraping FYI and the `r/webscraping` community to understand scraper design, parser failure modes, maintenance and source-specific extraction challenges.
- Do not use a web crawler to parse locally supplied DOCX/PDF resume content.
- Do not scrape WorkDrive unless the project owner has authorized the access method and it is required; the initial dataset is expected to arrive as the attached Word document.
- Public benchmarking scraping is an optional future extension and must remain separate from candidate ranking in V1.

## 8. Input dataset and delivery format

### 8.1 Dataset size and source

The assignment provides 47 anonymized resumes through a Zoho WorkDrive folder. The sample filenames shown include names similar to:

- `anonymized_AA_1793682784144.docx`
- `anonymized_AK_1793682784184.docx`
- `anonymized_PS_1793682784387.docx`

The above examples are naming patterns, not a complete manifest.

### 8.2 Important delivery constraint: one Word attachment, not a ZIP

The project owner has stated that the implementation agent will be given the folder/dataset information and the 47 resume contents **as an attached Word document**, not as a ZIP archive. The agent must therefore not assume that it will receive a filesystem directory containing 47 independently mounted DOCX files.

The attached Word document may contain one or more of the following:

1. A directory/file listing or manifest.
2. The full text of multiple resumes concatenated into one document.
3. Clearly separated resume sections, headings or page-break-delimited records.
4. Original filenames printed as headings or metadata.
5. Tables, headers, footers, text boxes, page breaks, section breaks or other Word layout constructs.
6. Embedded objects or references to source files, if the author chose to include them.

The agent must inspect the actual attachment and determine which of these structures is present. A filename written in a Word paragraph is not automatically a separately accessible file. A directory listing printed in a Word document is not a real directory. Do not claim that the 47 source files were individually opened unless they were in fact accessible as individual files.

### 8.3 Required composite-DOCX ingestion behaviour

If the attachment is a consolidated Word document containing multiple resumes:

- Preserve the original consolidated Word file as the source container.
- Generate a SHA-256 checksum for the source document.
- Extract text while preserving page/paragraph/table/section provenance to the extent supported by the parser.
- Identify candidate/resume boundaries using explicit filenames, repeated headings, stable delimiters, page/section boundaries and document structure.
- Use multiple signals to validate that a segment is a complete resume.
- Generate a unique internal resume ID for every validated segment.
- Retain the original visible filename when present; otherwise assign a stable import label such as `SOURCE-DOCX-RESUME-001` and mark that the original filename was not available.
- Store a source locator containing the container document ID plus page/paragraph/table/section coordinates or other parser-specific offsets.
- Preserve the raw segment text independently from normalized text.
- Produce a segmentation manifest showing all detected records, their boundaries, names/labels, page/paragraph ranges, extraction status and confidence/review flags.
- Do not merge adjacent resumes merely because a page break is missing.
- Do not split one resume merely because it contains multiple employers, projects or education sections.
- Do not infer a boundary solely from a change of job title or university.
- If a boundary is ambiguous, mark the affected range `SEGMENTATION_REVIEW_REQUIRED`; do not silently guess.
- If only a directory listing is present and the resume contents are absent, stop the batch extraction and report that the source document does not contain enough resume content.
- If the Word file contains embedded objects, detect and report them. Extract embedded source files only where a safe, supported extraction mechanism exists; otherwise mark them as inaccessible and request/record the limitation.

### 8.4 Individual resume uploads

The live prototype must additionally accept a new individual DOCX or text-based PDF. Each newly uploaded resume must enter the same logical extraction, validation, normalization, matching and ranking pipeline as the initial batch.

The system may use separate technical adapters for a consolidated DOCX batch and an individual resume upload, but both must produce the same canonical `ResumeInput` and `CandidateProfile` contracts. Do not create separate scoring logic for batch versus new uploads.

### 8.5 Original source preservation

For every candidate profile, HR must be able to navigate back to the original source. When a resume is a segment of the consolidated DOCX, the source action should open the original Word document or a generated, clearly labelled excerpt/preview with the exact source location. It must not pretend that an independently downloadable original DOCX exists when it does not.

## 9. Three sample-resume patterns provided during planning

Three individual DOCX samples were supplied for initial design and parser testing. Their relevant patterns are summarized here as test fixtures, not as final hiring decisions:

### Sample pattern A — Direct LCA consulting background

A sample resume described an Associate LCA Consultant role, end-to-end LCA workflow, LCI data collection, supplier engagement, secondary database research, system boundaries, allocation methods, ISO alignment and OpenLCA. It also described earlier environmental research roles and LCA work.

Test implications:

- Detect direct LCA study and LCI workflow evidence.
- Extract dates accurately.
- Distinguish OpenLCA from the specifically named GaBi/SimaPro requirement.
- Do not assume a precise count of completed projects unless countable project evidence exists.
- Preserve the distinction between a professional summary claim and individual employment/project evidence.

### Sample pattern B — Environmental engineering and emissions research

A sample resume described environmental health and safety, waste management, emissions inventory development, environmental data validation, air-quality research, environmental engineering education and LCA-related knowledge.

Test implications:

- Recognize relevant adjacent environmental and data-quality experience.
- Do not equate emissions inventory or environmental monitoring automatically with independently completed LCA projects.
- Do not mark GaBi/SimaPro as demonstrated unless the resume contains evidence.
- Keep professional experience and academic/research experience distinguishable.

### Sample pattern C — General analytics, banking and marketing background

A sample resume described banking risk analytics, portfolio analysis, Python/SQL/BI tools, marketing, HR analytics and design-thinking projects, without clear evidence in the supplied text of independent LCA delivery or Figma-based UI/UX portfolio work.

Test implications:

- Avoid false positives from generic analytics, communication or design-thinking terms.
- Recognize transferable skills only where the role rubric gives them weight.
- Classify as weak/uncertain/neither evidenced only after confirming extraction completeness.

## 10. Functional requirements

### FR-01 — Dataset intake

The system must accept the initial consolidated Word document as a source container and create an auditable import manifest. It must also support an individual DOCX/PDF upload for subsequent testing.

### FR-02 — Format and content validation

Validate actual file content, format, file size, readable text and supported structure. Never trust the filename extension alone.

### FR-03 — Duplicate handling

Use a content checksum to detect byte-identical duplicate source documents. For resume segments, use a stable normalized-content fingerprint as a secondary signal, not as the sole identity key. Do not merge two different candidates automatically based only on similar text.

### FR-04 — Text extraction

Extract text from DOCX and text-based PDF. Preserve logical sections and source locators where possible. Flag scanned/image-only PDFs and unreadable sections for OCR or manual review.

### FR-05 — Structured extraction

Extract professional summary, experience, education, skills, tools, projects, certifications and relevant language information. Extract only job-related information needed for the two assessments.

### FR-06 — Evidence provenance

Every criterion-relevant claim must have a source quotation or source locator. Unsupported claims must not be represented as verified facts.

### FR-07 — Data normalization

Normalize dates, skill aliases, tool names, degree labels and project categories without destroying original text.

### FR-08 — Role-specific assessment

Assess each candidate independently against the LCA JD and UI/UX JD. Produce two scores and two criterion-level breakdowns.

### FR-09 — Cross-role classification

Support stronger LCA match, stronger UI/UX match, potentially relevant to both, neither evidenced, and uncertain/review-required.

### FR-10 — Explainable ranking

Rank independently within each role and show the score, strongest supporting evidence, missing/unverified evidence and mandatory verification flags.

### FR-11 — HR inspection

Provide candidate detail views with extracted profile, role-specific assessments, source evidence, original source access and processing status.

### FR-12 — Filters and sorting

Support sorting by score and relevant experience, and filtering by extraction/review status, classification and evidence/verification flags.

### FR-13 — New resume upload

Accept an individual new resume, create a new candidate/resume record without overwriting existing candidates, process it, calculate both role assessments and update rankings.

### FR-14 — Error transparency

Show actionable error states, including unsupported format, unreadable document, ambiguous segmentation, parser error, model timeout, schema failure, evidence mismatch and incomplete extraction.

### FR-15 — Documentation and methodology

Expose or provide documentation explaining extraction, normalization, scoring, classification, limitations and QA.

### FR-16 — Reproducibility

Retain model, prompt, parser, profile, JD and scoring versions used for every assessment.

## 11. Non-functional requirements

- **Integrity:** No resume, extraction, profile or assessment may be silently associated with the wrong candidate.
- **Idempotency:** Retrying the same processing operation must not create duplicate candidates or duplicate assessments for the same input version.
- **Consistency:** The initial batch and new-upload pathways must use the same scoring methodology.
- **Explainability:** Every score must be reconstructable from stored criterion assessments and evidence.
- **Reliability:** A processing failure must be visible and recoverable.
- **Security:** Resume storage must be private and HR access authenticated.
- **Privacy:** Minimize personal-data collection, exposure, logging and retention.
- **Responsiveness:** Support desktop, tablet and mobile layouts.
- **Accessibility:** Use semantic controls, keyboard navigation, sufficient contrast and understandable status text.
- **Maintainability:** Use typed contracts, modular business logic, migrations and tests.
- **Extensibility:** Allow future roles, extraction models and scoring rubrics without redesigning the entire application.
- **Cost control:** Avoid unnecessary model calls, vector infrastructure, microservices or scraping infrastructure for a 47-resume prototype.

## 12. Ranking methodology principles

The agreed initial design uses a hybrid extraction-and-scoring approach:

1. A parser extracts source text.
2. An LLM maps the text into a predefined structured schema and supplies evidence excerpts.
3. Deterministic validators check schema, source quotations, dates and normalization.
4. A deterministic scoring engine assesses explicit, versioned criteria.
5. A classification function compares the two independently calculated role scores.
6. HR reviews evidence and makes hiring decisions.

The initial evidence values are:

| Evidence state | Initial score multiplier | Interpretation |
|---|---:|---|
| Direct evidence | 1.0 | Resume explicitly demonstrates the criterion in relevant context |
| Related/partial evidence | 0.5 | Resume contains credible adjacent evidence but does not fully establish the criterion |
| Not evidenced | 0.0 | Resume does not establish the criterion |
| Uncertain | 0.0 plus review flag | Information is ambiguous or extraction is unreliable |

A missing resume statement is not proof that a candidate lacks the skill. Scores indicate evidence demonstrated in the submitted resume, not a probability of success or an objective measure of human ability.

Initial role-score interpretation bands may be configured as:

- 75–100: Strong evidence of fit.
- 55–74: Potential fit.
- 35–54: Limited evidence.
- 0–34: Weak evidence in the supplied resume.

These are prototype heuristics. They must be visible as configurable thresholds and must not be presented as statistically validated hiring cutoffs.

### 12.1 Initial LCA criteria and weights

| Criterion | Weight |
|---|---:|
| Relevant LCA professional experience | 10 |
| Independent LCA study delivery and completed project evidence | 20 |
| GaBi/SimaPro software proficiency | 15 |
| LCI data collection, validation and quality control | 15 |
| ISO 14040/14044, system boundaries, allocation and modelling | 15 |
| Operational data, manufacturing, energy and logistics | 10 |
| Environmental education/domain background | 5 |
| Benchmarking, research datasets and EPD | 5 |
| Stakeholder management and communication | 5 |
| **Total** | **100** |

OpenLCA is relevant LCA software evidence, but it does not automatically fulfil the specifically stated GaBi-or-SimaPro requirement. A listed tool without contextual use is weaker evidence than a tool demonstrated in a project.

### 12.2 Initial UI/UX criteria and weights

| Criterion | Weight |
|---|---:|
| Figma and prototyping proficiency | 20 |
| UX/UI principles and human-centred design | 15 |
| User research and understanding of psychology | 15 |
| Web and product interface design experience | 15 |
| High-fidelity prototypes and design specifications | 10 |
| Visual design and aesthetic quality | 10 |
| Responsive, multi-device design | 5 |
| Design systems and visual consistency | 5 |
| Collaboration and design critique | 5 |
| **Total** | **100** |

The prototype may record portfolio URLs and review status, but it must not automatically claim to have evaluated visual portfolio quality unless a reviewer actually inspects the portfolio or a separate, explicitly disclosed visual evaluation workflow is implemented.

### 12.3 Classification rules

Initial configurable rules:

- If extraction is unreliable or segmentation is unresolved, classify as `UNCERTAIN` regardless of numeric scores.
- If both role scores are at least 55, classify as `BOTH`.
- If LCA is at least 55 and exceeds UI/UX by at least 10 points, classify as `LCA_STRONGER`.
- If UI/UX is at least 55 and exceeds LCA by at least 10 points, classify as `UIUX_STRONGER`.
- If both role scores are below 35 and extraction is reliable, classify as `NEITHER_EVIDENCED`.
- Otherwise classify as `UNCERTAIN`.

These rules are prioritization labels for HR review, not rejection rules. Keep thresholds configurable and versioned.

### 12.4 Mandatory and logistical requirements

Keep mandatory verification separate from the weighted fit score. The application may flag whether the resume explicitly establishes GaBi/SimaPro experience or three completed LCA projects. It must separately mark relocation, onsite attendance, travel, language, stipend acceptance or commitment questions as `CANDIDATE_CONFIRMATION_REQUIRED` when they cannot be established from the resume.

## 13. User personas and principal journeys

### Recruiter / HR

Needs to upload a resume, view two role-specific ranked lists, filter candidates, inspect score explanations and source documents, and record a shortlist/review decision.

### Hiring manager

Needs to inspect the evidence for a candidate against a role, understand gaps and verify mandatory criteria. A specialized manager portal is not required for V1.

### Job seeker

The broader role context mentions job seekers, but a public applicant portal is not required for this assignment. V1 only needs the HR-side upload flow for testing new resumes.

### Principal HR journey

1. HR signs in.
2. HR opens the dashboard and sees dataset processing status.
3. HR opens the LCA or UI/UX role.
4. HR sorts or filters the ranked list.
5. HR opens a candidate.
6. HR reads profile summary, score breakdown, evidence and warnings.
7. HR opens the original source document or source excerpt.
8. HR records a review outcome and notes.
9. HR uploads a new resume.
10. The system processes and assesses it against both roles, then updates both rankings.

## 14. Out-of-scope for V1

- Autonomous hiring decisions or candidate rejection.
- Public candidate registration or job applications.
- Email/WhatsApp outreach to candidates.
- Background checks or identity verification.
- Scraping personal data from social networks.
- Unapproved third-party enrichment of candidate profiles.
- A vector database solely for 47 resumes.
- Multiple autonomous AI agents.
- Microservices without a demonstrated scaling requirement.
- Automated AI-written-resume detection used as a ranking criterion.
- A public web-scraping crawler as a prerequisite for resume ranking.
- Claims that all data has been extracted correctly without field-level verification.

## 15. Acceptance criteria

The prototype is ready for assignment submission only when:

1. The input attachment has been inspected and its actual structure documented.
2. The import manifest accounts for all 47 expected resumes or clearly lists any missing, merged, ambiguous or inaccessible records.
3. Every successfully ingested resume has a stable internal identity and a source reference.
4. Every extraction result is schema-valid and has a recorded parser/model/prompt version.
5. Important claims used in scoring have verifiable source evidence.
6. The two job roles have separate, versioned scoring criteria.
7. Every assessable candidate has two role-specific assessments or an explicit unassessable/review-required state.
8. Ranking is deterministic for identical versioned inputs.
9. The application shows both role-specific rankings and useful filters.
10. Candidate detail pages explain score contributions and evidence gaps.
11. A new individual DOCX/PDF can be uploaded and ranked without corrupting prior records.
12. Duplicate uploads are handled safely.
13. Failed extraction is visible and recoverable.
14. The application is responsive and usable by an HR reviewer.
15. Authentication and private document access are tested.
16. HLD, LLD, methodology, data-cleaning and QA documentation are complete.
17. The deployed URL has been tested from a clean browser session.
18. No dummy candidate results are presented as real results.

## 16. Source-of-truth and change control

- This document records assignment requirements and product intent.
- `HLD.md` defines approved system-level architecture.
- `LLD.md` defines implementation contracts and algorithms.
- `Security.md` defines security and privacy requirements.
- `Workflow library.md` defines reusable operational workflows.
- `Workflow standard.md` defines mandatory workflow conventions.
- `Construction.md` is the master instruction for the AI implementation agent.
- `Project overview.md` provides the concise product and execution overview.

If documents conflict, do not silently choose whichever is easiest to implement. Identify the conflict, check the precedence policy in `Construction.md`, and record a decision in the relevant document. Assignment facts in this document must not be altered to match a preferred technical implementation.
