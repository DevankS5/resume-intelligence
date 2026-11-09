import type { Metadata } from "next";
import { CLASSIFICATION_RULES, LCA_EXPERIENCE_SCENARIOS, ACTIVE_LCA_SCENARIO, RUBRICS, SCORE_THRESHOLDS } from "@domain/rubrics";
import { VERSIONS } from "@domain/versions";
import { StateMark } from "@/components/shared/marks";

export const metadata: Metadata = { title: "Methodology" };

const STEPS = [
  ["Store", "The original file is checksummed (SHA-256) and kept in private storage. Identical files are recognised and never create a second candidate."],
  ["Read", "Text is extracted with its location (paragraph, table cell or PDF page). Unreadable or scanned files stop here and are listed as failed."],
  ["Extract", "A language model reads one resume at a time and returns structured facts with verbatim quotes. It never sees the weights, never scores, and any instructions inside a resume are ignored and flagged."],
  ["Verify", "Every quote is searched for in the source text. A quote that cannot be found is excluded and the related criterion becomes Uncertain."],
  ["Score", "Deterministic code applies the rubric below. The same profile and versions always give the same score."],
  ["Rank", "Each role is ranked separately and stored as a snapshot. Ties break on the role's most important criterion, then fewer review flags, then candidate reference."],
] as const;

export default function MethodologyPage() {
  return (
    <article className="grid max-w-4xl gap-10 text-[15px]">
      <header>
        <h1 className="text-[28px] font-bold leading-tight tracking-[-0.015em]">Methodology and data quality</h1>
        <p className="mt-2 text-ink-2">
          How a resume becomes two scores, what the scores mean, and where they can be wrong. A score measures evidence in
          the submitted resume under a versioned rubric. It is not a probability of job success, and HR makes every decision.
        </p>
      </header>

      <section aria-labelledby="pipe-h">
        <h2 id="pipe-h" className="text-[20px] font-bold">The pipeline</h2>
        <ol className="mt-4 grid gap-3">
          {STEPS.map(([t, d], i) => (
            <li key={t} className="grid grid-cols-[2rem_1fr] gap-3">
              <span className="grid size-7 place-items-center rounded-chip bg-shell text-[13px] font-bold text-white tabular" aria-hidden="true">{i + 1}</span>
              <p><b>{t}.</b> <span className="text-ink-2">{d}</span></p>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="ev-h">
        <h2 id="ev-h" className="text-[20px] font-bold">Evidence states</h2>
        <dl className="mt-4 grid gap-3 sm:grid-cols-2">
          <div><dt><StateMark state="DIRECT" /> <b className="ml-1">× 1.0</b></dt><dd className="mt-1 text-ink-2">The resume shows the criterion in a real role or project.</dd></div>
          <div><dt><StateMark state="RELATED" /> <b className="ml-1">× 0.5</b></dt><dd className="mt-1 text-ink-2">Adjacent or partial evidence, or a tool only listed in a skills section.</dd></div>
          <div><dt><StateMark state="NOT_EVIDENCED" /> <b className="ml-1">× 0</b></dt><dd className="mt-1 text-ink-2">The resume does not establish it. That is not proof the person lacks it.</dd></div>
          <div><dt><StateMark state="UNCERTAIN" /> <b className="ml-1">× 0 + flag</b></dt><dd className="mt-1 text-ink-2">A claim could not be verified in the source or its dates are unreadable.</dd></div>
        </dl>
        <p className="mt-4 text-ink-2">Code enforces lines the model cannot cross: OpenLCA never satisfies the GaBi/SimaPro requirement; a skills-list mention is never Direct; visual design quality is never Direct because the system does not inspect portfolios.</p>
      </section>

      {Object.values(RUBRICS).map((r) => (
        <section key={r.jobKey} aria-labelledby={`${r.jobKey}-rub`}>
          <h2 id={`${r.jobKey}-rub`} className="text-[20px] font-bold">{r.shortTitle} rubric <span className="text-[13px] font-normal text-ink-3">{r.rubricVersion}</span></h2>
          <div className="mt-3 overflow-x-auto rounded-card border border-rule bg-sheet">
            <table className="w-full min-w-[640px] text-[13.5px]">
              <thead className="bg-paper text-left text-[12px] text-ink-3">
                <tr><th scope="col" className="py-2 pl-4 font-semibold">Criterion</th><th scope="col" className="py-2 text-right font-semibold">Weight</th><th scope="col" className="py-2 pl-5 pr-4 font-semibold">Direct evidence looks like</th></tr>
              </thead>
              <tbody>
                {r.criteria.map((c) => (
                  <tr key={c.key} className="border-t border-rule align-top">
                    <td className="py-2.5 pl-4 font-semibold">{c.label}</td>
                    <td className="py-2.5 text-right font-bold tabular">{c.weight}</td>
                    <td className="py-2.5 pl-5 pr-4 text-ink-2">{c.evidenceGuidance.direct}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}

      <section aria-labelledby="exp-h2" id="experience" className="scroll-mt-6">
        <h2 id="exp-h2" className="text-[20px] font-bold">Experience and the 2–3 vs 4–6 year conflict</h2>
        <p className="mt-2 text-ink-2">
          The detailed LCA job description asks for 2–3 years of independent LCA work; the assignment summary says 4–6. Both are
          kept. The active baseline is <b>{LCA_EXPERIENCE_SCENARIOS[ACTIVE_LCA_SCENARIO].label}</b>; the{" "}
          {LCA_EXPERIENCE_SCENARIOS.problem_summary_sensitivity.label} scenario is a versioned alternative. Longer experience is never penalised.
        </p>
        <p className="mt-2 text-ink-2">
          Months are counted only from month-precise dates, with overlapping roles merged so concurrent jobs are not double-counted.
          Current roles end at a fixed reference month so scores do not drift. Professional, internship and academic LCA work are shown separately;
          only professional LCA months meet the requirement. Relocation, onsite work, travel and a one-year commitment are questions for the candidate, never deductions.
        </p>
      </section>

      <section aria-labelledby="cls-h">
        <h2 id="cls-h" className="text-[20px] font-bold">Bands and routing labels</h2>
        <p className="mt-2 text-ink-2">
          Bands: Strong {SCORE_THRESHOLDS.strong}+, Potential {SCORE_THRESHOLDS.potential}+, Limited {SCORE_THRESHOLDS.limited}+, otherwise Weak. These are prototype heuristics, not validated cut-offs.
          Routing: both roles {CLASSIFICATION_RULES.qualifying}+ is “Relevant to both”; one role {CLASSIFICATION_RULES.qualifying}+ and ahead by {CLASSIFICATION_RULES.margin}+ is “Stronger for” that role;
          both below {CLASSIFICATION_RULES.neitherBelow} is “Neither evidenced”; low extraction quality or anything else is “Uncertain”.
        </p>
      </section>

      <section aria-labelledby="lim-h">
        <h2 id="lim-h" className="text-[20px] font-bold">Known limitations</h2>
        <ul className="mt-3 grid list-disc gap-1.5 pl-5 text-ink-2">
          <li>The model can misread a resume. Verification proves a quote exists, not that the model's interpretation of it is right; check evidence before deciding.</li>
          <li>Text inside images, headers, footers and comments is not read. Scanned PDFs need manual review.</li>
          <li>One dataset file was empty and is counted as failed, not scored.</li>
          <li>Portfolios and visual work are not inspected by the system.</li>
          <li>Extraction uses Google Gemini; resume text leaves this system for that one call per resume.</li>
        </ul>
      </section>

      <section aria-labelledby="ver-h">
        <h2 id="ver-h" className="text-[20px] font-bold">Active versions</h2>
        <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1.5 text-[13.5px] sm:grid-cols-3">
          {Object.entries(VERSIONS).map(([k, v]) => (<div key={k}><dt className="text-ink-3">{k}</dt><dd className="font-semibold">{v}</dd></div>))}
        </dl>
      </section>
    </article>
  );
}
