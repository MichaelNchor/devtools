import type { Config } from "tailwindcss";

export default {
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "var(--bg)", surface: "var(--surface)", "surface-2": "var(--surface-2)", inset: "var(--inset)",
        fg: "var(--fg)", "fg-2": "var(--fg-2)", "fg-muted": "var(--fg-muted)",
        border: "var(--border)", "border-2": "var(--border-2)",
        primary: "var(--primary)", "primary-hover": "var(--primary-hover)",
        "primary-strong": "var(--primary-strong)", "primary-tint": "var(--primary-tint)",
        accent: "var(--accent)", "accent-strong": "var(--accent-strong)", "accent-tint": "var(--accent-tint)",
        indigo: "var(--indigo)", "indigo-tint": "var(--indigo-tint)",
        up: "var(--up)", "up-solid": "var(--up-solid)", "up-tint": "var(--up-tint)",
        rose: "var(--rose)", "rose-solid": "var(--rose-solid)", "rose-tint": "var(--rose-tint)",
        warn: "var(--warn)", "warn-solid": "var(--warn-solid)", "warn-tint": "var(--warn-tint)",
        sky: "var(--sky)", "sky-solid": "var(--sky-solid)", "sky-tint": "var(--sky-tint)",
        destructive: "var(--destructive)",
        "on-primary": "var(--on-primary)",
        nav: "var(--nav)", "nav-fg": "var(--nav-fg)", "nav-fg-muted": "var(--nav-fg-muted)",
        "nav-line": "var(--nav-line)", "nav-hover": "var(--nav-hover)",
      },
      fontFamily: {
        sans: ["var(--font-body)"],
        ui: ["var(--font-ui)", "ui-monospace", "monospace"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      boxShadow: { xs: "var(--shadow-xs)", sm: "var(--shadow-sm)", md: "var(--shadow-md)", lg: "var(--shadow-lg)" },
      borderRadius: { sm: "4px", md: "5px", lg: "6px", xl: "8px" },
    },
  },
} satisfies Config;
