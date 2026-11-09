import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { RUBRICS } from "@domain/rubrics";
import type { EvidenceState, JobKey } from "@domain/types";
import { getRanking } from "@/lib/data/queries";
import { serverClient } from "@/lib/supabase/server";
import { BAND_LABEL, CLASS_LABEL, QUALITY_LABEL, REVIEW_LABEL, ReviewMark, ScoreBar, StateMark, fmt, months } from "@/components/shared/marks";

type Params = { jobKey: string };
type Search = { band?: string; cls?: string; review?: string; quality?: string; min?: string; sort?: string };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { jobKey } = await params;
  return { title: RUBRICS[jobKey as JobKey]?.shortTitle ?? "Role" };
}
export const dynamic = "force-dynamic";

export default async function RolePage({ params, searchParams }: { params: Promise<Params>; searchParams: Promise<Search> }) {
  const { jobKey: raw } = await params;
  const f = await searchParams;
  if (!(raw in RUBRICS)) notFound();
  const jobKey = raw as JobKey;
  const rubric = RUBRICS[jobKey];
  const all = await getRanking(jobKey);

  // Criterion points per assessment: the "rounds" of the result sheet.
  const db = await serverClient();
  const { data: crit } = all.length
    ? await db.from("criterion_assessments").select("assessment_id, evidence_state, points_awarded, job_criteria(criterion_key)").in("assessment_id", all.map((r) => (r as unknown as { assessment_id: string }).assessment_id))
    : { data: [] };
  const byAssessment = new Map<string, Map<string, { state: EvidenceState; points: number }>>();
  for (const c of crit ?? []) {
    const key = (c.job_criteria as unknown as { criterion_key: string }).criterion_key;
    if (!byAssessment.has(c.assessment_id)) byAssessment.set(c.assessment_id, new Map());
    byAssessment.get(c.assessment_id)!.set(key, { state: c.evidence_state as EvidenceState, points: Number(c.points_awarded) });
  }

  const exp = (r: (typeof all)[number]) => (jobKey === "LCA_CONSULTANT" ? r.experience_summary?.lcaProfessionalMonths : r.experience_summary?.uiuxMonths) ?? 0;
  const min = Number(f.min ?? 0) || 0;
  const rows = all
    .filter((r) => (!f.band || r.score_band === f.band) && (!f.cls || r.classification === f.cls) && (!f.review || r.review_status === f.review) && (!f.quality || r.quality_status === f.quality) && r.score >= min)
    .sort((a, b) => (f.sort === "experience" ? exp(b) - exp(a) || a.rank_position - b.rank_position : a.rank_position - b.rank_position));
  const snapshot = all[0];
  const filtered = rows.length !== all.length;

  return (
    <div className="grid gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-3xl">
          <h1 className="text-[28px] font-bold leading-tight tracking-[-0.015em]">{rubric.title}</h1>
          <p className="mt-1.5 text-ink-2">{rubric.location} · {rubric.workMode}. Ranked by evidence in the resume; rank never changes when you filter.</p>
        </div>
        {snapshot && (
          <p className="text-[12px] text-ink-3">
            Snapshot v{snapshot.snapshot_version} · {snapshot.rubric_version} · {snapshot.scoring_version}
            <br />Built {new Date(snapshot.snapshot_created_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
          </p>
        )}
      </header>

      <form className="flex flex-wrap items-end gap-3 rounded-card border border-rule bg-sheet p-4" aria-label="Filter and sort">
        <Select name="band" label="Score band" value={f.band} options={BAND_LABEL} />
        <Select name="cls" label="Routing label" value={f.cls} options={CLASS_LABEL} />
        <Select name="quality" label="Extraction quality" value={f.quality} options={QUALITY_LABEL} />
        <Select name="review" label="Review status" value={f.review} options={REVIEW_LABEL} />
        <label className="grid gap-1 text-[12px] font-semibold text-ink-2">
          Minimum score
          <input type="number" name="min" min={0} max={100} step={5} defaultValue={f.min ?? ""} placeholder="0"
            className="h-9 w-24 rounded-control border border-rule-strong bg-sheet px-2.5 text-[14px] font-normal text-ink tabular" />
        </label>
        <Select name="sort" label="Order by" value={f.sort} options={{ experience: jobKey === "LCA_CONSULTANT" ? "Verified LCA experience" : "UI/UX experience" }} placeholder="Rank (score)" />
        <button className="h-9 rounded-control bg-shell px-4 text-[14px] font-semibold text-white hover:bg-ink">Apply</button>
        {(filtered || f.sort) && <Link href={`/roles/${jobKey}`} className="h-9 px-2 text-[14px] font-semibold leading-9 text-violet underline">Clear</Link>}
        <p className="ml-auto self-center text-[13px] text-ink-3" aria-live="polite">Showing <b className="tabular text-ink">{rows.length}</b> of <span className="tabular">{all.length}</span></p>
      </form>

      <div className="overflow-x-auto rounded-card border border-rule bg-sheet">
        <table className="w-full min-w-[860px] text-[14px]">
          <caption className="sr-only">{rubric.shortTitle} ranking</caption>
          <thead className="bg-paper text-left text-[12px] text-ink-3">
            <tr>
              <th scope="col" className="w-14 py-2.5 pl-4 font-semibold">Rank</th>
              <th scope="col" className="py-2.5 font-semibold">Candidate</th>
              <th scope="col" className="py-2.5 font-semibold">Score / 100</th>
              {rubric.criteria.map((c) => (
                <th key={c.key} scope="col" title={c.label} className="hidden w-12 py-2.5 text-center font-semibold 2xl:table-cell">
                  <abbr title={`${c.label} (max ${c.weight})`} className="no-underline">{shortOf(c.key)}</abbr>
                </th>
              ))}
              <th scope="col" className="py-2.5 font-semibold">{jobKey === "LCA_CONSULTANT" ? "Verified LCA exp." : "UI/UX exp."}</th>
              <th scope="col" className="py-2.5 font-semibold">Checks</th>
              <th scope="col" className="py-2.5 font-semibold">Extraction</th>
              <th scope="col" className="py-2.5 pr-4 font-semibold">Review</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const pts = byAssessment.get((r as unknown as { assessment_id: string }).assessment_id);
              const unmet = r.mandatory.filter((m) => m.status === "NOT_ESTABLISHED").length;
              const confirm = r.mandatory.filter((m) => m.status === "CANDIDATE_CONFIRMATION_REQUIRED").length;
              return (
                <tr key={r.candidate_id} className="border-t border-rule align-middle hover:bg-paper/70">
                  <td className="py-3 pl-4 font-bold tabular text-ink-3">{r.rank_position}</td>
                  <td className="py-3">
                    <Link href={`/candidates/${r.candidate_id}?role=${jobKey}`} className="font-semibold underline decoration-rule-strong hover:decoration-ink">{r.candidate_ref}</Link>
                    <span className="block text-[12px] text-ink-3">{CLASS_LABEL[r.classification]}{r.tie_break ? ` · tie broken by ${r.tie_break}` : ""}</span>
                  </td>
                  <td className="py-3"><ScoreBar score={r.score} label="Score" /><span className="mt-0.5 block text-[12px] text-ink-3">{BAND_LABEL[r.score_band]}</span></td>
                  {rubric.criteria.map((c) => {
                    const p = pts?.get(c.key);
                    return (
                      <td key={c.key} className="hidden py-3 text-center 2xl:table-cell">
                        {p ? <span className="inline-flex flex-col items-center gap-0.5"><StateMark state={p.state} compact /><span className="text-[12px] tabular text-ink-2">{fmt(p.points)}</span></span> : "–"}
                      </td>
                    );
                  })}
                  <td className="py-3 tabular text-ink-2">{months(exp(r))}</td>
                  <td className="py-3 text-[12.5px] text-ink-2">
                    {unmet > 0 && <span className="block">{unmet} not established</span>}
                    {confirm > 0 && <span className="block text-ink-3">{confirm} to confirm</span>}
                    {unmet + confirm === 0 && "All established"}
                  </td>
                  <td className="py-3 text-[13px]">{QUALITY_LABEL[r.quality_status] ?? r.quality_status}{r.review_flags.length > 0 && <span className="block text-[12px] text-related">{r.review_flags.length} flag{r.review_flags.length > 1 ? "s" : ""}</span>}</td>
                  <td className="py-3 pr-4"><ReviewMark status={r.review_status} /></td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr><td colSpan={8 + rubric.criteria.length} className="px-4 py-10 text-center text-ink-2">
                {all.length === 0 ? "No ranking yet." : <>No candidates match these filters. <Link href={`/roles/${jobKey}`} className="font-semibold text-violet underline">Clear filters</Link></>}
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="text-[12.5px] text-ink-3">
        Bands: Strong 75+, Potential 55–74, Limited 35–54, Weak below 35. These are prototype heuristics, not validated cut-offs.
        Tick marks on each bar sit at 35, 55 and 75.
      </p>
    </div>
  );
}

function Select({ name, label, value, options, placeholder = "Any" }: { name: string; label: string; value?: string; options: Record<string, string>; placeholder?: string }) {
  return (
    <label className="grid gap-1 text-[12px] font-semibold text-ink-2">
      {label}
      <select name={name} defaultValue={value ?? ""} className="h-9 min-w-36 rounded-control border border-rule-strong bg-sheet px-2.5 text-[14px] font-normal text-ink">
        <option value="">{placeholder}</option>
        {Object.entries(options).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
      </select>
    </label>
  );
}

const SHORT: Record<string, string> = {
  lca_experience: "Exp", lca_project_delivery: "Proj", lca_software: "SW", lci_data: "LCI", iso_modelling: "ISO",
  operational_data: "Ops", education: "Edu", benchmarking_epd: "EPD", stakeholder: "Stk",
  figma_prototyping: "Figma", uxui_principles: "HCD", user_research: "Rsch", interface_experience: "UI", high_fidelity: "Hi-fi",
  visual_design: "Vis", responsive_design: "Resp", design_systems: "DS", collaboration: "Collab",
};
const shortOf = (k: string) => SHORT[k] ?? k;
