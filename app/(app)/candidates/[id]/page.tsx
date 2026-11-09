import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Download, ShieldAlert } from "lucide-react";
import { z } from "zod";
import type { EvidenceState, ExtractionQuality, JobKey, MandatoryCheck, ParsedBlock, SourceLocator, VerifiedEvidence } from "@domain/types";
import type { NormalizedProfile } from "@domain/profile";
import { RUBRICS } from "@domain/rubrics";
import { hrMessage } from "@domain/errors";
import { getCandidate } from "@/lib/data/queries";
import { BAND_LABEL, CLASS_LABEL, QUALITY_LABEL, ReviewMark, ScoreBar, StateMark, STATUS_LABEL, fmt, months } from "@/components/shared/marks";
import { ReviewForm } from "@/components/candidates/review-form";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Candidate" };

const anchor = (l: Pick<SourceLocator, "pageNumber" | "paragraphIndex"> | null | undefined) =>
  l && l.paragraphIndex != null ? `src-${l.pageNumber ?? 0}-${l.paragraphIndex}` : null;

type CritRow = {
  evidence_state: EvidenceState; criterion_weight: number; points_awarded: number; evidence: VerifiedEvidence[];
  explanation: string; review_required: boolean; job_criteria: { criterion_key: string; label: string; display_order: number };
};

export default async function CandidatePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ role?: string }> }) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const data = await getCandidate(id);
  if (!data) notFound();
  const { role } = await searchParams;
  const jobKey: JobKey = role === "UIUX_INTERN" ? "UIUX_INTERN" : "LCA_CONSULTANT";
  const { cand, resume, profile, parsed, job, events, assessments } = data;
  const p = profile?.normalized_profile as NormalizedProfile | undefined;
  const quality = profile?.extraction_quality as ExtractionQuality | undefined;
  const byJob = (k: JobKey) => assessments.find((a) => (a.jobs as unknown as { job_key: string }).job_key === k);
  const current = byJob(jobKey);
  const criteria = ((current?.criterion_assessments ?? []) as unknown as CritRow[]).sort((a, b) => a.job_criteria.display_order - b.job_criteria.display_order);
  const cited = new Set(criteria.flatMap((c) => c.evidence.map((e) => anchor(e.locator)).filter(Boolean)));
  const blocks = (parsed?.blocks ?? []) as ParsedBlock[];
  const extraction = profile?.document_extractions as unknown as { model_provider: string; model_name: string; prompt_version: string; schema_version: string } | undefined;

  return (
    <div className="grid gap-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[13px] text-ink-3"><Link href="/candidates" className="underline">All records</Link> / {cand.candidate_ref}</p>
          <h1 className="mt-1 text-[28px] font-bold leading-tight tracking-[-0.015em]">{cand.candidate_ref}</h1>
          <p className="mt-1 text-[13px] text-ink-2">
            Source: <span className="font-medium">{resume.display_reference}</span>
            {profile && <> · {CLASS_LABEL[profile.classification]}</>}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <ReviewMark status={cand.review_status} />
          <a href={`/api/candidates/${cand.id}/source`} className="inline-flex h-9 items-center gap-2 rounded-control border border-rule-strong bg-sheet px-3 text-[14px] font-semibold hover:bg-paper">
            <Download size={15} aria-hidden="true" /> Original document
          </a>
        </div>
      </header>

      {!profile ? (
        <section className="rounded-card border border-rule bg-sheet p-6">
          <h2 className="flex items-center gap-2 text-[18px] font-bold"><ShieldAlert size={18} className="text-uncertain" aria-hidden="true" /> Not assessed</h2>
          <p className="mt-2 max-w-2xl text-ink-2">
            Status: <b>{STATUS_LABEL[resume.processing_status] ?? resume.processing_status}</b>.{" "}
            {resume.last_error_code ? hrMessage(resume.last_error_code) : "Processing has not finished yet."}{" "}
            This record is kept and counted; it was not turned into a profile or a score. Open the original document to review it by hand.
          </p>
          {job && <p className="mt-2 text-[13px] text-ink-3">Attempts: {job.attempt_count} of {job.max_attempts}{job.last_error_code ? ` · error code ${job.last_error_code}` : ""}</p>}
        </section>
      ) : (
        <>
          <section aria-label="Role scores" className="grid gap-3 sm:grid-cols-2">
            {(["LCA_CONSULTANT", "UIUX_INTERN"] as JobKey[]).map((k) => {
              const a = byJob(k);
              const active = k === jobKey;
              return (
                <Link key={k} href={`?role=${k}`} scroll={false} aria-current={active ? "true" : undefined}
                  className={`flex items-center justify-between gap-4 rounded-card border p-4 transition-colors ${active ? "border-ink bg-sheet shadow-[0_1px_0_var(--color-ink)]" : "border-rule bg-sheet/60 hover:border-rule-strong"}`}>
                  <span>
                    <span className="block text-[15px] font-bold">{RUBRICS[k].shortTitle}</span>
                    <span className="text-[13px] text-ink-3">{a ? BAND_LABEL[a.score_band] : "Not scored"}{active ? " · showing breakdown" : " · show breakdown"}</span>
                  </span>
                  <ScoreBar score={a ? Number(a.score) : null} label={`${RUBRICS[k].shortTitle} score`} />
                </Link>
              );
            })}
          </section>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
            <section aria-labelledby="crit-h" className="min-w-0">
              <h2 id="crit-h" className="text-[18px] font-bold">Why this score: {RUBRICS[jobKey].shortTitle}</h2>
              <p className="mt-1 text-[13px] text-ink-3">
                Points = weight × evidence (Direct 1, Related 0.5, Not evidenced or Uncertain 0). Quotes are verbatim and were found in the source text.
              </p>
              <ol className="mt-4 grid gap-3">
                {criteria.map((c) => (
                  <li key={c.job_criteria.criterion_key} className="rounded-card border border-rule bg-sheet p-4">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <h3 className="text-[15px] font-semibold">{c.job_criteria.label}</h3>
                      <span className="flex items-center gap-3">
                        <StateMark state={c.evidence_state} />
                        <span className="text-[14px] tabular"><b>{fmt(Number(c.points_awarded))}</b><span className="text-ink-3"> / {fmt(Number(c.criterion_weight))}</span></span>
                      </span>
                    </div>
                    <p className="mt-2 text-[13.5px] text-ink-2">{c.explanation}</p>
                    {c.evidence.length > 0 && (
                      <ul className="mt-3 grid gap-2">
                        {c.evidence.map((e, i) => {
                          const a = anchor(e.locator);
                          return (
                            <li key={i} className="rounded-control bg-paper px-3 py-2">
                              <q className="text-[13.5px] text-ink before:content-['“'] after:content-['”']">{e.quote}</q>
                              <span className="mt-1 block text-[12px] text-ink-3">
                                {e.verified ? (a ? <a href={`#${a}`} className="underline">{e.locator?.locatorLabel}</a> : e.locator?.locatorLabel) : "Not found in source: excluded from scoring"}
                              </span>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </li>
                ))}
              </ol>
            </section>

            <aside aria-labelledby="src-h" className="min-w-0 xl:sticky xl:top-6 xl:self-start">
              <div className="rounded-card border border-rule bg-sheet">
                <div className="border-b border-rule p-4">
                  <h2 id="src-h" className="text-[16px] font-bold">Extracted text</h2>
                  <p className="text-[12.5px] text-ink-3">
                    Generated from the original by {parsed?.parser_name} ({parsed?.parser_version}). Highlighted passages are cited above.
                    The downloadable original is the authoritative copy.
                  </p>
                </div>
                <div className="max-h-[70vh] overflow-y-auto p-4 text-[13px] leading-relaxed">
                  {blocks.map((b) => {
                    const a = anchor(b.locator);
                    return (
                      <p key={b.blockId} id={a ?? undefined}
                        className={`scroll-mt-24 rounded-[4px] px-1 py-0.5 ${b.styleName === "Heading" ? "mt-3 font-bold text-ink" : "text-ink-2"} ${a && cited.has(a) ? "bg-related-soft text-ink target:outline-2 target:outline-related" : "target:bg-paper"}`}>
                        {b.text}
                      </p>
                    );
                  })}
                </div>
              </div>
            </aside>
          </div>

          {current && <Mandatory checks={current.mandatory as MandatoryCheck[]} jobKey={jobKey} />}

          <div className="grid gap-6 lg:grid-cols-2">
            <section aria-labelledby="exp-h" className="rounded-card border border-rule bg-sheet p-5">
              <h2 id="exp-h" className="text-[16px] font-bold">Experience</h2>
              <dl className="mt-3 grid grid-cols-2 gap-3 text-[13px] sm:grid-cols-4">
                <Stat label="LCA professional" value={months(p!.experienceSummary.lcaProfessionalMonths)} />
                <Stat label="LCA internship" value={months(p!.experienceSummary.lcaInternshipMonths)} />
                <Stat label="LCA academic" value={months(p!.experienceSummary.lcaAcademicMonths)} />
                <Stat label="UI/UX related" value={months(p!.experienceSummary.uiuxMonths)} />
              </dl>
              <p className="mt-2 text-[12px] text-ink-3">Overlapping roles are merged; only month-precise dates count. Reference month {p!.referenceMonth}.</p>
              <ul className="mt-3 divide-y divide-rule">
                {p!.experience.map((e, i) => (
                  <li key={i} className="py-2.5">
                    <p className="text-[14px] font-semibold">{e.title}{e.organization ? `, ${e.organization}` : ""}</p>
                    <p className="text-[12.5px] text-ink-3">
                      {e.startDate ?? "?"} to {e.endDate ?? "?"} · {e.experienceType.toLowerCase().replace("_", " ")} · {e.relevance.replace("_", " ").toLowerCase()}
                      {e.dateStatus !== "COMPLETE" && <b className="text-related"> · dates {e.dateStatus.toLowerCase()}, not counted</b>}
                    </p>
                  </li>
                ))}
              </ul>
              {p!.experienceSummary.warnings.length > 0 && <ul className="mt-2 list-disc pl-5 text-[12.5px] text-related">{p!.experienceSummary.warnings.map((w) => <li key={w}>{w}</li>)}</ul>}
            </section>

            <section aria-labelledby="prof-h" className="rounded-card border border-rule bg-sheet p-5">
              <h2 id="prof-h" className="text-[16px] font-bold">Profile</h2>
              {p!.summary && <p className="mt-2 text-[14px] text-ink-2">{p!.summary}</p>}
              <h3 className="mt-4 text-[13px] font-semibold text-ink-3">Education</h3>
              <ul className="mt-1 text-[14px]">{p!.education.map((e, i) => <li key={i}>{[e.qualification, e.field, e.institution, e.endYear].filter(Boolean).join(", ")}</li>)}</ul>
              <h3 className="mt-4 text-[13px] font-semibold text-ink-3">Tools</h3>
              <ul className="mt-1.5 flex flex-wrap gap-1.5">
                {p!.tools.map((t, i) => (
                  <li key={i} className={`rounded-chip px-2 py-0.5 text-[12.5px] ${t.usage === "DEMONSTRATED" ? "bg-ink text-white" : "border border-rule-strong text-ink-2"}`}>
                    {t.canonical}<span className="sr-only">{t.usage === "DEMONSTRATED" ? " (used in work)" : " (listed only)"}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-1.5 text-[12px] text-ink-3">Filled: used in a role or project. Outlined: listed only.</p>
              {p!.portfolioUrls.length > 0 && (
                <>
                  <h3 className="mt-4 text-[13px] font-semibold text-ink-3">Portfolio links (not reviewed by the system)</h3>
                  <ul className="mt-1 text-[13px]">{p!.portfolioUrls.map((u) => {
                    const href = safeHref(u);
                    return <li key={u}>{href ? <a href={href} rel="noopener noreferrer nofollow" target="_blank" className="break-all text-ink underline decoration-rule-strong hover:decoration-ink">{u}</a> : <span className="break-all">{u}</span>}</li>;
                  })}</ul>
                </>
              )}
            </section>
          </div>

          <section aria-labelledby="q-h" className="rounded-card border border-rule bg-sheet p-5">
            <h2 id="q-h" className="text-[16px] font-bold">Extraction quality: {QUALITY_LABEL[quality!.status]}</h2>
            <p className="mt-1 text-[13px] text-ink-3">Separate from the score. These checks say how far the extracted data can be trusted, not how good the candidate is.</p>
            <ul className="mt-3 grid gap-2 sm:grid-cols-2">
              {quality!.checks.map((c) => (
                <li key={c.key} className="flex gap-2.5 text-[13px]">
                  <span className={`mt-0.5 h-fit shrink-0 rounded-chip px-1.5 text-[11px] font-bold ${c.status === "PASS" ? "bg-direct-soft text-direct" : c.status === "WARNING" ? "bg-related-soft text-related" : c.status === "FAIL" ? "bg-uncertain-soft text-uncertain" : "bg-paper text-ink-3"}`}>{c.status.replace("_", " ")}</span>
                  <span><b className="font-semibold">{c.label}.</b> <span className="text-ink-2">{c.detail}</span></span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-[12px] text-ink-3">
              Extracted by {extraction?.model_provider} {extraction?.model_name} · prompt {extraction?.prompt_version} · schema {extraction?.schema_version} · profile v{profile.profile_version} · {current?.rubric_version} · {current?.scoring_version}
            </p>
          </section>
        </>
      )}

      <section aria-labelledby="rev-h" className="grid gap-6 rounded-card border border-rule bg-sheet p-5 lg:grid-cols-2">
        <div>
          <h2 id="rev-h" className="text-[16px] font-bold">Your review</h2>
          <p className="mb-3 mt-1 text-[13px] text-ink-3">Reviews are added to a permanent history. Nothing here changes the computed score.</p>
          <ReviewForm candidateId={cand.id} current={cand.review_status} />
        </div>
        <div>
          <h3 className="text-[13px] font-semibold text-ink-3">History</h3>
          {events.length === 0 ? <p className="mt-2 text-[13px] text-ink-2">No reviews yet.</p> : (
            <ol className="mt-2 grid gap-2">
              {events.map((e) => (
                <li key={e.id} className="rounded-control bg-paper px-3 py-2 text-[13px]">
                  <span className="text-ink-3">{new Date(e.created_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</span>
                  {e.event_type === "STATUS_CHANGE" && <span className="block font-semibold text-violet-ink">{String(e.previous_value)} → {String(e.new_value)}</span>}
                  {e.notes && <span className="block whitespace-pre-wrap text-ink">{e.notes}</span>}
                </li>
              ))}
            </ol>
          )}
        </div>
      </section>
    </div>
  );
}

function Mandatory({ checks, jobKey }: { checks: MandatoryCheck[]; jobKey: JobKey }) {
  const TONE: Record<string, string> = {
    ESTABLISHED: "bg-direct-soft text-direct", STATED_IN_RESUME: "bg-direct-soft text-direct",
    NOT_ESTABLISHED: "bg-paper text-ink-2 border border-rule-strong", CANDIDATE_CONFIRMATION_REQUIRED: "bg-paper text-ink-3 border border-dashed border-rule-strong",
  };
  const WORD: Record<string, string> = {
    ESTABLISHED: "Established", STATED_IN_RESUME: "Stated in resume", NOT_ESTABLISHED: "Not established", CANDIDATE_CONFIRMATION_REQUIRED: "Ask the candidate",
  };
  return (
    <section aria-labelledby="m-h" className="rounded-card border border-rule bg-sheet p-5">
      <h2 id="m-h" className="text-[16px] font-bold">Requirements to verify: {RUBRICS[jobKey].shortTitle}</h2>
      <p className="mt-1 text-[13px] text-ink-3">Kept outside the score. “Ask the candidate” is a screening question, never a rejection.</p>
      <ul className="mt-3 grid gap-2 md:grid-cols-2">
        {checks.map((m) => (
          <li key={m.key} className="flex items-start gap-3 text-[13.5px]">
            <span className={`mt-0.5 shrink-0 rounded-chip px-1.5 py-0.5 text-[11.5px] font-bold ${TONE[m.status]}`}>{WORD[m.status]}</span>
            <span><b className="font-semibold">{m.label}.</b> <span className="text-ink-2">{m.detail}</span></span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Render-time allowlist (normalization already filters; this guards stored data too). */
function safeHref(u: string): string | null {
  try {
    const x = new URL(u);
    return x.protocol === "https:" || x.protocol === "http:" ? x.href : null;
  } catch {
    return null;
  }
}

const Stat = ({ label, value }: { label: string; value: string }) => (
  <div><dt className="text-ink-3">{label}</dt><dd className="text-[15px] font-bold tabular">{value}</dd></div>
);
