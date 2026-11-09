import type { Metadata } from "next";
import Link from "next/link";
import { getOverview } from "@/lib/data/queries";
import { Uploader } from "@/components/upload/uploader";
import { STATUS_LABEL, fmt } from "@/components/shared/marks";

export const metadata: Metadata = { title: "Upload resume" };
export const dynamic = "force-dynamic";

export default async function UploadsPage() {
  const uploads = (await getOverview()).filter((r) => r.batch !== "initial-47").sort((a, b) => b.created_at.localeCompare(a.created_at));
  return (
    <div className="grid max-w-4xl gap-8">
      <header>
        <h1 className="text-[28px] font-bold leading-tight tracking-[-0.015em]">Upload a resume</h1>
        <p className="mt-1.5 text-ink-2">
          A new resume goes through the same pipeline as the original 47: stored privately, read, extracted, checked against
          its own text and scored for both roles with the active rubric. Existing candidates are never overwritten.
        </p>
      </header>
      <Uploader />
      <section aria-labelledby="recent-h">
        <h2 id="recent-h" className="text-[16px] font-bold">Uploaded since the initial import</h2>
        {uploads.length === 0 ? <p className="mt-2 text-[14px] text-ink-2">None yet.</p> : (
          <ul className="mt-3 divide-y divide-rule rounded-card border border-rule bg-sheet">
            {uploads.map((u) => (
              <li key={u.candidate_id} className="flex flex-wrap items-center gap-x-5 gap-y-1 px-4 py-3 text-[14px]">
                <Link href={`/candidates/${u.candidate_id}`} className="font-semibold underline decoration-rule-strong">{u.candidate_ref}</Link>
                <span className="min-w-0 flex-1 truncate text-ink-2">{u.display_reference}</span>
                <span className="text-[13px]">{STATUS_LABEL[u.processing_status] ?? u.processing_status}</span>
                <span className="text-[13px] tabular text-ink-2">LCA {u.lca_score == null ? "–" : fmt(u.lca_score)} · UI/UX {u.uiux_score == null ? "–" : fmt(u.uiux_score)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
