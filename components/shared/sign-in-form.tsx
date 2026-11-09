"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { browserClient } from "@/lib/supabase/browser";

export function SignInForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    const { error } = await browserClient().auth.signInWithPassword({
      email: String(form.get("email")),
      password: String(form.get("password")),
    });
    setPending(false);
    if (error) {
      setError("That email and password did not match an HR account. Check both and try again.");
      return;
    }
    router.replace("/dashboard");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="mt-8 grid gap-4 rounded-card border border-rule bg-sheet p-6 shadow-[0_1px_2px_rgb(21_32_51/0.05),0_8px_24px_-12px_rgb(21_32_51/0.12)]">
      <label className="grid gap-1.5">
        <span className="text-[13px] font-semibold">Work email</span>
        <input
          name="email" type="email" required autoComplete="username"
          className="h-10 rounded-control border border-rule-strong bg-sheet px-3 outline-none focus-visible:border-violet focus-visible:ring-2 focus-visible:ring-violet/25"
        />
      </label>
      <label className="grid gap-1.5">
        <span className="text-[13px] font-semibold">Password</span>
        <input
          name="password" type="password" required autoComplete="current-password"
          className="h-10 rounded-control border border-rule-strong bg-sheet px-3 outline-none focus-visible:border-violet focus-visible:ring-2 focus-visible:ring-violet/25"
        />
      </label>
      {error && (
        <p role="alert" className="rounded-control bg-uncertain-soft px-3 py-2 text-[13px] text-uncertain">
          {error}
        </p>
      )}
      <button
        type="submit" disabled={pending}
        className="mt-1 h-10 rounded-control bg-shell font-semibold text-white transition-colors hover:bg-ink disabled:opacity-60"
      >
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
