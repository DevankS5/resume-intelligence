import { accountOf, getOverview } from "@/lib/data/queries";
import { Rail } from "@/components/shared/rail";
import { BallotStrip } from "@/components/dashboard/ballot-strip";

// No cookies are read any more, so force per-request rendering (data comes from the DB, not the build).
export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const account = accountOf(await getOverview());
  return (
    <div className="lg:flex">
      <Rail />
      <div className="ruled min-h-dvh min-w-0 flex-1">
        <BallotStrip a={account} />
        <main className="mx-auto max-w-[1400px] px-5 py-8 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
