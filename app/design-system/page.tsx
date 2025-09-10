/**
 * Design System Page
 * Showcase page for the complete design system
 */

import { ComponentShowcase } from "@/components/design-system/ComponentShowcase"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Design System | News On Africa",
  description: "Comprehensive design system showcase for News On Africa platform",
}

export default function DesignSystemPage() {
  return <ComponentShowcase />
}
