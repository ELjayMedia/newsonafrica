/**
 * Design Tokens Showcase
 * Visual representation of all design tokens
 */

"use client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Container, Grid, Stack } from "@/components/ui/grid"
import { TypographyH2, TypographyP, TypographyMuted } from "@/components/ui/typography"

export function DesignTokensShowcase() {
  const colorTokens = [
    { name: "Primary", class: "bg-primary", foreground: "text-primary-foreground" },
    { name: "Secondary", class: "bg-secondary", foreground: "text-secondary-foreground" },
    { name: "Success", class: "bg-success", foreground: "text-success-foreground" },
    { name: "Warning", class: "bg-warning", foreground: "text-warning-foreground" },
    { name: "Info", class: "bg-info", foreground: "text-info-foreground" },
    { name: "Destructive", class: "bg-destructive", foreground: "text-destructive-foreground" },
    { name: "Muted", class: "bg-muted", foreground: "text-muted-foreground" },
    { name: "Accent", class: "bg-accent", foreground: "text-accent-foreground" },
  ]

  const spacingTokens = [
    { name: "xs", value: "0.5rem", class: "w-2 h-2" },
    { name: "sm", value: "0.75rem", class: "w-3 h-3" },
    { name: "md", value: "1rem", class: "w-4 h-4" },
    { name: "lg", value: "1.5rem", class: "w-6 h-6" },
    { name: "xl", value: "2rem", class: "w-8 h-8" },
    { name: "2xl", value: "3rem", class: "w-12 h-12" },
    { name: "3xl", value: "4rem", class: "w-16 h-16" },
  ]

  const radiusTokens = [
    { name: "sm", class: "rounded-sm" },
    { name: "md", class: "rounded-md" },
    { name: "lg", class: "rounded-lg" },
    { name: "xl", class: "rounded-xl" },
    { name: "2xl", class: "rounded-2xl" },
    { name: "full", class: "rounded-full" },
  ]

  return (
    <Container size="xl">
      <Stack space={8}>
        <div>
          <TypographyH2 className="mb-4">Design Tokens</TypographyH2>
          <TypographyP>Visual representation of the design system's foundational tokens</TypographyP>
        </div>

        {/* Color Tokens */}
        <Card>
          <CardHeader>
            <CardTitle>Color Tokens</CardTitle>
            <CardDescription>Semantic color palette with light and dark mode support</CardDescription>
          </CardHeader>
          <CardContent>
            <Grid cols={4} gap={4}>
              {colorTokens.map((token) => (
                <div key={token.name} className="space-y-2">
                  <div className={`${token.class} ${token.foreground} p-4 rounded-lg text-center font-medium`}>
                    {token.name}
                  </div>
                  <TypographyMuted className="text-center text-xs">{token.class}</TypographyMuted>
                </div>
              ))}
            </Grid>
          </CardContent>
        </Card>

        {/* Spacing Tokens */}
        <Card>
          <CardHeader>
            <CardTitle>Spacing Tokens</CardTitle>
            <CardDescription>Consistent spacing scale based on 4px grid system</CardDescription>
          </CardHeader>
          <CardContent>
            <Grid cols={7} gap={4}>
              {spacingTokens.map((token) => (
                <div key={token.name} className="flex flex-col items-center space-y-2">
                  <div className={`${token.class} bg-primary rounded`} />
                  <div className="text-center">
                    <TypographyMuted className="text-xs font-medium">{token.name}</TypographyMuted>
                    <TypographyMuted className="text-xs">{token.value}</TypographyMuted>
                  </div>
                </div>
              ))}
            </Grid>
          </CardContent>
        </Card>

        {/* Border Radius Tokens */}
        <Card>
          <CardHeader>
            <CardTitle>Border Radius Tokens</CardTitle>
            <CardDescription>Consistent border radius scale for component styling</CardDescription>
          </CardHeader>
          <CardContent>
            <Grid cols={6} gap={4}>
              {radiusTokens.map((token) => (
                <div key={token.name} className="flex flex-col items-center space-y-2">
                  <div className={`w-16 h-16 bg-primary ${token.class}`} />
                  <TypographyMuted className="text-xs font-medium">{token.name}</TypographyMuted>
                </div>
              ))}
            </Grid>
          </CardContent>
        </Card>

        {/* Typography Scale */}
        <Card>
          <CardHeader>
            <CardTitle>Typography Scale</CardTitle>
            <CardDescription>Responsive typography with optimal line heights and spacing</CardDescription>
          </CardHeader>
          <CardContent>
            <Stack space={4}>
              <div className="text-5xl font-bold">Display XL - 48px</div>
              <div className="text-4xl font-bold">Display LG - 36px</div>
              <div className="text-3xl font-bold">Heading 1 - 30px</div>
              <div className="text-2xl font-semibold">Heading 2 - 24px</div>
              <div className="text-xl font-semibold">Heading 3 - 20px</div>
              <div className="text-lg font-semibold">Heading 4 - 18px</div>
              <div className="text-base">Body Text - 16px</div>
              <div className="text-sm text-muted-foreground">Small Text - 14px</div>
              <div className="text-xs text-muted-foreground">Caption - 12px</div>
            </Stack>
          </CardContent>
        </Card>
      </Stack>
    </Container>
  )
}
