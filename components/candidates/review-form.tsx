"use client";
import { useActionState, useId, useState } from "react";
import { recordReview, type ReviewState } from "@/app/(app)/candidates/[id]/actions";
import { REVIEW_LABEL } from "@/components/shared/marks";

export function ReviewForm({ candidateId, current }: { candidateId: string; current: string }) {
  const [state, action, pending] = useActionState<ReviewState, FormData>(recordReview, null);
  // One key per form instance, so a double submit resolves to the same review event.
  const [key, setKey] = useState(() => crypto.randomUUID());
  const statusId = useId();
  return (
    <form action={async (fd) => { await action(fd); setKey(crypto.randomUUID()); }} className="grid gap-3">
      <input type="hidden" name="candidateId" value={candidateId} />
      <input type="hidden" name="idempotencyKey" value={key} />
      <label htmlFor={statusId} className="text-[13px] font-semibold">Review status</label>
      <select id={statusId} name="status" defaultValue="" className="h-10 rounded-control border border-rule-strong bg-sheet px-3">
        <option value="">Keep “{REVIEW_LABEL[current] ?? current}”</option>
        {Object.entries(REVIEW_LABEL).filter(([k]) => k !== current).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
      </select>
      <label className="grid gap-1.5 text-[13px] font-semibold">
        Note for the review history
        <textarea name="notes" rows={3} maxLength={4000}
          placeholder="e.g. Ask about GaBi use and Chennai relocation in screening call"
          className="rounded-control border border-rule-strong bg-sheet px-3 py-2 text-[14px] font-normal placeholder:text-ink-3" />
      </label>
      <div className="flex items-center gap-3">
        <button disabled={pending} className="h-10 rounded-control bg-violet px-4 font-semibold text-white hover:bg-violet-ink disabled:opacity-60">
          {pending ? "Saving…" : "Record review"}
        </button>
        {state && (
          <p role="status" className={`text-[13px] ${state.ok ? "text-direct" : "text-uncertain"}`}>{state.message}</p>
        )}
      </div>
    </form>
  );
}
