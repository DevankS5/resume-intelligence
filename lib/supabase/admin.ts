// Service-role client: bypasses RLS, so it is used ONLY by trusted server code
// (route handlers after an auth check, and the local import CLI). Never import from a
// client component; the guard below fails loudly if a bundle ever tries.
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

if (typeof window !== "undefined") throw new Error("lib/supabase/admin must never run in the browser");

let cached: SupabaseClient | null = null;

export function adminClient(): SupabaseClient {
  if (cached) return cached;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("CONFIGURATION_ERROR: Supabase URL or service-role key missing");
  cached = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  return cached;
}

export const RESUME_BUCKET = "resumes";
