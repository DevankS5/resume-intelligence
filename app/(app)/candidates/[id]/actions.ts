"use server";
import { revalidatePath } from "next/cache";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { REVIEW_STATUSES } from "@domain/types";
import { serverClient } from "@/lib/supabase/server";

const Input = z.object({
  candidateId: z.uuid(),
  status: z.enum(REVIEW_STATUSES).optional().or(z.literal("").transform(() => undefined)),
  notes: z.string().max(4000).optional(),
  idempotencyKey: z.string().min(8).max(80).optional(),
});

export type ReviewState = { ok: boolean; message: string } | null;

/** Writes an immutable review event through record_review (HR-only, idempotent, audited). */
export async function recordReview(_: ReviewState, form: FormData): Promise<ReviewState> {
  const parsed = Input.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { ok: false, message: "Choose a status or write a note (up to 4000 characters)." };
  const { candidateId, status, notes, idempotencyKey } = parsed.data;
  if (!status && !notes?.trim()) return { ok: false, message: "Choose a status or write a note." };

  const db = await serverClient();
  const { error } = await db.rpc("record_review", {
    p_candidate_id: candidateId, p_status: status ?? null, p_notes: notes ?? null,
    p_idempotency_key: idempotencyKey ?? randomUUID(),
  });
  if (error) return { ok: false, message: error.code === "42501" ? "Your account cannot record reviews." : "The review could not be saved. Try again." };
  revalidatePath(`/candidates/${candidateId}`);
  return { ok: true, message: "Saved to the review history." };
}
