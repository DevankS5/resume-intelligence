// The status vocabulary. Every state is a shape plus a word; colour only reinforces it.
import type { EvidenceState } from "@domain/types";

const STATE: Record<EvidenceState, { label: string; cls: string; glyph: React.ReactNode }> = {
  DIRECT: {
    label: "Direct",
    cls: "text-direct bg-direct-soft",
    glyph: <rect x="1" y="1" width="10" height="10" rx="2" fill="currentColor" />,
  },
  RELATED: {
    label: "Related",
    cls: "text-related bg-related-soft",
    glyph: (
      <>
        <rect x="1.5" y="1.5" width="9" height="9" rx="2" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <path d="M1.5 6h9v2.5a2 2 0 0 1-2 2h-5a2 2 0 0 1-2-2z" fill="currentColor" />
      </>
    ),
  },
  NOT_EVIDENCED: {
    label: "Not evidenced",
    cls: "text-none bg-paper",
    glyph: <rect x="1.5" y="1.5" width="9" height="9" rx="2" fill="none" stroke="currentColor" strokeWidth="1.5" />,
  },
  UNCERTAIN: {
    label: "Uncertain",
    cls: "text-uncertain bg-uncertain-soft",
    glyph: <rect x="1.5" y="1.5" width="9" height="9" rx="2" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="2.2 1.6" />,
  },
};

export function StateMark({ state, compact = false }: { state: EvidenceState; compact?: boolean }) {
  const s = STATE[state];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-chip px-1.5 py-0.5 text-[12px] font-semibold ${s.cls}`}>
      <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">{s.glyph}</svg>
      {compact ? <span className="sr-only">{s.label}</span> : s.label}
    </span>
  );
}

export const BAND_LABEL: Record<string, string> = {
  STRONG: "Strong evidence",
  POTENTIAL: "Potential fit",
  LIMITED: "Limited evidence",
  WEAK: "Weak evidence",
  UNASSESSABLE: "Not assessable",
};

export const CLASS_LABEL: Record<string, string> = {
  LCA_STRONGER: "Stronger for LCA",
  UIUX_STRONGER: "Stronger for UI/UX",
  BOTH: "Relevant to both",
  NEITHER_EVIDENCED: "Neither evidenced",
  UNCERTAIN: "Uncertain: review",
};

export const REVIEW_LABEL: Record<string, string> = {
  UNREVIEWED: "Unreviewed",
  NEEDS_REVIEW: "Needs review",
  IN_REVIEW: "In review",
  VERIFIED: "Verified",
  SHORTLISTED: "Shortlisted",
  NOT_SHORTLISTED: "Not shortlisted",
};

export const QUALITY_LABEL: Record<string, string> = {
  HIGH: "High",
  MEDIUM: "Medium",
  LOW: "Low: review",
  UNASSESSABLE: "Unassessable",
};

export const STATUS_LABEL: Record<string, string> = {
  RECEIVED: "Received",
  QUEUED: "Queued",
  PARSING: "Reading document",
  EXTRACTING: "Extracting",
  SCORING: "Scoring",
  COMPLETED: "Scored",
  REVIEW_REQUIRED: "Scored, needs review",
  RETRY_WAIT: "Waiting to retry",
  FAILED: "Failed",
  CANCELLED: "Cancelled",
};

/** Human-verified marks use the indelible-ink violet; everything else stays ink-neutral. */
export function ReviewMark({ status }: { status: string }) {
  const human = ["VERIFIED", "SHORTLISTED", "NOT_SHORTLISTED", "IN_REVIEW"].includes(status);
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-chip px-1.5 py-0.5 text-[12px] font-semibold ${
        human ? "bg-violet-soft text-violet-ink" : "text-ink-3"
      }`}
    >
      <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
        {human ? <circle cx="5" cy="5" r="4" fill="currentColor" /> : <circle cx="5" cy="5" r="3.5" fill="none" stroke="currentColor" strokeWidth="1.3" />}
      </svg>
      {REVIEW_LABEL[status] ?? status}
    </span>
  );
}

/** One fixed 0–100 scale for every row, so bars compare across the whole sheet. */
export function ScoreBar({ score, label }: { score: number | null; label: string }) {
  if (score == null) return <span className="text-[13px] text-ink-3">Not scored</span>;
  return (
    <div className="flex items-center gap-2.5" aria-label={`${label}: ${score} of 100`}>
      <span className="w-11 text-right text-[15px] font-bold tabular">{fmt(score)}</span>
      <span className="relative h-2 w-24 overflow-hidden rounded-full bg-rule" aria-hidden="true">
        <span className="absolute inset-y-0 left-0 rounded-full bg-ink" style={{ width: `${score}%` }} />
        {[35, 55, 75].map((t) => (
          <span key={t} className="absolute inset-y-0 w-px bg-sheet" style={{ left: `${t}%` }} />
        ))}
      </span>
    </div>
  );
}

export const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

export const months = (m: number | null | undefined) => {
  if (!m) return "None verified";
  const y = Math.floor(m / 12);
  const r = m % 12;
  return y ? `${y}y ${r ? `${r}m` : ""}`.trim() : `${r}m`;
};
