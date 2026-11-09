import type { Metadata } from "next";
import Link from "next/link";
import { hrMessage } from "@domain/errors";
import { getOverview } from "@/lib/data/queries";
import { CLASS_LABEL, QUALITY_LABEL, ReviewMark, Stamp, STATUS_LABEL, fmt } from "@/components/shared/marks";

export const metadata: Metadata = { title: "All records" };
export const dynamic = "force-dynamic";

export default async function CandidatesPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status } = await searchParams;
  const all = await getOverview();
  const rows = status === "failed" ? all.filter((r) => r.processing_status === "FAILED")
    : status === "review" ? all.filter((r) => r.processing_status === "REVIEW_REQUIRED" || r.classification === "UNCERTAIN")
    : all;
  const tabs = [
    { k: undefined, label: "Every record", n: all.length },
    { k: "review", label: "Needs review", n: all.filter((r) => r.processing_status === "REVIEW_REQUIRED" || r.classification === "UNCERTAIN").length },
    { k: "failed", label: "Failed", n: all.filter((r) => r.processing_status === "FAILED").length },
  ];

  return (
    <div className="grid gap-6">
      <header className="max-w-3xl">
        <h1 className="text-[28px] font-bold leading-tight tracking-[-0.015em]">All records</h1>
        <p className="mt-1.5 text-ink-2">Every received document, including those that could not be read. Both role scores sit side by side; a candidate can fit one, both or neither.</p>
      </header>
      <nav aria-label="Record filters" className="flex flex-wrap gap-2">
        {tabs.map((t) => (
          <Link key={t.label} href={t.k ? `?status=${t.k}` : "/candidates"} aria-current={status === t.k ? "page" : undefined}
            className={`rounded-control border px-3 py-1.5 text-[14px] font-semibold ${status === t.k ? "border-ink bg-ink text-white" : "border-rule-strong bg-sheet text-ink-2 hover:border-ink"}`}>
            {t.label} <span className="tabular opacity-80">{t.n}</span>
          </Link>
        ))}
      </nav>
      <div className="overflow-x-auto rounded-card border border-rule bg-sheet">
        <table className="w-full min-w-[900px] text-[14px]">
          <caption className="sr-only">All candidate records</caption>
          <thead className="bg-paper text-left text-[12px] text-ink-3">
            <tr>
              <th scope="col" className="py-2.5 pl-4 font-semibold">Candidate</th>
              <th scope="col" className="py-2.5 font-semibold">Source file</th>
              <th scope="col" className="py-2.5 font-semibold">Processing</th>
              <th scope="col" className="py-2.5 text-right font-semibold">LCA</th>
              <th scope="col" className="py-2.5 text-right font-semibold">UI/UX</th>
              <th scope="col" className="py-2.5 pl-6 font-semibold">Routing</th>
              <th scope="col" className="py-2.5 font-semibold">Extraction</th>
              <th scope="col" className="py-2.5 pr-4 font-semibold">Review</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.candidate_id} className="border-t border-rule hover:bg-paper/70">
                <td className="py-2.5 pl-4"><Link href={`/candidates/${r.candidate_id}`} className="font-semibold underline decoration-rule-strong hover:decoration-ink">{r.candidate_ref}</Link></td>
                <td className="max-w-[240px] truncate py-2.5 text-[13px] text-ink-2" title={r.display_reference}>
                  {r.display_reference}{r.batch !== "initial-47" && <span className="ml-1.5 rounded-chip border border-rule-strong px-1.5 text-[11px] font-semibold text-ink-2">Upload</span>}
                </td>
                <td className="py-2.5 text-[13px]">
                  {r.processing_status === "FAILED" ? <Stamp tone="fail">Failed</Stamp> : <span>{STATUS_LABEL[r.processing_status] ?? r.processing_status}</span>}
                  {r.last_error_code && <span className="block text-[12px] text-ink-3">{hrMessage(r.last_error_code)}</span>}
                </td>
                <td className="py-2.5 text-right font-semibold tabular">{r.lca_score == null ? "–" : fmt(r.lca_score)}</td>
                <td className="py-2.5 text-right font-semibold tabular">{r.uiux_score == null ? "–" : fmt(r.uiux_score)}</td>
                <td className="py-2.5 pl-6 text-[13px]">{r.classification ? CLASS_LABEL[r.classification] : "–"}</td>
                <td className="py-2.5 text-[13px]">{r.quality_status ? QUALITY_LABEL[r.quality_status] : "–"}</td>
                <td className="py-2.5 pr-4"><ReviewMark status={r.review_status} /></td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={8} className="px-4 py-10 text-center text-ink-2">No records in this view.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
