import { redirect } from "next/navigation";
import { currentHrUser } from "@/lib/auth/require-hr";
import { accountOf, getOverview } from "@/lib/data/queries";
import { Rail } from "@/components/shared/rail";
import { BallotStrip } from "@/components/dashboard/ballot-strip";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await currentHrUser();
  if (!user) redirect("/sign-in");
  const account = accountOf(await getOverview());
  return (
    <div className="lg:flex">
      <Rail email={user.email} />
      <div className="ruled min-h-dvh min-w-0 flex-1">
        <BallotStrip a={account} />
        <main className="mx-auto max-w-[1400px] px-5 py-8 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
