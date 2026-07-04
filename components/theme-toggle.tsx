"use client";

import * as React from "react";
import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";

/**
 * Light/dark theme toggle. Renders a stable placeholder until mounted to avoid
 * a hydration mismatch (the resolved theme is only known on the client).
 */
export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => setMounted(true), []);

  const isDark = resolvedTheme === "dark";

  return (
    <Button
      variant="outline"
      size="icon"
      aria-label="Toggle color theme"
      onClick={() => setTheme(isDark ? "light" : "dark")}
    >
      <span aria-hidden className="text-base leading-none">
        {mounted ? (isDark ? "☀" : "☾") : "◐"}
      </span>
    </Button>
  );
}
