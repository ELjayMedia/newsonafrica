import type { Metadata } from "next";

import { HomeRail } from "@/components/home/home-rail";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Container } from "@/components/ui/container";
import { Input } from "@/components/ui/input";
import { RailLayout } from "@/components/ui/rail-layout";
import { Skeleton } from "@/components/ui/skeleton";
import { getHomeRailData } from "@/lib/dal/home-rail";

export const metadata: Metadata = {
  title: "Design System",
  description: "UI primitives and design tokens for News on Africa.",
};

const TYPE_SCALE = [
  "display-2xl",
  "display-xl",
  "display-lg",
  "heading-lg",
  "heading-md",
  "heading-sm",
  "body-lg",
  "body-md",
  "body-sm",
  "ui-md",
  "ui-sm",
] as const;

const SWATCHES = [
  "bg-background text-foreground border border-border",
  "bg-primary text-primary-foreground",
  "bg-secondary text-secondary-foreground",
  "bg-muted text-muted-foreground",
  "bg-accent text-accent-foreground",
  "bg-destructive text-destructive-foreground",
  "bg-success text-success-foreground",
  "bg-warning text-warning-foreground",
  "bg-info text-info-foreground",
] as const;

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <h2 className="heading-md">{title}</h2>
      {children}
    </section>
  );
}

export default async function DesignSystemPage() {
  const rail = await getHomeRailData();

  return (
    <Container className="space-y-12 py-12">
      <header>
        <h1 className="display-lg">Design System</h1>
        <p className="body-lg mt-2 text-muted-foreground">
          Tokens and reusable UI primitives (NOA-82). Toggle the theme in the header to review light
          and dark variants.
        </p>
      </header>

      <RailLayout rail={<HomeRail mostRead={rail.mostRead} latest={rail.latest} />}>
        <div className="space-y-12">
          <Section title="Colors">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {SWATCHES.map((cls) => (
                <div key={cls} className={`flex h-20 items-end rounded-lg p-3 ${cls}`}>
                  <span className="ui-sm">{cls.split(" ")[0]}</span>
                </div>
              ))}
            </div>
          </Section>

          <Section title="Typography">
            <div className="space-y-2">
              {TYPE_SCALE.map((name) => (
                <p key={name} className={name}>
                  {name}
                </p>
              ))}
            </div>
          </Section>

          <Section title="Buttons">
            <div className="flex flex-wrap items-center gap-3">
              <Button>Default</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="destructive">Destructive</Button>
              <Button variant="link">Link</Button>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button size="sm">Small</Button>
              <Button size="default">Default</Button>
              <Button size="lg">Large</Button>
              <Button disabled>Disabled</Button>
            </div>
          </Section>

          <Section title="Input">
            <div className="max-w-sm space-y-3">
              <Input placeholder="Search articles..." />
              <Input type="email" placeholder="you@example.com" />
              <Input placeholder="Disabled" disabled />
            </div>
          </Section>

          <Section title="Card">
            <div className="grid gap-4 sm:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Headline story</CardTitle>
                  <CardDescription>A reusable content card for article previews.</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="body-md text-muted-foreground">
                    Cards compose header, content, and footer slots.
                  </p>
                </CardContent>
                <CardFooter>
                  <Button size="sm" variant="outline">
                    Read more
                  </Button>
                </CardFooter>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Loading state</CardTitle>
                  <CardDescription>Skeleton primitives for async content.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-1/2" />
                </CardContent>
              </Card>
            </div>
          </Section>
        </div>
      </RailLayout>
    </Container>
  );
}
