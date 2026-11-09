// The signature move: the count that must always reconcile. Every screen shows how many
// records were expected, received, scored, held for review and failed. Nothing hidden.
import Link from "next/link";
import type { Account } from "@/lib/data/queries";

export function BallotStrip({ a }: { a: Account }) {
  const segments = [
    { key: "scored", label: "Scored", n: a.scored - countReview(a), cls: "bg-ink", pattern: false },
    { key: "review", label: "Needs review", n: countReview(a), cls: "bg-related", pattern: false },
    { key: "progress", label: "In progress", n: a.inProgress, cls: "bg-rule-strong", pattern: true },
    { key: "failed", label: "Failed", n: a.failed, cls: "bg-uncertain", pattern: false },
  ];
  const total = Math.max(a.received, 1);
  const reconciled = a.initial === a.expected;
  return (
    <section aria-label="Record count" className="border-b border-rule bg-sheet">
      <div className="mx-auto flex max-w-[1400px] flex-wrap items-center gap-x-8 gap-y-3 px-5 py-3 lg:px-8">
        <p className="text-[13px] text-ink-2">
          <span className="font-bold text-ink tabular">{a.initial}</span> of <span className="tabular">{a.expected}</span> expected
          {" "}records accounted for
          {a.uploads > 0 && <> · <span className="tabular">{a.uploads}</span> uploaded since</>}
          {!reconciled && <strong className="ml-1 text-uncertain">(count does not reconcile)</strong>}
        </p>
        <div className="flex min-w-[220px] flex-1 items-center gap-3">
          <div className="flex h-2.5 flex-1 overflow-hidden rounded-full bg-rule" role="img"
            aria-label={segments.map((s) => `${s.label} ${s.n}`).join(", ")}>
            {segments.map((s) => s.n > 0 && (
              <span key={s.key} className={`${s.cls} h-full border-r border-sheet last:border-r-0`}
                style={{ width: `${(s.n / total) * 100}%`, backgroundImage: s.pattern ? "repeating-linear-gradient(45deg, transparent 0 3px, rgb(255 255 255 / .6) 3px 5px)" : undefined }} />
            ))}
          </div>
        </div>
        <ul className="flex flex-wrap gap-x-5 gap-y-1 text-[13px]">
          {segments.map((s) => (
            <li key={s.key} className="flex items-center gap-1.5">
              <span className={`size-2.5 rounded-[3px] ${s.cls}`} aria-hidden="true" />
              <span className="text-ink-2">{s.label}</span>
              <span className="font-bold tabular">{s.n}</span>
            </li>
          ))}
          <li><Link href="/candidates" className="font-semibold text-violet underline">All records</Link></li>
        </ul>
      </div>
    </section>
  );
}

const countReview = (a: Account) => Math.min(a.review, a.scored);
