// Login was removed: everyone is the admin.
export type HrUser = { id: string; email: string | null; role: "ADMIN" | "HR_REVIEWER" };

const ADMIN: HrUser = { id: "00000000-0000-0000-0000-000000000000", email: null, role: "ADMIN" };

export async function currentHrUser(): Promise<HrUser | null> {
  return ADMIN;
}
