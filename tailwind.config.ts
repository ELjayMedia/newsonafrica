import type { Config } from "tailwindcss"
import typography from "@tailwindcss/typography"

const config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./contexts/**/*.{js,ts,jsx,tsx,mdx}",
    "./hooks/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
    "./services/**/*.{js,ts,jsx,tsx,mdx}",
    "./utils/**/*.{js,ts,jsx,tsx,mdx}",
    "./config/**/*.{js,ts,jsx,tsx,mdx}",
    "./supabase/**/*.{js,ts,jsx,tsx,mdx}",
    "./docs/**/*.{md,mdx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1320px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
        chart: {
          "1": "hsl(var(--chart-1))",
          "2": "hsl(var(--chart-2))",
          "3": "hsl(var(--chart-3))",
          "4": "hsl(var(--chart-4))",
          "5": "hsl(var(--chart-5))",
        },
        // Brand green scale — the signature colour (brand, links, CTAs)
        brand: {
          50: "#E8F6EE",
          200: "#A6E2BE",
          500: "#1BB257", // CTA
          600: "#15994A", // Primary
          900: "#0B5E2D",
          DEFAULT: "#15994A",
          foreground: "#FFFFFF",
        },
        // Functional — used sparingly, never decorative
        live: {
          DEFAULT: "#D62828", // Breaking / Live
          foreground: "#FFFFFF",
        },
        sponsored: {
          DEFAULT: "#A9791A", // Sponsored / paid partnership (gold)
          foreground: "#FFFFFF",
        },
        ad: {
          DEFAULT: "#F2F1EE", // Ad surface
          foreground: "#8A8A8A", // Ad label text
        },
        success: {
          DEFAULT: "#15994A",
          foreground: "hsl(0 0% 100%)",
          light: "#1BB257",
          dark: "#0B5E2D",
        },
        warning: {
          DEFAULT: "#A9791A",
          foreground: "hsl(0 0% 100%)",
          light: "hsl(40 73% 48%)",
          dark: "hsl(40 73% 30%)",
        },
        info: {
          DEFAULT: "#1E6FD6",
          foreground: "hsl(0 0% 100%)",
          light: "hsl(214 75% 58%)",
          dark: "hsl(214 75% 38%)",
        },
        surface: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
          elevated: "hsl(var(--popover))",
          "elevated-foreground": "hsl(var(--popover-foreground))",
          muted: "hsl(var(--muted))",
          "muted-foreground": "hsl(var(--muted-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        xl: "calc(var(--radius) + 4px)",
      },
      fontFamily: {
        // Source Sans 3 — body & decks
        sans: ["var(--font-source-sans)", "Source Sans 3", "system-ui", "sans-serif"],
        // Archivo — display, headlines & UI
        display: ["var(--font-archivo)", "Archivo", "system-ui", "sans-serif"],
      },
      fontSize: {
        // Display sizes - hero sections & large headings (Archivo) — scale tops out at 64px
        "display-2xl": ["clamp(2.625rem, 7vw, 4rem)", { lineHeight: "1.05", letterSpacing: "-0.03em", fontWeight: "800" }],
        "display-xl": ["clamp(2.125rem, 5.5vw, 3.125rem)", { lineHeight: "1.08", letterSpacing: "-0.025em", fontWeight: "700" }],
        "display-lg": ["clamp(1.75rem, 4.5vw, 2.625rem)", { lineHeight: "1.12", letterSpacing: "-0.02em", fontWeight: "700" }],
        // Heading sizes - page & section titles (Archivo)
        "heading-lg": ["1.875rem", { lineHeight: "1.2", letterSpacing: "-0.015em", fontWeight: "700" }], // Headline 30
        "heading-md": ["1.5rem", { lineHeight: "1.25", letterSpacing: "-0.01em", fontWeight: "600" }],
        "heading-sm": ["1.25rem", { lineHeight: "1.3", letterSpacing: "0em", fontWeight: "600" }], // Card title 20
        // Body sizes - main content (Source Sans 3) — base reading size 17px
        "body-lg": ["1.0625rem", { lineHeight: "1.6", letterSpacing: "0em", fontWeight: "400" }], // Body 17
        "body-md": ["0.9375rem", { lineHeight: "1.6", letterSpacing: "0em", fontWeight: "400" }],
        "body-sm": ["0.8125rem", { lineHeight: "1.55", letterSpacing: "0em", fontWeight: "400" }],
        // UI sizes - labels, captions, badges, eyebrows
        "ui-md": ["0.8125rem", { lineHeight: "1.4", letterSpacing: "0em", fontWeight: "500" }],
        "ui-sm": ["0.75rem", { lineHeight: "1.4", letterSpacing: "0.06em", fontWeight: "600" }], // Eyebrow 12
      },
      typography: ({ theme }) => ({
        DEFAULT: {
          css: {
            "--tw-prose-body": theme("colors.foreground"),
            "--tw-prose-headings": theme("colors.foreground"),
            "--tw-prose-lead": theme("colors.muted.foreground"),
            "--tw-prose-links": theme("colors.primary.DEFAULT"),
            "--tw-prose-bold": theme("colors.foreground"),
            "--tw-prose-counters": theme("colors.muted.foreground"),
            "--tw-prose-bullets": theme("colors.muted.foreground"),
            "--tw-prose-hr": theme("colors.border"),
            "--tw-prose-quotes": theme("colors.foreground"),
            "--tw-prose-quote-borders": theme("colors.primary.DEFAULT"),
            "--tw-prose-captions": theme("colors.muted.foreground"),
            "--tw-prose-code": theme("colors.foreground"),
            "--tw-prose-pre-code": theme("colors.foreground"),
            "--tw-prose-pre-bg": theme("colors.muted.DEFAULT"),
            "--tw-prose-th-borders": theme("colors.border"),
            "--tw-prose-td-borders": theme("colors.border"),
            color: "hsl(var(--foreground))",
            a: {
              color: "hsl(var(--primary))",
              fontWeight: "500",
              textDecoration: "underline",
              textDecorationColor: "hsl(var(--primary))",
            },
            hr: {
              borderColor: "hsl(var(--border))",
            },
            blockquote: {
              color: "hsl(var(--foreground))",
              borderLeftColor: "hsl(var(--primary))",
            },
            code: {
              color: "hsl(var(--foreground))",
            },
          },
        },
        invert: {
          css: {
            "--tw-prose-body": theme("colors.foreground"),
            "--tw-prose-headings": theme("colors.foreground"),
            "--tw-prose-lead": theme("colors.muted.foreground"),
            "--tw-prose-links": theme("colors.primary.DEFAULT"),
            "--tw-prose-bold": theme("colors.foreground"),
            "--tw-prose-counters": theme("colors.muted.foreground"),
            "--tw-prose-bullets": theme("colors.muted.foreground"),
            "--tw-prose-hr": theme("colors.border"),
            "--tw-prose-quotes": theme("colors.foreground"),
            "--tw-prose-quote-borders": theme("colors.primary.DEFAULT"),
            "--tw-prose-captions": theme("colors.muted.foreground"),
            "--tw-prose-code": theme("colors.foreground"),
            "--tw-prose-pre-code": theme("colors.foreground"),
            "--tw-prose-pre-bg": theme("colors.muted.DEFAULT"),
            "--tw-prose-th-borders": theme("colors.border"),
            "--tw-prose-td-borders": theme("colors.border"),
          },
        },
      }),
    },
  },
  plugins: [typography],
} satisfies Config

export default config
