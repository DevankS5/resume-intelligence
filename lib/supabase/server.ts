// Login was removed: the app is open and every server query uses the service-role client.
import { adminClient } from "@/lib/supabase/admin";

export async function serverClient() {
  return adminClient();
}
