import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { RUBRICS, LCA_EXPERIENCE_SCENARIOS, ACTIVE_LCA_SCENARIO } from "@domain/rubrics";
import { hrMessage } from "@domain/errors";
import type { JobKey } from "@domain/types";
import { getOverview, getRanking, type RankingRow } from "@/lib/data/queries";
import { BAND_LABEL, CLASS_LABEL, ScoreBar, Stamp } from "@/components/shared/marks";

export const metadata: Metadata = { title: "Overview" };
export const dynamic = "force-dynamic";

const BANDS = ["STRONG", "POTENTIAL", "LIMITED", "WEAK"] as const;

export default async function Dashboard() {
  const [rows, lca, ux] = await Promise.all([getOverview(), getRanking("LCA_CONSULTANT"), getRanking("UIUX_INTERN")]);
  const attention = rows.filter((r) => r.processing_status === "FAILED" || r.processing_status === "REVIEW_REQUIRED" || r.processing_status === "RETRY_WAIT");
  const classCounts = Object.keys(CLASS_LABEL).map((k) => ({ k, n: rows.filter((r) => r.classification === k).length }));

  return (
    <div className="grid gap-10">
      <header className="max-w-3xl">
        <h1 className="text-[28px] font-bold leading-tight tracking-[-0.015em]">Overview</h1>
        <p className="mt-2 text-ink-2">
          Each candidate is assessed separately for both roles. Scores measure evidence found in the resume
          against a versioned rubric; they are not hiring decisions, and a missing statement is not proof a skill is missing.
        </p>
      </header>

      {rows.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid gap-6 xl:grid-cols-2">
          <RolePanel jobKey="LCA_CONSULTANT" rows={lca} />
          <RolePanel jobKey="UIUX_INTERN" rows={ux} />
        </div>
      )}

      {rows.length > 0 && (
        <div className="grid gap-6 xl:grid-cols-2">
          <section aria-labelledby="class-h" className="rounded-card border border-rule bg-sheet p-5">
            <h2 id="class-h" className="text-[16px] font-bold">Cross-role routing</h2>
            <p className="mt-1 text-[13px] text-ink-3">Labels route attention. None of them rejects a candidate.</p>
            <dl className="mt-4 grid gap-2">
              {classCounts.map(({ k, n }) => (
                <div key={k} className="flex items-center justify-between border-b border-rule pb-2 last:border-0">
                  <dt className="text-[14px]">{CLASS_LABEL[k]}</dt>
                  <dd className="font-bold tabular">{n}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section aria-labelledby="att-h" className="rounded-card border border-rule bg-sheet p-5">
            <h2 id="att-h" className="text-[16px] font-bold">Records that need a person</h2>
            <p className="mt-1 text-[13px] text-ink-3">Failed extractions and low-quality profiles are listed here, never silently scored.</p>
            {attention.length === 0 ? (
              <p className="mt-4 text-[14px] text-ink-2">Nothing is waiting. Every received record was scored with acceptable extraction quality.</p>
            ) : (
              <ul className="mt-3 divide-y divide-rule">
                {attention.map((r) => (
                  <li key={r.candidate_id} className="flex flex-wrap items-start gap-x-4 gap-y-1 py-2.5">
                    <Link href={`/candidates/${r.candidate_id}`} className="w-24 font-semibold text-ink underline decoration-rule-strong hover:decoration-ink">
                      {r.candidate_ref}
                    </Link>
                    <Stamp tone={r.processing_status === "FAILED" ? "fail" : "review"}>{r.processing_status === "FAILED" ? "Failed" : "Needs review"}</Stamp>
                    <span className="min-w-0 flex-1 basis-60 text-[13px] text-ink-2">
                      {r.last_error_code ? hrMessage(r.last_error_code) : "Extraction quality is low; check the evidence against the original."}
                      <span className="block truncate text-ink-3">{r.display_reference}</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

function RolePanel({ jobKey, rows }: { jobKey: JobKey; rows: RankingRow[] }) {
  const rubric = RUBRICS[jobKey];
  const counts = BANDS.map((b) => ({ b, n: rows.filter((r) => r.score_band === b).length }));
  return (
    <section aria-labelledby={`${jobKey}-h`} className="flex flex-col rounded-card border border-rule bg-sheet">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-rule p-5">
        <div>
          <h2 id={`${jobKey}-h`} className="text-[18px] font-bold tracking-[-0.01em]">{rubric.shortTitle}</h2>
          <p className="text-[13px] text-ink-3">{rubric.location} · {rubric.workMode}</p>
        </div>
        <dl className="flex gap-4 text-right">
          {counts.map(({ b, n }) => (
            <div key={b}>
              <dt className="text-[11px] font-semibold text-ink-3">{BAND_LABEL[b]}</dt>
              <dd className="text-[18px] font-bold tabular">{n}</dd>
            </div>
          ))}
        </dl>
      </div>
      {jobKey === "LCA_CONSULTANT" && (
        <p className="border-b border-rule bg-related-soft/60 px-5 py-2 text-[12.5px] text-ink-2">
          Experience baseline: {LCA_EXPERIENCE_SCENARIOS[ACTIVE_LCA_SCENARIO].label}. The problem summary says 4–6 years;{" "}
          <Link href="/methodology#experience" className="font-semibold underline">see how both are handled</Link>.
        </p>
      )}
      <table className="w-full text-[14px]">
        <caption className="sr-only">Top five for {rubric.shortTitle}</caption>
        <thead>
          <tr className="text-left text-[12px] text-ink-3">
            <th scope="col" className="w-14 py-2 pl-5 font-semibold">Rank</th>
            <th scope="col" className="py-2 font-semibold">Candidate</th>
            <th scope="col" className="py-2 font-semibold">Score</th>
            <th scope="col" className="hidden py-2 pr-5 font-semibold sm:table-cell">Band</th>
          </tr>
        </thead>
        <tbody>
          {rows.slice(0, 5).map((r) => (
            <tr key={r.candidate_id} className="border-t border-rule">
              <td className="py-2.5 pl-5 font-bold tabular text-ink-3">{r.rank_position}</td>
              <td className="py-2.5">
                <Link href={`/candidates/${r.candidate_id}?role=${jobKey}`} className="font-semibold underline decoration-rule-strong hover:decoration-ink">
                  {r.candidate_ref}
                </Link>
              </td>
              <td className="py-2.5"><ScoreBar score={r.score} label={`${rubric.shortTitle} score`} /></td>
              <td className="hidden py-2.5 pr-5 text-[13px] text-ink-2 sm:table-cell">{BAND_LABEL[r.score_band]}</td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr><td colSpan={4} className="px-5 py-6 text-ink-3">No ranking yet. It appears once the first resume is scored.</td></tr>
          )}
        </tbody>
      </table>
      <Link href={`/roles/${jobKey}`}
        className="mt-auto flex items-center justify-between rounded-b-card border-t border-rule px-5 py-3 font-semibold text-ink hover:bg-paper">
        Open the full {rubric.shortTitle} ranking ({rows.length})
        <ArrowRight size={16} aria-hidden="true" />
      </Link>
    </section>
  );
}

function EmptyState() {
  return (
    <section className="rounded-card border border-dashed border-rule-strong bg-sheet p-8">
      <h2 className="text-[18px] font-bold">No records yet</h2>
      <p className="mt-2 max-w-2xl text-ink-2">
        The initial 47-resume dataset is loaded by an administrator with the import tool. You can also{" "}
        <Link href="/uploads" className="font-semibold text-ink underline decoration-rule-strong hover:decoration-ink">upload a single resume</Link>; it is processed the same way.
      </p>
    </section>
  );
}
