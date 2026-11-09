import type { Metadata } from "next";
import { SignInForm } from "@/components/shared/sign-in-form";

export const metadata: Metadata = { title: "Sign in" };

export default function SignInPage() {
  return (
    <main className="grid min-h-dvh place-items-center bg-paper px-4 py-12">
      <div className="w-full max-w-[400px]">
        <div className="mb-8 flex items-center gap-3">
          <svg width="32" height="32" viewBox="0 0 32 32" aria-hidden="true">
            <rect width="32" height="32" rx="8" fill="var(--color-shell)" />
            <path d="M8 10h16M8 16h16M8 22h9" stroke="var(--color-shell-ink)" strokeWidth="2.4" strokeLinecap="round" />
            <circle cx="23" cy="22" r="3" fill="#8f6fd6" />
          </svg>
          <span className="text-[17px] font-bold tracking-tight">Resume Intelligence</span>
        </div>
        <h1 className="text-[26px] font-bold leading-tight tracking-[-0.01em] text-balance">Sign in to review candidates</h1>
        <p className="mt-2 text-ink-2">
          Access is limited to HR reviewers. Resume content is confidential; scores describe evidence in a
          resume, not a hiring decision.
        </p>
        <SignInForm />
      </div>
    </main>
  );
}
