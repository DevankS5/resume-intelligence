// Creates (or re-roles) an HR account. Run locally with the service-role key.
// Usage: npm run admin:create-user -- reviewer@example.com [ADMIN|HR_REVIEWER]
// A random password is generated and printed once; share it out of band and rotate it.
import { randomBytes } from "node:crypto";
import { adminClient } from "@/lib/supabase/admin";

async function main() {
  const email = process.argv[2];
  const role = (process.argv[3] ?? "HR_REVIEWER").toUpperCase();
  if (!email || !/^[^@\s]+@[^@\s]+$/.test(email)) throw new Error("Pass an email address.");
  if (role !== "ADMIN" && role !== "HR_REVIEWER") throw new Error("Role must be ADMIN or HR_REVIEWER.");
  const db = adminClient();

  const password = randomBytes(12).toString("base64url");
  let userId: string;
  const { data, error } = await db.auth.admin.createUser({ email, password, email_confirm: true });
  if (error) {
    const { data: list } = await db.auth.admin.listUsers();
    const existing = list?.users.find((u) => u.email === email);
    if (!existing) throw error;
    userId = existing.id;
    console.log(`User exists; password unchanged. Role set to ${role}.`);
  } else {
    userId = data.user.id;
    console.log(`Created ${email}\nPassword (shown once): ${password}`);
  }
  const { error: rErr } = await db.from("app_users").upsert({ user_id: userId, role });
  if (rErr) throw rErr;
  await db.from("audit_logs").insert({ event_type: "HR_USER_PROVISIONED", resource_type: "app_user", resource_id: userId, metadata: { role } });
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
