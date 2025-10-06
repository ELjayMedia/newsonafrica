import { getAfricanHomeFeed } from "@/lib/aggregate";

export const dynamic = "force-static";
export const revalidate = 60;

export default async function Page() {
  const { hero, secondary, remainder } = await getAfricanHomeFeed();
  return (
    <main className="container mx-auto px-4">
      <section>{/* render hero[0] */}</section>
      <section>{/* render secondary */}</section>
      <section>{/* render remainder grid */}</section>
    </main>
  );
}
