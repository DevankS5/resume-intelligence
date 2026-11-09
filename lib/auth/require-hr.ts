// Server-side authorization (Security §4.3). Roles come from app_users, never from the browser.
import { serverClient } from "@/lib/supabase/server";

export type HrUser = { id: string; email: string | null; role: "ADMIN" | "HR_REVIEWER" };

export async function currentHrUser(): Promise<HrUser | null> {
  const supabase = await serverClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from("app_users").select("role").eq("user_id", user.id).maybeSingle();
  if (!data) return null;
  return { id: user.id, email: user.email ?? null, role: data.role };
}
