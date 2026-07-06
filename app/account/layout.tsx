import { HomeRail } from "@/components/home/home-rail";
import { Container } from "@/components/ui/container";
import { RailLayout } from "@/components/ui/rail-layout";
import { requireUser } from "@/lib/auth/session";
import { getHomeRailData } from "@/lib/dal/home-rail";

/**
 * Protected account area (NOA-99). `requireUser()` redirects signed-out
 * visitors to /login with a return path; every page below /account inherits
 * the guard.
 */
export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const [, rail] = await Promise.all([requireUser("/account/profile"), getHomeRailData()]);

  return (
    <Container className="py-10">
      <RailLayout rail={<HomeRail mostRead={rail.mostRead} latest={rail.latest} />}>
        <div className="mx-auto w-full max-w-2xl lg:mx-0">{children}</div>
      </RailLayout>
    </Container>
  );
}
