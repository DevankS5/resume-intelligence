"use client";
import { useRef, useState } from "react";
import Link from "next/link";
import { CheckCircle2, FileUp, Loader2, TriangleAlert } from "lucide-react";
import { browserClient } from "@/lib/supabase/browser";

type Phase =
  | { kind: "idle" }
  | { kind: "working"; step: string }
  | { kind: "done"; candidateId: string; ref?: string; status: string; duplicate?: boolean }
  | { kind: "error"; message: string };

const STEPS: Record<string, string> = {
  QUEUED: "Queued", PARSING: "Reading the document", EXTRACTING: "Extracting evidence (about 20 seconds)",
  SCORING: "Scoring against both roles", RETRY_WAIT: "The extraction service is busy; retrying shortly",
};
const MAX = 5 * 1024 * 1024;

async function sha256Hex(file: File) {
  const buf = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function Uploader() {
  const input = useRef<HTMLInputElement>(null);
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  const [dragging, setDragging] = useState(false);
  const busy = phase.kind === "working";

  async function handle(file: File | undefined) {
    if (!file || busy) return;
    if (!/\.(docx|pdf)$/i.test(file.name)) return setPhase({ kind: "error", message: "Choose a .docx file or a text-based PDF." });
    if (file.size > MAX) return setPhase({ kind: "error", message: "The file is larger than the 5 MB limit." });
    // Fast feedback only; the server re-checks the stored bytes and is the authority.
    const head = new Uint8Array(await file.slice(0, 5).arrayBuffer());
    const zip = head[0] === 0x50 && head[1] === 0x4b && head[2] === 0x03 && head[3] === 0x04;
    const pdf = String.fromCharCode(...head) === "%PDF-";
    if (/\.docx$/i.test(file.name) ? !zip : !pdf) {
      return setPhase({ kind: "error", message: "The file's contents do not match its extension. Export it again as .docx or PDF." });
    }
    try {
      setPhase({ kind: "working", step: "Checking the file" });
      const intent = await post("/api/resumes/upload-intent", { filename: file.name, byteSize: file.size, sha256: await sha256Hex(file) });
      if (intent.duplicate) return setPhase({ kind: "done", candidateId: intent.candidateId, ref: intent.candidateRef, status: "DUPLICATE", duplicate: true });

      setPhase({ kind: "working", step: "Uploading to private storage" });
      const { error } = await browserClient().storage.from("resumes").uploadToSignedUrl(intent.storagePath, intent.uploadToken, file, {
        contentType: file.type || undefined,
      });
      if (error) throw new Error("The upload did not complete. Check your connection and try again.");

      setPhase({ kind: "working", step: "Verifying the file" });
      const done = await post(`/api/resumes/${intent.resumeId}/complete`, {});
      await poll(done.jobId, intent.candidateRef);
    } catch (e) {
      setPhase({ kind: "error", message: (e as Error).message });
    }
  }

  async function poll(jobId: string, ref: string) {
    for (let i = 0; i < 90; i++) {
      const res = await fetch(`/api/processing/${jobId}`, { cache: "no-store" });
      const s = await res.json();
      if (!res.ok) throw new Error(s.message ?? "Status unavailable.");
      if (["COMPLETED", "REVIEW_REQUIRED", "FAILED"].includes(s.status)) {
        if (s.status === "FAILED") return setPhase({ kind: "error", message: `${ref}: ${s.message ?? "Processing failed."} The record is kept and listed under failed records.` });
        return setPhase({ kind: "done", candidateId: s.candidateId, ref, status: s.status });
      }
      setPhase({ kind: "working", step: STEPS[s.status] ?? "Processing" });
      await new Promise((r) => setTimeout(r, 3000));
    }
    setPhase({ kind: "error", message: `${ref} is still processing. It will appear in All records when it finishes.` });
  }

  return (
    <div className="grid gap-4">
      <label
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); handle(e.dataTransfer.files[0]); }}
        className={`grid cursor-pointer place-items-center gap-3 rounded-card border-2 border-dashed px-6 py-12 text-center transition-colors ${
          dragging ? "border-ink bg-paper" : "border-rule-strong bg-sheet hover:border-ink-3"
        } ${busy ? "pointer-events-none opacity-70" : ""}`}>
        <FileUp size={28} strokeWidth={1.6} className="text-ink-3" aria-hidden="true" />
        <span className="text-[16px] font-semibold">Drop a resume here, or <span className="text-ink underline decoration-rule-strong hover:decoration-ink">choose a file</span></span>
        <span className="text-[13px] text-ink-3">.docx or text-based PDF, up to 5 MB. Scanned PDFs are flagged, not guessed.</span>
        <input ref={input} type="file" accept=".docx,.pdf,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          className="sr-only" disabled={busy} onChange={(e) => { handle(e.target.files?.[0]); e.target.value = ""; }} />
      </label>

      <div aria-live="polite">
        {phase.kind === "working" && (
          <p className="flex items-center gap-2.5 rounded-control bg-paper px-4 py-3 text-[14px]">
            <Loader2 size={16} className="animate-spin text-ink-3" aria-hidden="true" /> {phase.step}…
          </p>
        )}
        {phase.kind === "done" && (
          <div className="flex flex-wrap items-center gap-3 rounded-control bg-direct-soft px-4 py-3 text-[14px] text-direct">
            <CheckCircle2 size={17} aria-hidden="true" />
            <span className="text-ink">
              {phase.duplicate
                ? <>This exact file was already uploaded as <b>{phase.ref}</b>. No duplicate was created.</>
                : <><b>{phase.ref}</b> was scored for both roles{phase.status === "REVIEW_REQUIRED" ? " and flagged for review" : ""}. Both rankings are updated.</>}
            </span>
            <Link href={`/candidates/${phase.candidateId}`} className="font-semibold text-ink underline decoration-rule-strong hover:decoration-ink">Open candidate</Link>
          </div>
        )}
        {phase.kind === "error" && (
          <p role="alert" className="flex items-start gap-2.5 rounded-control bg-uncertain-soft px-4 py-3 text-[14px] text-uncertain">
            <TriangleAlert size={17} className="mt-0.5 shrink-0" aria-hidden="true" /> <span className="text-ink">{phase.message}</span>
          </p>
        )}
      </div>
    </div>
  );
}

async function post(url: string, body: unknown) {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.message ?? "Something went wrong. Try again.");
  return json;
}
