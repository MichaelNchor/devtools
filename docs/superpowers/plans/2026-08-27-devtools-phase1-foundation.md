# DevTools Phase 1, Plan 1 — Foundation, Shell & JSON Compare

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the DevTools application shell — design tokens, tool registry, shared tool-page pattern, and all four workspace behaviours — and prove it end to end by shipping JSON Compare, the flagship tool.

**Architecture:** A Next.js 15 App Router site with no server, no database, and no network calls. A single registry array drives the sidebar, the ⌘K palette, the dashboard, and one dynamic `[slug]` route. Every tool's logic lives in `lib/tools/*.ts` as pure functions with zero React imports, so all sixteen transforms are unit-testable in Node; the React layer only renders their output.

**Tech Stack:** Next.js 15 (App Router), React 19, TypeScript 5+ (strict), Tailwind CSS 3, lucide-react, Vitest (node environment), JetBrains Mono + Nunito via `next/font/google`.

**Spec:** `docs/superpowers/specs/2026-08-27-devtools-design.md`

**Scope of this plan:** Tasks 1–17 below. The remaining fifteen tools are Plans 2 and 3, written against the interfaces this plan actually ships.

## Global Constraints

Copied verbatim from the spec. Every task's requirements implicitly include this section.

- **No network.** No `fetch`, no XHR, no WebSocket, no analytics, no external asset host except Google Fonts via `next/font`. A reviewer must be able to grep for `fetch(` and find nothing outside comments.
- **The Pure Logic Rule.** `lib/tools/*.ts` exports plain functions taking plain data and returning plain data. No React imports, no `window`, no `document`. WebCrypto (`globalThis.crypto`) is the only permitted platform API.
- **Failures return, never throw.** Any transform that can fail on user input returns `ToolResult<T>` = `{ ok: true; value: T } | { ok: false; error: ToolError }`, where `ToolError` is `{ message: string; line?: number; column?: number }`. Line and column are populated wherever the parser can supply them.
- **The One Blue Rule.** `--primary` appears on at most ~10% of any screen. A row action repeated down a list is a ghost button, never a filled one.
- **The Status Escape Rule.** Status colour always pairs with a label or a glyph. Colour alone never carries meaning.
- **No gradients** except the single sanctioned `.drench` feature card. **No coloured side-stripe borders** on cards, rows, or alerts.
- **Mono-forward.** JetBrains Mono (`font-ui`) carries page titles, headings, rail labels, eyebrows, table cells, and all I/O. Nunito (`font-sans`) is prose only: blurbs, help text, empty states, error messages.
- **WCAG AA in both themes:** 4.5:1 body text, 3:1 controls. `prefers-reduced-motion` honoured globally.
- **Storage is best-effort.** Every `localStorage` read and write is wrapped in try/catch and returns a default on failure. The app must render correctly when site data is blocked.
- **Secrets never persist.** Tools with `handlesSecrets: true` are never written to `localStorage` and never encode state into the URL.
- **Slugs are permanent.** Once a tool ships, its slug never changes.

---

### Task 1: Project scaffold, token layer, and root shell

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.mjs`, `postcss.config.mjs`, `tailwind.config.ts`, `vitest.config.ts`
- Create: `app/globals.css`, `app/layout.tsx`, `app/page.tsx`
- Create: `tests/setup/local-storage.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: the `@/*` path alias resolving to the repo root (used by every later task); Tailwind utilities `font-ui`, `font-sans`, `font-mono`, and the colour utilities `bg-bg`, `bg-surface`, `text-fg`, `text-fg-muted`, `border-border`, `bg-primary`, `text-primary`, `bg-nav`, `text-nav-fg`, plus `shadow-xs|sm|md|lg` and radii `rounded-sm|md|lg|xl`.

- [ ] **Step 1: Initialise the package**

```bash
cd /Users/michaelnchor/Desktop/devtools
npm init -y
npm pkg set name="devtools" private=true version="1.0.0" description="Local-first developer utilities"
npm pkg set scripts.dev="next dev" scripts.build="next build" scripts.start="next start" scripts.test="vitest run" scripts.typecheck="tsc --noEmit"
npm i next@^15.5.22 react@^19.2.8 react-dom@^19.2.8 lucide-react@^1.27.0
npm i -D typescript@^6.0.3 @types/node@^26.1.2 @types/react@^19.2.17 @types/react-dom@^19.2.17 tailwindcss@^3.4.19 postcss@^8.5.23 autoprefixer@^10.5.4 vitest@^4.1.10
```

- [ ] **Step 2: Write the TypeScript config**

Create `tsconfig.json`. `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes` are deliberate — the diff engine indexes arrays constantly and these catch the mistakes that produce `undefined` in output.

```json
{
  "compilerOptions": {
    "target": "esnext",
    "module": "esnext",
    "moduleResolution": "bundler",
    "lib": ["dom", "dom.iterable", "esnext"],
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "jsx": "preserve",
    "verbatimModuleSyntax": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "allowJs": true,
    "noEmit": true,
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./*"] }
  },
  "include": ["next-env.d.ts", ".next/types/**/*.ts", "**/*.ts", "**/*.tsx"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 3: Write the build configs**

`next.config.mjs`:

```js
/** @type {import('next').NextConfig} */
export default { reactStrictMode: true };
```

`postcss.config.mjs`:

```js
export default { plugins: { tailwindcss: {}, autoprefixer: {} } };
```

`vitest.config.ts` — the `oxc` override is required because `tsconfig.json` sets `jsx: "preserve"` for Next's compiler, which otherwise stops the test runner stripping JSX:

```ts
import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname) } },
  oxc: { jsx: { runtime: "automatic" } },
  test: {
    environment: "node",
    exclude: ["**/node_modules/**", "**/.next/**"],
  },
});
```

- [ ] **Step 4: Write the Tailwind config**

`tailwind.config.ts`. Every colour is a `var()` reference so the `.dark` block in `globals.css` is the only place a theme is defined. `font-ui` is the named structural layer from the spec — it resolves to mono today and can be retuned in one place.

```ts
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
```

- [ ] **Step 5: Write the token layer**

Create `app/globals.css`. These values are ported from `job-copilot/app/globals.css` — do not invent new ones. Every token defined in `:root` must also appear in `.dark`; Task 1 Step 8 tests that invariant.

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

/* Cool grey canvas, white cards lifted on a blue-grey shadow, and a near-black
   rail holding the left edge. Blue carries every commitment. Status is carried
   by fill AND by a glyph or label, never by hue alone. */
:root {
  --bg: #F6F7FB;
  --surface: #FFFFFF;
  --surface-2: #EDEFF3;
  --inset: #F6F7FB;

  --fg: #313A46;
  --fg-2: #4C4C5C;
  --fg-muted: #616B7A;
  --border: #E7E9EB;
  --border-2: #EDEFF3;

  --primary: #236DC9;
  --primary-hover: #1E5DAB;
  --primary-strong: #1E5DAB;
  --primary-tint: #E8F0FB;

  --accent: #7B70EF;
  --accent-strong: #4A3FC7;
  --accent-tint: #EEEDFD;
  --indigo: #4A3FC7;
  --indigo-tint: #EEEDFD;

  /* Solid fills a dot, a bar or a gutter; the deep form is the only one
     allowed to carry a word. */
  --up-solid: #02BC9C;  --up: #06715F;  --up-tint: #E0F7F2;
  --rose-solid: #F7577E; --rose: #C42A50; --rose-tint: #FDE9EE;
  --warn-solid: #F9BF59; --warn: #7A5A10; --warn-tint: #FEF5E3;
  --sky-solid: #5BC3E1;  --sky: #0E6F8A; --sky-tint: #E4F5FA;
  --destructive: #C42A50;

  --on-primary: #FFFFFF;

  /* The rail does not invert with the theme. Written out in both blocks
     rather than hoisted, because a token that happens to match is still a
     themed token and the parity test wants it in both. */
  --nav: #06070A;
  --nav-fg: #FFFFFF;
  --nav-fg-muted: rgba(255, 255, 255, .58);
  --nav-line: rgba(255, 255, 255, .07);
  --nav-hover: rgba(255, 255, 255, .06);

  --ring: #236DC9;

  --shadow-xs: 0 1px 2px 0 rgba(130, 143, 163, .12);
  --shadow-sm: 0 1px 4px 0 rgba(130, 143, 163, .15);
  --shadow-md: 0 2px 8px 0 rgba(130, 143, 163, .18);
  --shadow-lg: 0 8px 24px -6px rgba(130, 143, 163, .28);

  /* Syntax highlighting. Each is a reference to an existing themed token, so
     highlighting can never drift from the palette. */
  --code-key: var(--primary);
  --code-string: var(--up);
  --code-number: var(--indigo);
  --code-atom: var(--warn);
  --code-punct: var(--fg-muted);
  --code-comment: var(--fg-muted);
  --code-keyword: var(--accent-strong);
}

.dark {
  /* The canvas drops below the card rather than the card rising, so the same
     shadow vocabulary still reads. Each hue keeps its solid form and gains a
     lighter text form: the deep labels that clear AA on white are 2:1 on a
     dark card, so they swap rather than carry over. */
  --bg: #08090C;
  --surface: #101217;
  --surface-2: #1A1D24;
  --inset: #0B0C10;

  --fg: #E9EBEF;
  --fg-2: #B6BAC4;
  --fg-muted: #979DAB;
  --border: #21252D;
  --border-2: #171A20;

  --primary: #4A8EE8;
  --primary-hover: #6BA4EF;
  --primary-strong: #8FBAF3;
  --primary-tint: rgba(74, 142, 232, .16);

  --accent: #9A91F4;
  --accent-strong: #B6AFF8;
  --accent-tint: rgba(154, 145, 244, .16);
  --indigo: #B6AFF8;
  --indigo-tint: rgba(154, 145, 244, .16);

  --up-solid: #02BC9C;  --up: #45D9BB;  --up-tint: rgba(2, 188, 156, .16);
  --rose-solid: #F7577E; --rose: #FF8DA8; --rose-tint: rgba(247, 87, 126, .16);
  --warn-solid: #F9BF59; --warn: #F0C67A; --warn-tint: rgba(249, 191, 89, .16);
  --sky-solid: #5BC3E1;  --sky: #7FD3EC; --sky-tint: rgba(91, 195, 225, .16);
  --destructive: #FF8DA8;

  --on-primary: #0E1116;

  /* Identical to :root — see the note there. */
  --nav: #06070A;
  --nav-fg: #FFFFFF;
  --nav-fg-muted: rgba(255, 255, 255, .58);
  --nav-line: rgba(255, 255, 255, .07);
  --nav-hover: rgba(255, 255, 255, .06);

  --ring: #4A8EE8;

  /* On a dark canvas a card cannot be lifted by lightness alone, so the
     shadows deepen and a hairline comes back to draw the edge. */
  --shadow-xs: 0 0 0 1px rgba(255, 255, 255, .04);
  --shadow-sm: 0 0 0 1px rgba(255, 255, 255, .05), 0 1px 4px 0 rgba(0, 0, 0, .40);
  --shadow-md: 0 0 0 1px rgba(255, 255, 255, .05), 0 2px 10px 0 rgba(0, 0, 0, .50);
  --shadow-lg: 0 0 0 1px rgba(255, 255, 255, .05), 0 10px 30px -8px rgba(0, 0, 0, .65);

  --code-key: var(--primary);
  --code-string: var(--up);
  --code-number: var(--indigo);
  --code-atom: var(--warn);
  --code-punct: var(--fg-muted);
  --code-comment: var(--fg-muted);
  --code-keyword: var(--accent);
}

body {
  background: var(--bg);
  color: var(--fg);
}

/* Disabling contextual alternates keeps mono ligatures out of payloads: an
   arrow in a JSON string must render as the two characters it is. */
.font-ui, .font-mono {
  font-feature-settings: "calt" 0;
}

/* Machine-read facts sit on tabular figures so columns of numbers align. */
.tabular {
  font-variant-numeric: tabular-nums;
}

.eyebrow {
  font-family: var(--font-ui), ui-monospace, monospace;
  font-size: 10.5px;
  font-weight: 600;
  letter-spacing: .14em;
  text-transform: uppercase;
  color: var(--fg-muted);
}

:root {
  --ease-out-quart: cubic-bezier(.25, 1, .5, 1);
  --ease-out-expo: cubic-bezier(.16, 1, .3, 1);
}

* {
  scrollbar-width: thin;
  scrollbar-color: var(--border) transparent;
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: .01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: .01ms !important;
    scroll-behavior: auto !important;
  }
}
```

- [ ] **Step 6: Write the root layout**

Create `app/layout.tsx`. The theme script must be a blocking inline script in `<head>`: any React effect runs after the first frame is already painted, so a dark-theme user would see a white flash. `--font-body` is bound to Nunito and `--font-ui` to mono, which is the inversion the spec's mono-forward rule describes.

```tsx
import type { Metadata } from "next";
import { Nunito, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const nunito = Nunito({ subsets: ["latin"], variable: "--font-body" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: "DevTools",
  description: "Local-first developer utilities. Nothing leaves your browser.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/*
          An explicit choice wins. With nothing stored we follow the operating
          system, which is what a visitor who has never touched the toggle is
          asking for.
        */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              'try{var t=localStorage.theme;' +
              'if(t==="dark"||(!t&&matchMedia("(prefers-color-scheme: dark)").matches))' +
              'document.documentElement.classList.add("dark")}catch(e){}',
          }}
        />
      </head>
      <body
        style={{ ["--font-ui" as string]: "var(--font-mono)" }}
        className={`${nunito.variable} ${mono.variable} font-sans`}
      >
        {children}
      </body>
    </html>
  );
}
```

- [ ] **Step 7: Write a temporary home page**

Create `app/page.tsx`. Task 11 replaces this with the real dashboard; it exists now so `npm run dev` has something to serve and the tokens can be eyeballed.

```tsx
export default function Home() {
  return (
    <main className="mx-auto max-w-3xl p-10">
      <p className="eyebrow">Scaffold</p>
      <h1 className="mt-2 font-ui text-[1.375rem] font-bold tracking-[-0.01em] text-fg">DevTools</h1>
      <p className="mt-2 max-w-prose text-sm text-fg-muted">
        Local-first developer utilities. Nothing leaves your browser.
      </p>
      <div className="mt-6 rounded-lg bg-surface p-5 shadow-sm">
        <p className="font-ui text-[13px] text-fg">Token check: this card is surface on bg.</p>
      </div>
    </main>
  );
}
```

- [ ] **Step 8: Write the failing token-parity test**

Create `tests/tokens.test.ts`. This is the one guard that a token added to light mode is not forgotten in dark mode — the failure mode is invisible in light mode and unreadable in dark.

```ts
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it, expect } from "vitest";

function tokensIn(block: string): string[] {
  return [...block.matchAll(/^\s*(--[a-z0-9-]+):/gm)].map((m) => m[1]!).sort();
}

function blockFor(css: string, selector: string): string {
  const start = css.indexOf(`${selector} {`);
  expect(start, `${selector} block not found`).toBeGreaterThan(-1);
  return css.slice(start, css.indexOf("\n}", start));
}

describe("theme tokens", () => {
  const css = readFileSync(path.resolve(__dirname, "../app/globals.css"), "utf8");

  it("defines every :root token in .dark as well", () => {
    const light = new Set(tokensIn(blockFor(css, ":root")));
    const dark = new Set(tokensIn(blockFor(css, ".dark")));
    // --ease-* live in a second :root block that carries no themed values.
    const missing = [...light].filter((t) => !dark.has(t) && !t.startsWith("--ease"));
    expect(missing).toEqual([]);
  });

  it("uses no pure black or pure white as a surface", () => {
    expect(css).not.toMatch(/--bg:\s*#(000000|fff|ffffff)\b/i);
  });
});
```

- [ ] **Step 9: Run the test to verify it fails, then passes**

Run: `npx vitest run tests/tokens.test.ts`
Expected: PASS if Step 5 was written correctly. If it FAILS with a non-empty `missing` array, add the named tokens to `.dark` — do not delete them from `:root`.

- [ ] **Step 10: Verify the app boots**

```bash
npm run dev
```

Open `http://localhost:3000`. Expected: cool grey page, white card with a visible soft shadow, mono heading, Nunito body text. Toggle your OS to dark mode and hard-reload — the page must come up dark with **no white flash**. Then:

```bash
npm run typecheck
```

Expected: no errors.

- [ ] **Step 11: Commit**

```bash
git add -A
git commit -m "feat: scaffold Next.js app with ported token layer and mono-forward typography"
```

---

### Task 2: Safe localStorage wrapper

**Files:**
- Create: `lib/storage.ts`
- Test: `tests/storage.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `readJson<T>(key: string, fallback: T): T`
  - `writeJson(key: string, value: unknown): void`
  - `remove(key: string): void`
  - `KEYS: { favourites: string; recents: string; rail: string; theme: string; tool(slug: string): string }`

- [ ] **Step 1: Write the failing test**

Create `tests/storage.test.ts`. The throwing stub is the point of this task: Safari private mode and browsers with site data blocked throw on *access*, not just on write, and an unguarded read crashes the whole render.

```ts
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { readJson, writeJson, remove, KEYS } from "@/lib/storage";

function installStorage(impl: Partial<Storage>) {
  vi.stubGlobal("localStorage", impl as Storage);
}

function memoryStorage() {
  const map = new Map<string, string>();
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
    removeItem: (k: string) => void map.delete(k),
  } as Partial<Storage>;
}

describe("storage", () => {
  beforeEach(() => installStorage(memoryStorage()));
  afterEach(() => vi.unstubAllGlobals());

  it("round-trips a value", () => {
    writeJson("k", { a: 1 });
    expect(readJson("k", null)).toEqual({ a: 1 });
  });

  it("returns the fallback for a missing key", () => {
    expect(readJson("nope", "default")).toBe("default");
  });

  it("returns the fallback for malformed stored JSON", () => {
    localStorage.setItem("bad", "{not json");
    expect(readJson("bad", 42)).toBe(42);
  });

  it("returns the fallback when localStorage access throws", () => {
    installStorage({
      get getItem(): never { throw new DOMException("blocked"); },
    } as unknown as Partial<Storage>);
    expect(readJson("k", "safe")).toBe("safe");
  });

  it("swallows write failures", () => {
    installStorage({
      getItem: () => null,
      setItem: () => { throw new DOMException("QuotaExceeded"); },
      removeItem: () => {},
    });
    expect(() => writeJson("k", { big: true })).not.toThrow();
  });

  it("does not throw when localStorage is entirely absent", () => {
    vi.stubGlobal("localStorage", undefined);
    expect(readJson("k", "safe")).toBe("safe");
    expect(() => writeJson("k", 1)).not.toThrow();
    expect(() => remove("k")).not.toThrow();
  });

  it("namespaces tool keys under devtools:", () => {
    expect(KEYS.tool("json-compare")).toBe("devtools:tool:json-compare");
    expect(KEYS.favourites).toBe("devtools:favourites");
    // The pre-paint script in app/layout.tsx reads a bare `theme`, so this one
    // key must NOT be namespaced.
    expect(KEYS.theme).toBe("theme");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/storage.test.ts`
Expected: FAIL — `Failed to resolve import "@/lib/storage"`.

- [ ] **Step 3: Write the implementation**

Create `lib/storage.ts`:

```ts
/**
 * Every read and write is guarded. Private-mode browsers and browsers with
 * site data blocked throw on access rather than returning null, and an
 * unguarded read in a component body takes the whole render down with it.
 *
 * Nothing here reaches the network. This module is the only place in the app
 * that touches localStorage.
 */

export const KEYS = {
  // Bare, not namespaced: the blocking script in app/layout.tsx reads this
  // before any bundle has loaded and cannot import from here.
  theme: "theme",
  favourites: "devtools:favourites",
  recents: "devtools:recents",
  rail: "devtools:rail",
  tool: (slug: string) => `devtools:tool:${slug}`,
} as const;

function store(): Storage | null {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    return null;
  }
}

export function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = store()?.getItem(key);
    if (raw == null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    // Malformed JSON, a blocked store, or a getter that throws. A stale or
    // corrupt value is never worth a crash — the caller gets its default.
    return fallback;
  }
}

export function writeJson(key: string, value: unknown): void {
  try {
    store()?.setItem(key, JSON.stringify(value));
  } catch {
    // Quota exceeded or writes blocked. Persistence is a convenience here,
    // never a correctness requirement, so failing silently is correct.
  }
}

export function remove(key: string): void {
  try {
    store()?.removeItem(key);
  } catch {
    // See writeJson.
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run tests/storage.test.ts`
Expected: PASS, 7 tests.

- [ ] **Step 5: Commit**

```bash
git add lib/storage.ts tests/storage.test.ts
git commit -m "feat: add guarded localStorage wrapper"
```

---

### Task 3: URL-hash share codec

**Files:**
- Create: `lib/share.ts`
- Test: `tests/share.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `SHARE_LIMIT: 8192`
  - `encodeShare(state: unknown): string | null` — base64url payload, or `null` when it would exceed `SHARE_LIMIT`
  - `decodeShare<T>(payload: string): T | null`
  - `readShareFromHash<T>(hash: string): T | null` — accepts a full `#s=...` hash
  - `SHARE_PREFIX: "#s="`

- [ ] **Step 1: Write the failing test**

Create `tests/share.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { encodeShare, decodeShare, readShareFromHash, SHARE_LIMIT, SHARE_PREFIX } from "@/lib/share";

describe("share codec", () => {
  it("round-trips a representative tool state", () => {
    const state = { left: '{"a":1}', right: '{"a":2}', options: { ignoreKeyOrder: true } };
    const payload = encodeShare(state);
    expect(payload).toBeTypeOf("string");
    expect(decodeShare(payload!)).toEqual(state);
  });

  it("round-trips non-ASCII without mangling it", () => {
    const state = { text: "héllo — ünicode 中文 🎉" };
    expect(decodeShare(encodeShare(state)!)).toEqual(state);
  });

  it("emits URL-safe base64 with no padding", () => {
    const payload = encodeShare({ q: "??>>??" })!;
    expect(payload).not.toMatch(/[+/=]/);
  });

  it("returns null rather than a truncated link when over the limit", () => {
    expect(encodeShare({ blob: "x".repeat(SHARE_LIMIT * 2) })).toBeNull();
  });

  it("accepts a payload exactly at the limit", () => {
    // Grow until just under, then assert the boundary is inclusive.
    let size = 1000;
    let payload = encodeShare({ blob: "x".repeat(size) });
    while (payload && payload.length < SHARE_LIMIT - 20) {
      size += 500;
      payload = encodeShare({ blob: "x".repeat(size) });
    }
    expect(payload).not.toBeNull();
    expect(payload!.length).toBeLessThanOrEqual(SHARE_LIMIT);
  });

  it("decodes malformed input to null rather than throwing", () => {
    expect(decodeShare("!!!not-base64!!!")).toBeNull();
    expect(decodeShare("")).toBeNull();
    // Valid base64 that is not valid JSON.
    expect(decodeShare("bm90IGpzb24")).toBeNull();
  });

  it("reads a full location hash", () => {
    const payload = encodeShare({ a: 1 })!;
    expect(readShareFromHash(`${SHARE_PREFIX}${payload}`)).toEqual({ a: 1 });
  });

  it("ignores a hash that is not a share payload", () => {
    expect(readShareFromHash("#section-2")).toBeNull();
    expect(readShareFromHash("")).toBeNull();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/share.test.ts`
Expected: FAIL — `Failed to resolve import "@/lib/share"`.

- [ ] **Step 3: Write the implementation**

Create `lib/share.ts`. `btoa` operates on binary strings, so UTF-8 has to be encoded first — passing a string with any character above U+00FF straight to `btoa` throws.

```ts
/**
 * Tool state encoded into the URL hash, so a link can carry a payload.
 *
 * Two deliberate limits:
 *   - Only tools with `handlesSecrets: false` may call this. A share button on
 *     the JWT or Hash tool is an invitation to leak a token.
 *   - Over SHARE_LIMIT characters we return null and the caller disables the
 *     button. Long URLs are truncated unpredictably by mail clients and chat
 *     apps, and silently producing a broken link is worse than refusing.
 */

export const SHARE_LIMIT = 8192;
export const SHARE_PREFIX = "#s=";

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(payload: string): Uint8Array {
  const padded = payload.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(padded + "=".repeat((4 - (padded.length % 4)) % 4));
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

export function encodeShare(state: unknown): string | null {
  try {
    const payload = toBase64Url(new TextEncoder().encode(JSON.stringify(state)));
    return payload.length > SHARE_LIMIT ? null : payload;
  } catch {
    return null;
  }
}

export function decodeShare<T>(payload: string): T | null {
  if (!payload) return null;
  try {
    return JSON.parse(new TextDecoder().decode(fromBase64Url(payload))) as T;
  } catch {
    // A hand-edited or clipped link. Opening the tool empty beats an error.
    return null;
  }
}

export function readShareFromHash<T>(hash: string): T | null {
  if (!hash.startsWith(SHARE_PREFIX)) return null;
  return decodeShare<T>(hash.slice(SHARE_PREFIX.length));
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run tests/share.test.ts`
Expected: PASS, 8 tests.

Note: `btoa`/`atob` are global in Node 16+, so these run in the `node` test environment without a DOM.

- [ ] **Step 5: Commit**

```bash
git add lib/share.ts tests/share.test.ts
git commit -m "feat: add URL-hash share codec with size ceiling"
```

---

### Task 4: Shared tool result types

**Files:**
- Create: `lib/types.ts`
- Test: none — this file is types plus two one-line constructors, exercised by every later suite.

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `interface ToolError { message: string; line?: number; column?: number }`
  - `type ToolResult<T> = { ok: true; value: T } | { ok: false; error: ToolError }`
  - `ok<T>(value: T): ToolResult<T>`
  - `err<T>(message: string, at?: { line?: number; column?: number }): ToolResult<T>`

- [ ] **Step 1: Write the file**

Create `lib/types.ts`. Every fallible transform in the app returns this shape rather than throwing — see the Global Constraints.

```ts
export interface ToolError {
  message: string;
  /** 1-indexed, populated wherever the parser can supply a position. */
  line?: number;
  /** 1-indexed. */
  column?: number;
}

export type ToolResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: ToolError };

export function ok<T>(value: T): ToolResult<T> {
  return { ok: true, value };
}

export function err<T>(message: string, at?: { line?: number; column?: number }): ToolResult<T> {
  // `exactOptionalPropertyTypes` is on, so an absent position must be an
  // absent key rather than an explicit undefined.
  return { ok: false, error: { message, ...(at?.line != null ? { line: at.line } : {}), ...(at?.column != null ? { column: at.column } : {}) } };
}
```

- [ ] **Step 2: Verify it typechecks**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add lib/types.ts
git commit -m "feat: add shared ToolResult and ToolError types"
```

---

### Task 5: Tool registry — types, search, and grouping

**Files:**
- Create: `lib/registry/types.ts`, `lib/registry/search.ts`, `lib/registry/index.ts`
- Test: `tests/registry.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `type ToolGroup = "security" | "data" | "network"`
  - `GROUP_LABELS: Record<ToolGroup, string>` and `GROUP_ORDER: ToolGroup[]`
  - `interface ToolMeta { slug; name; blurb; group; icon; aliases; handlesSecrets }`
  - `interface ToolEntry { meta: ToolMeta; Component: React.ComponentType }`
  - `TOOLS: ToolEntry[]` — the single source of truth
  - `searchTools(metas: ToolMeta[], query: string): ToolMeta[]` — pure, fixture-testable
  - `groupTools(metas: ToolMeta[]): { group: ToolGroup; label: string; tools: ToolMeta[] }[]`
  - `toolBySlug(slug: string): ToolEntry | undefined`
  - `allMetas(): ToolMeta[]`

The search and grouping helpers are pure functions **over an array passed in**, not over the module-level `TOOLS`. That is what lets this task be fully tested before a single tool exists.

- [ ] **Step 1: Write the failing test**

Create `tests/registry.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { searchTools, groupTools } from "@/lib/registry/search";
import { TOOLS, allMetas, toolBySlug, GROUP_ORDER } from "@/lib/registry";
import type { ToolMeta } from "@/lib/registry/types";

const FIXTURES: ToolMeta[] = [
  { slug: "json-compare", name: "JSON Compare", blurb: "Diff two JSON documents structurally.", group: "data", icon: (() => null) as never, aliases: ["diff", "delta"], handlesSecrets: false },
  { slug: "jwt", name: "JWT Debugger", blurb: "Decode and verify tokens.", group: "security", icon: (() => null) as never, aliases: ["token", "jsonwebtoken"], handlesSecrets: true },
  { slug: "base64", name: "Base64", blurb: "Encode and decode.", group: "network", icon: (() => null) as never, aliases: ["b64"], handlesSecrets: false },
];

describe("searchTools", () => {
  it("returns everything for an empty query, in input order", () => {
    expect(searchTools(FIXTURES, "").map((t) => t.slug)).toEqual(["json-compare", "jwt", "base64"]);
  });

  it("matches on name, case-insensitively", () => {
    expect(searchTools(FIXTURES, "json com").map((t) => t.slug)).toEqual(["json-compare"]);
  });

  it("matches on an alias", () => {
    expect(searchTools(FIXTURES, "b64").map((t) => t.slug)).toEqual(["base64"]);
  });

  it("matches on slug", () => {
    expect(searchTools(FIXTURES, "jwt").map((t) => t.slug)).toEqual(["jwt"]);
  });

  it("ranks a name prefix above an alias match", () => {
    // "d" prefixes no name; it opens the alias "diff" and the word "Debugger".
    const ranked = searchTools(FIXTURES, "de").map((t) => t.slug);
    expect(ranked[0]).toBe("jwt"); // "Debugger" word-start beats "delta" alias
  });

  it("matches subsequences so 'jsncmp' finds JSON Compare", () => {
    expect(searchTools(FIXTURES, "jsncmp").map((t) => t.slug)).toEqual(["json-compare"]);
  });

  it("returns nothing for a query that matches nothing", () => {
    expect(searchTools(FIXTURES, "zzzzz")).toEqual([]);
  });
});

describe("groupTools", () => {
  it("returns groups in GROUP_ORDER, skipping empty ones", () => {
    const grouped = groupTools(FIXTURES.filter((t) => t.group !== "network"));
    expect(grouped.map((g) => g.group)).toEqual(["security", "data"]);
    expect(grouped[0]!.label).toBe("Security & Identity");
  });

  it("preserves input order within a group", () => {
    const two: ToolMeta[] = [
      { ...FIXTURES[0]!, slug: "a" },
      { ...FIXTURES[0]!, slug: "b" },
    ];
    expect(groupTools(two)[0]!.tools.map((t) => t.slug)).toEqual(["a", "b"]);
  });
});

describe("registry invariants", () => {
  const metas = allMetas();

  it("has unique, kebab-case, permanent slugs", () => {
    const slugs = metas.map((m) => m.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const slug of slugs) expect(slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  });

  it("gives every tool a blurb, a valid group, and at least one alias", () => {
    for (const m of metas) {
      expect(m.blurb.length, m.slug).toBeGreaterThan(0);
      expect(GROUP_ORDER, m.slug).toContain(m.group);
      expect(m.aliases.length, m.slug).toBeGreaterThan(0);
      expect(m.aliases.every((a) => a.trim().length > 0), m.slug).toBe(true);
    }
  });

  it("marks exactly the secret-handling tools as handlesSecrets", () => {
    // Grows to ["hash", "jwt", "password"] once Plan 2 lands. Every other
    // tool must be false — this is what gates persistence AND sharing.
    const secrets = metas.filter((m) => m.handlesSecrets).map((m) => m.slug).sort();
    expect(secrets.every((s) => ["hash", "jwt", "password"].includes(s))).toBe(true);
  });

  it("resolves every slug back to its entry", () => {
    for (const m of metas) expect(toolBySlug(m.slug)?.meta.slug).toBe(m.slug);
    expect(toolBySlug("does-not-exist")).toBeUndefined();
  });

  it("has at least one registered tool", () => {
    expect(TOOLS.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/registry.test.ts`
Expected: FAIL — cannot resolve `@/lib/registry/search`.

- [ ] **Step 3: Write the types**

Create `lib/registry/types.ts`:

```ts
import type { LucideIcon } from "lucide-react";

export type ToolGroup = "security" | "data" | "network";

export const GROUP_ORDER: ToolGroup[] = ["security", "data", "network"];

export const GROUP_LABELS: Record<ToolGroup, string> = {
  security: "Security & Identity",
  data: "Data & Formatting",
  network: "Networking & Backend",
};

export interface ToolMeta {
  /** URL segment. Permanent once shipped — links depend on it. */
  slug: string;
  name: string;
  /** One line, sentence case. Shown on the dashboard card and the tool page. */
  blurb: string;
  group: ToolGroup;
  icon: LucideIcon;
  /** Extra ⌘K search terms beyond the name and slug. */
  aliases: string[];
  /**
   * True for tools that take tokens, keys, or generated credentials. Gates
   * BOTH localStorage persistence and URL sharing, so the two can never
   * disagree about whether a secret may leave the tab.
   */
  handlesSecrets: boolean;
}

export interface ToolEntry {
  meta: ToolMeta;
  Component: React.ComponentType;
}
```

- [ ] **Step 4: Write the pure search and grouping helpers**

Create `lib/registry/search.ts`. Subsequence matching is what makes `jsncmp` find JSON Compare — the palette is for people who half-remember a name.

```ts
import { GROUP_LABELS, GROUP_ORDER, type ToolGroup, type ToolMeta } from "./types";

/**
 * Scores one haystack against a query. Higher is better; 0 means no match.
 *
 * The tiers matter more than the numbers: an exact hit beats a prefix, a
 * prefix beats a word-start, and a scattered subsequence comes last so that
 * typing "de" surfaces "Debugger" above "delta".
 */
function score(haystack: string, query: string): number {
  const h = haystack.toLowerCase();
  if (h === query) return 100;
  if (h.startsWith(query)) return 80;
  // Word start: after a space or a hyphen.
  if (new RegExp(`(^|[\\s-])${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`).test(h)) return 60;
  if (h.includes(query)) return 40;

  // Subsequence: every query character appears in order, not necessarily
  // adjacent. Cheapest match, so it ranks last.
  let i = 0;
  for (const char of h) {
    if (char === query[i]) i += 1;
    if (i === query.length) return 20;
  }
  return 0;
}

export function searchTools(metas: ToolMeta[], query: string): ToolMeta[] {
  const q = query.trim().toLowerCase();
  if (!q) return [...metas];

  return metas
    .map((meta, index) => {
      const best = Math.max(
        score(meta.name, q),
        score(meta.slug, q),
        // An alias is a weaker signal than the real name, so it is capped
        // below a name prefix.
        ...meta.aliases.map((a) => Math.min(score(a, q), 70)),
      );
      return { meta, best, index };
    })
    .filter((row) => row.best > 0)
    // Ties fall back to registry order, which is the order a human curated.
    .sort((a, b) => b.best - a.best || a.index - b.index)
    .map((row) => row.meta);
}

export function groupTools(
  metas: ToolMeta[],
): { group: ToolGroup; label: string; tools: ToolMeta[] }[] {
  return GROUP_ORDER
    .map((group) => ({
      group,
      label: GROUP_LABELS[group],
      tools: metas.filter((m) => m.group === group),
    }))
    // A group with nothing in it is absent, not empty — the spec's rule that
    // an empty surface never renders as blank space.
    .filter((section) => section.tools.length > 0);
}
```

- [ ] **Step 5: Write the registry itself**

Create `lib/registry/index.ts`. Task 14 adds the JSON Compare entry; until then the array is empty and the final invariant test fails, which is intentional and expected.

```ts
import type { ToolEntry, ToolMeta } from "./types";

export * from "./types";
export { searchTools, groupTools } from "./search";

/**
 * The single source of truth. Every tool registers here exactly once and
 * appears in four places: the rail, the ⌘K palette, the dashboard, and the
 * [slug] route. Declaration order is display order within a group.
 */
export const TOOLS: ToolEntry[] = [];

export function allMetas(): ToolMeta[] {
  return TOOLS.map((entry) => entry.meta);
}

export function toolBySlug(slug: string): ToolEntry | undefined {
  return TOOLS.find((entry) => entry.meta.slug === slug);
}
```

- [ ] **Step 6: Run the tests**

Run: `npx vitest run tests/registry.test.ts`
Expected: all `searchTools` and `groupTools` tests PASS. The invariant test **"has at least one registered tool" FAILS** — `TOOLS` is empty until Task 14. Leave it failing; it is the tripwire proving the registry is wired up, and Task 14 turns it green.

- [ ] **Step 7: Commit**

```bash
git add lib/registry tests/registry.test.ts
git commit -m "feat: add tool registry with fuzzy search and grouping"
```

---

### Task 6: Favourites and recents

**Files:**
- Create: `lib/workspace.ts`, `components/shell/WorkspaceProvider.tsx`
- Test: `tests/workspace.test.ts`

**Interfaces:**
- Consumes: `readJson`, `writeJson`, `KEYS` (Task 2).
- **Does NOT import the registry.** `lib/registry` imports the tool
  components, which import `ToolShell`, which imports this provider. If the
  provider imported the registry back, that closes a cycle
  (`registry -> JsonCompare -> ToolShell -> WorkspaceProvider -> registry`).
  The known-slug list is therefore passed in as a prop by `AppShell`
  (Task 12), which sits outside the registry's import graph.
- Produces:
  - `readFavourites(known: string[]): string[]`
  - `toggleFavourite(slug: string, current: string[]): string[]`
  - `readRecents(known: string[]): RecentEntry[]` where `interface RecentEntry { slug: string; at: number }`
  - `recordRecent(slug: string, current: RecentEntry[], now: number): RecentEntry[]`
  - `RECENTS_STORED = 12`, `RECENTS_SHOWN = 6`
  - `<WorkspaceProvider knownSlugs={string[]}>` and `useWorkspace(): { favourites: string[]; recents: RecentEntry[]; isFavourite(slug): boolean; toggle(slug): void; visit(slug): void }`

- [ ] **Step 1: Write the failing test**

Create `tests/workspace.test.ts`. Unknown-slug pruning is the load-bearing behaviour: a tool removed in a later release must not be able to break the rail for someone who had it pinned.

```ts
import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import {
  readFavourites, toggleFavourite, readRecents, recordRecent,
  RECENTS_STORED,
} from "@/lib/workspace";
import { KEYS } from "@/lib/storage";

const KNOWN = ["json-compare", "base64", "jwt"];

function memoryStorage() {
  const map = new Map<string, string>();
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
    removeItem: (k: string) => void map.delete(k),
  } as Partial<Storage>;
}

describe("favourites", () => {
  beforeEach(() => vi.stubGlobal("localStorage", memoryStorage()));
  afterEach(() => vi.unstubAllGlobals());

  it("starts empty", () => {
    expect(readFavourites(KNOWN)).toEqual([]);
  });

  it("drops slugs that are no longer registered", () => {
    localStorage.setItem(KEYS.favourites, JSON.stringify(["base64", "removed-tool"]));
    expect(readFavourites(KNOWN)).toEqual(["base64"]);
  });

  it("ignores a stored value that is not an array", () => {
    localStorage.setItem(KEYS.favourites, JSON.stringify({ nope: true }));
    expect(readFavourites(KNOWN)).toEqual([]);
  });

  it("appends on toggle and removes on re-toggle", () => {
    const once = toggleFavourite("jwt", []);
    expect(once).toEqual(["jwt"]);
    expect(toggleFavourite("jwt", once)).toEqual([]);
  });

  it("preserves pin order", () => {
    const list = toggleFavourite("base64", toggleFavourite("jwt", []));
    expect(list).toEqual(["jwt", "base64"]);
  });
});

describe("recents", () => {
  beforeEach(() => vi.stubGlobal("localStorage", memoryStorage()));
  afterEach(() => vi.unstubAllGlobals());

  it("puts the newest visit first", () => {
    let list = recordRecent("jwt", [], 1000);
    list = recordRecent("base64", list, 2000);
    expect(list.map((r) => r.slug)).toEqual(["base64", "jwt"]);
  });

  it("moves a revisited tool to the front rather than duplicating it", () => {
    let list = recordRecent("jwt", [], 1000);
    list = recordRecent("base64", list, 2000);
    list = recordRecent("jwt", list, 3000);
    expect(list.map((r) => r.slug)).toEqual(["jwt", "base64"]);
    expect(list[0]!.at).toBe(3000);
  });

  it(`caps the stored list at ${RECENTS_STORED}`, () => {
    let list: { slug: string; at: number }[] = [];
    for (let i = 0; i < RECENTS_STORED + 5; i += 1) list = recordRecent(`tool-${i}`, list, i);
    expect(list).toHaveLength(RECENTS_STORED);
    expect(list[0]!.slug).toBe(`tool-${RECENTS_STORED + 4}`);
  });

  it("drops unregistered slugs on read", () => {
    localStorage.setItem(KEYS.recents, JSON.stringify([
      { slug: "base64", at: 2 }, { slug: "removed-tool", at: 1 },
    ]));
    expect(readRecents(KNOWN).map((r) => r.slug)).toEqual(["base64"]);
  });

  it("ignores malformed entries", () => {
    localStorage.setItem(KEYS.recents, JSON.stringify(["base64", { at: 1 }, null]));
    expect(readRecents(KNOWN)).toEqual([]);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/workspace.test.ts`
Expected: FAIL — cannot resolve `@/lib/workspace`.

- [ ] **Step 3: Write the pure logic**

Create `lib/workspace.ts`:

```ts
import { KEYS, readJson, writeJson } from "./storage";

export interface RecentEntry {
  slug: string;
  at: number;
}

export const RECENTS_STORED = 12;
export const RECENTS_SHOWN = 6;

/**
 * `known` is the list of currently registered slugs. Anything stored that is
 * not in it is dropped on read, so a tool removed in a later release cannot
 * leave a dead row in the rail or a card that navigates to a 404.
 */
export function readFavourites(known: string[]): string[] {
  const stored = readJson<unknown>(KEYS.favourites, []);
  if (!Array.isArray(stored)) return [];
  return stored.filter((s): s is string => typeof s === "string" && known.includes(s));
}

export function toggleFavourite(slug: string, current: string[]): string[] {
  return current.includes(slug) ? current.filter((s) => s !== slug) : [...current, slug];
}

export function saveFavourites(list: string[]): void {
  writeJson(KEYS.favourites, list);
}

export function readRecents(known: string[]): RecentEntry[] {
  const stored = readJson<unknown>(KEYS.recents, []);
  if (!Array.isArray(stored)) return [];
  return stored.filter(
    (e): e is RecentEntry =>
      typeof e === "object" && e !== null &&
      typeof (e as RecentEntry).slug === "string" &&
      typeof (e as RecentEntry).at === "number" &&
      known.includes((e as RecentEntry).slug),
  );
}

export function recordRecent(slug: string, current: RecentEntry[], now: number): RecentEntry[] {
  // Filter first, then unshift: revisiting a tool moves it rather than
  // adding a second row for it.
  return [{ slug, at: now }, ...current.filter((e) => e.slug !== slug)].slice(0, RECENTS_STORED);
}

export function saveRecents(list: RecentEntry[]): void {
  writeJson(KEYS.recents, list);
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run tests/workspace.test.ts`
Expected: PASS, 11 tests.

- [ ] **Step 5: Write the React provider**

Create `components/shell/WorkspaceProvider.tsx`. State is read in an effect, not during render: `localStorage` does not exist on the server, and reading it during render produces a hydration mismatch.

```tsx
"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  readFavourites, saveFavourites, toggleFavourite,
  readRecents, saveRecents, recordRecent, type RecentEntry,
} from "@/lib/workspace";

interface WorkspaceValue {
  favourites: string[];
  recents: RecentEntry[];
  isFavourite: (slug: string) => boolean;
  toggle: (slug: string) => void;
  visit: (slug: string) => void;
}

const WorkspaceContext = createContext<WorkspaceValue | null>(null);

/**
 * `knownSlugs` arrives as a prop rather than being read from the registry:
 * the registry imports the tool components, which reach this file, so
 * importing it back would close a cycle. AppShell supplies it.
 */
export function WorkspaceProvider(
  { knownSlugs, children }: { knownSlugs: string[]; children: React.ReactNode },
) {
  const [favourites, setFavourites] = useState<string[]>([]);
  const [recents, setRecents] = useState<RecentEntry[]>([]);
  const known = useMemo(() => knownSlugs, [knownSlugs]);

  // Hydration: the server renders an empty workspace and the client fills it
  // in after mount. Reading storage during render would mismatch.
  useEffect(() => {
    setFavourites(readFavourites(known));
    setRecents(readRecents(known));
  }, [known]);

  const toggle = useCallback((slug: string) => {
    setFavourites((current) => {
      const next = toggleFavourite(slug, current);
      saveFavourites(next);
      return next;
    });
  }, []);

  const visit = useCallback((slug: string) => {
    setRecents((current) => {
      const next = recordRecent(slug, current, Date.now());
      saveRecents(next);
      return next;
    });
  }, []);

  const value = useMemo<WorkspaceValue>(
    () => ({ favourites, recents, isFavourite: (s) => favourites.includes(s), toggle, visit }),
    [favourites, recents, toggle, visit],
  );

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace(): WorkspaceValue {
  const value = useContext(WorkspaceContext);
  if (!value) throw new Error("useWorkspace must be used inside WorkspaceProvider");
  return value;
}
```

- [ ] **Step 6: Verify it typechecks**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add lib/workspace.ts components/shell/WorkspaceProvider.tsx tests/workspace.test.ts
git commit -m "feat: add favourites and recents with unknown-slug pruning"
```

---

### Task 7: UI primitives

**Files:**
- Create: `components/ui/Button.tsx`, `components/ui/Segmented.tsx`, `components/ui/Toggle.tsx`, `components/ui/Field.tsx`, `components/ui/Select.tsx`, `components/ui/CodeArea.tsx`
- Create: `lib/cx.ts`
- Test: none — these are presentational. Verified in the browser in Step 8.

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `cx(...parts: (string | false | null | undefined)[]): string`
  - `<Button variant="primary" | "ghost" | "danger" size="sm" | "md">` — extends `React.ButtonHTMLAttributes<HTMLButtonElement>`
  - `<Segmented<T> value={T} options={{ value: T; label: string }[]} onChange={(v: T) => void} label={string}>`
  - `<Toggle checked={boolean} onChange={(v: boolean) => void} label={string}>`
  - `<Field label={string} hint?={string} htmlFor?={string}>` — wraps a control with a mono label
  - `<Select<T> value={T} options={{ value: T; label: string }[]} onChange={(v: T) => void}>`
  - `<CodeArea value={string} onChange?={(v: string) => void} placeholder?={string} readOnly?={boolean} ariaLabel={string}>`

- [ ] **Step 1: Write the class-name helper**

Create `lib/cx.ts`:

```ts
export function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}
```

- [ ] **Step 2: Write Button**

Create `components/ui/Button.tsx`. The One Blue Rule lives here: `primary` is for the single commitment on a screen, and any action repeated down a list uses `ghost`.

```tsx
"use client";

import { cx } from "@/lib/cx";

type Variant = "primary" | "ghost" | "danger";
type Size = "sm" | "md";

interface Props extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const VARIANTS: Record<Variant, string> = {
  primary: "bg-primary text-on-primary hover:bg-primary-hover shadow-sm",
  ghost: "bg-surface text-fg-2 border border-border hover:bg-surface-2 hover:text-fg",
  danger: "bg-surface text-destructive border border-border hover:bg-rose-tint",
};

const SIZES: Record<Size, string> = {
  sm: "h-8 px-2.5 text-[12px] gap-1.5",
  md: "h-9 px-3.5 text-[13px] gap-2",
};

export function Button({ variant = "ghost", size = "md", className, ...rest }: Props) {
  return (
    <button
      {...rest}
      className={cx(
        "inline-flex items-center justify-center rounded-md font-ui font-medium",
        "transition-colors duration-150",
        // Focus is never removed, only restyled — a keyboard user must always
        // be able to see where they are.
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-bg",
        "disabled:cursor-not-allowed disabled:opacity-45",
        VARIANTS[variant], SIZES[size], className,
      )}
    />
  );
}
```

- [ ] **Step 3: Write Segmented and Toggle**

Create `components/ui/Segmented.tsx`:

```tsx
"use client";

import { cx } from "@/lib/cx";

interface Props<T extends string> {
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  label: string;
}

export function Segmented<T extends string>({ value, options, onChange, label }: Props<T>) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-md bg-surface-2 p-0.5">
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            role="radio"
            aria-checked={active}
            onClick={() => onChange(option.value)}
            className={cx(
              "rounded-sm px-2.5 py-1 font-ui text-[12px] font-medium transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]",
              active ? "bg-surface text-fg shadow-xs" : "text-fg-muted hover:text-fg",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
```

Create `components/ui/Toggle.tsx`:

```tsx
"use client";

import { cx } from "@/lib/cx";

interface Props {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
}

export function Toggle({ checked, onChange, label }: Props) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-2">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={cx(
          "relative h-[18px] w-8 rounded-full transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-bg",
          checked ? "bg-primary" : "bg-surface-2 border border-border",
        )}
      >
        <span
          className={cx(
            "absolute top-[2px] h-[12px] w-[12px] rounded-full bg-surface shadow-xs transition-transform",
            checked ? "translate-x-[17px]" : "translate-x-[3px]",
          )}
        />
      </button>
      <span className="font-ui text-[12px] text-fg-2">{label}</span>
    </label>
  );
}
```

- [ ] **Step 4: Write Field and Select**

Create `components/ui/Field.tsx`:

```tsx
import { cx } from "@/lib/cx";

interface Props {
  label: string;
  hint?: string;
  htmlFor?: string;
  className?: string;
  children: React.ReactNode;
}

export function Field({ label, hint, htmlFor, className, children }: Props) {
  return (
    <div className={cx("flex flex-col gap-1.5", className)}>
      <label htmlFor={htmlFor} className="eyebrow">{label}</label>
      {children}
      {/* Hints are prose, so they take the body font, not the ui font. */}
      {hint ? <p className="text-[12px] leading-snug text-fg-muted">{hint}</p> : null}
    </div>
  );
}
```

Create `components/ui/Select.tsx`:

```tsx
"use client";

import { cx } from "@/lib/cx";

interface Props<T extends string> {
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  id?: string;
  ariaLabel?: string;
  className?: string;
}

export function Select<T extends string>({ value, options, onChange, id, ariaLabel, className }: Props<T>) {
  return (
    <select
      id={id}
      aria-label={ariaLabel}
      value={value}
      onChange={(event) => onChange(event.target.value as T)}
      className={cx(
        "h-9 rounded-md border border-border bg-surface px-2 font-ui text-[13px] text-fg",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]",
        className,
      )}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>{option.label}</option>
      ))}
    </select>
  );
}
```

- [ ] **Step 5: Write CodeArea**

Create `components/ui/CodeArea.tsx`. This is every tool's I/O surface. `spellCheck={false}` and the autocomplete attributes matter: a browser underlining a base64 payload in red, or offering to autofill a JWT, is noise at best.

```tsx
"use client";

import { cx } from "@/lib/cx";

interface Props {
  value: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  readOnly?: boolean;
  ariaLabel: string;
  className?: string;
}

export function CodeArea({ value, onChange, placeholder, readOnly, ariaLabel, className }: Props) {
  return (
    <textarea
      value={value}
      onChange={onChange ? (event) => onChange(event.target.value) : undefined}
      placeholder={placeholder}
      readOnly={readOnly}
      aria-label={ariaLabel}
      spellCheck={false}
      autoComplete="off"
      autoCorrect="off"
      autoCapitalize="off"
      data-gramm="false"
      className={cx(
        "h-full w-full resize-none rounded-md border border-border bg-surface p-3",
        "font-ui text-[13px] leading-[1.55] text-fg",
        "placeholder:text-fg-muted",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]",
        readOnly && "bg-inset",
        className,
      )}
    />
  );
}
```

- [ ] **Step 6: Typecheck**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 7: Verify in the browser**

Temporarily render one of each in `app/page.tsx`, run `npm run dev`, and confirm:
- Tab through every control — each shows a visible focus ring in both themes.
- The `primary` button is the only filled-blue thing on screen.
- `CodeArea` text is monospace and does not get a spellcheck underline.

Revert the temporary edits to `app/page.tsx` before committing.

- [ ] **Step 8: Commit**

```bash
git add components/ui lib/cx.ts
git commit -m "feat: add UI primitives with visible focus states"
```

---

### Task 8: ToolShell — the shared tool-page pattern

**Files:**
- Create: `components/tool/ToolShell.tsx`, `components/tool/useToolState.ts`, `components/tool/FavouriteStar.tsx`, `components/tool/CopyButton.tsx`, `components/tool/ErrorNote.tsx`
- Test: `tests/tool-state.test.ts`

**Interfaces:**
- Consumes: `ToolMeta` (Task 5), `readJson`/`writeJson`/`KEYS` (Task 2), `encodeShare`/`readShareFromHash`/`SHARE_PREFIX` (Task 3), `useWorkspace` (Task 6), `Button` (Task 7), `ToolError` (Task 4).
- Produces:
  - `initialToolState<T>(meta, defaults, hash, isValid): T` — pure; precedence is share hash → stored → defaults
  - `useToolState<T>(meta: ToolMeta, defaults: T, isValid: (v: unknown) => v is T): [T, (patch: Partial<T>) => void, () => void]` — third element resets to defaults
  - `<ToolShell meta actions options panes>` — layout only
  - `<FavouriteStar slug />`, `<CopyButton text label />`, `<ErrorNote error />`

- [ ] **Step 1: Write the failing test for state precedence**

Create `tests/tool-state.test.ts`. Precedence and the secrets rule are the two things worth pinning down; the React hook around them is thin.

```ts
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { initialToolState } from "@/components/tool/useToolState";
import { encodeShare, SHARE_PREFIX } from "@/lib/share";
import { KEYS } from "@/lib/storage";
import type { ToolMeta } from "@/lib/registry/types";

interface State { text: string; mode: string }
const DEFAULTS: State = { text: "", mode: "encode" };
const isValid = (v: unknown): v is State =>
  typeof v === "object" && v !== null &&
  typeof (v as State).text === "string" && typeof (v as State).mode === "string";

const open: ToolMeta = {
  slug: "base64", name: "Base64", blurb: "b", group: "network",
  icon: (() => null) as never, aliases: ["b64"], handlesSecrets: false,
};
const secret: ToolMeta = { ...open, slug: "jwt", name: "JWT", handlesSecrets: true };

function memoryStorage() {
  const map = new Map<string, string>();
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
    removeItem: (k: string) => void map.delete(k),
  } as Partial<Storage>;
}

describe("initialToolState", () => {
  beforeEach(() => vi.stubGlobal("localStorage", memoryStorage()));
  afterEach(() => vi.unstubAllGlobals());

  it("falls back to defaults with nothing stored and no hash", () => {
    expect(initialToolState(open, DEFAULTS, "", isValid)).toEqual(DEFAULTS);
  });

  it("restores stored state", () => {
    localStorage.setItem(KEYS.tool("base64"), JSON.stringify({ text: "hi", mode: "decode" }));
    expect(initialToolState(open, DEFAULTS, "", isValid)).toEqual({ text: "hi", mode: "decode" });
  });

  it("lets a share hash win over stored state", () => {
    localStorage.setItem(KEYS.tool("base64"), JSON.stringify({ text: "stored", mode: "decode" }));
    const hash = `${SHARE_PREFIX}${encodeShare({ text: "shared", mode: "encode" })}`;
    expect(initialToolState(open, DEFAULTS, hash, isValid)).toEqual({ text: "shared", mode: "encode" });
  });

  it("discards stored state of the wrong shape rather than opening broken", () => {
    localStorage.setItem(KEYS.tool("base64"), JSON.stringify({ text: 42 }));
    expect(initialToolState(open, DEFAULTS, "", isValid)).toEqual(DEFAULTS);
  });

  it("discards a malformed share hash", () => {
    expect(initialToolState(open, DEFAULTS, `${SHARE_PREFIX}!!!`, isValid)).toEqual(DEFAULTS);
  });

  it("ignores BOTH stored state and a share hash for a secret-handling tool", () => {
    localStorage.setItem(KEYS.tool("jwt"), JSON.stringify({ text: "eyJhbG", mode: "decode" }));
    const hash = `${SHARE_PREFIX}${encodeShare({ text: "leaked", mode: "decode" })}`;
    expect(initialToolState(secret, DEFAULTS, hash, isValid)).toEqual(DEFAULTS);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/tool-state.test.ts`
Expected: FAIL — cannot resolve `@/components/tool/useToolState`.

- [ ] **Step 3: Write the state hook**

Create `components/tool/useToolState.ts`:

```ts
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ToolMeta } from "@/lib/registry/types";
import { KEYS, readJson, remove, writeJson } from "@/lib/storage";
import { readShareFromHash } from "@/lib/share";

const DEBOUNCE_MS = 400;

/**
 * Precedence: a share hash beats stored state beats defaults. A link the user
 * just opened is the most specific intent they have expressed, so it wins over
 * whatever the tab happened to hold from last time.
 *
 * Tools with `handlesSecrets` take neither path. Their state is never written
 * to storage and never read from a URL, so they open empty every time — a
 * token pasted here must not outlive the tab that pasted it.
 */
export function initialToolState<T>(
  meta: ToolMeta,
  defaults: T,
  hash: string,
  isValid: (value: unknown) => value is T,
): T {
  if (meta.handlesSecrets) return defaults;

  const shared = readShareFromHash<unknown>(hash);
  if (isValid(shared)) return shared;

  const stored = readJson<unknown>(KEYS.tool(meta.slug), null);
  if (isValid(stored)) return stored;

  return defaults;
}

export function useToolState<T extends object>(
  meta: ToolMeta,
  defaults: T,
  isValid: (value: unknown) => value is T,
): [T, (patch: Partial<T>) => void, () => void] {
  const [state, setState] = useState<T>(defaults);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Restore after mount. The server has no localStorage and no hash, so doing
  // this during render would produce a hydration mismatch.
  useEffect(() => {
    const restored = initialToolState(meta, defaults, window.location.hash, isValid);
    setState(restored);
    if (window.location.hash.startsWith("#s=")) {
      // Clear the payload from the address bar so it does not ride along into
      // history or a screenshot once it has been applied.
      window.history.replaceState(null, "", window.location.pathname);
    }
    // Deliberately mount-only: re-running on every `defaults` identity change
    // would clobber what the user has typed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meta.slug]);

  const update = useCallback((patch: Partial<T>) => {
    setState((current) => {
      const next = { ...current, ...patch };
      if (!meta.handlesSecrets) {
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => writeJson(KEYS.tool(meta.slug), next), DEBOUNCE_MS);
      }
      return next;
    });
  }, [meta.handlesSecrets, meta.slug]);

  const reset = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    remove(KEYS.tool(meta.slug));
    setState(defaults);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meta.slug]);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  return [state, update, reset];
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run tests/tool-state.test.ts`
Expected: PASS, 6 tests.

- [ ] **Step 5: Write the small tool components**

Create `components/tool/CopyButton.tsx`:

```tsx
"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/Button";

export function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      // Clipboard permission denied, or an insecure origin. Nothing to do but
      // leave the label alone — the user can still select and copy by hand.
    }
  }

  return (
    <Button size="sm" onClick={copy} disabled={!text}>
      {copied ? <Check size={13} aria-hidden /> : <Copy size={13} aria-hidden />}
      {copied ? "Copied" : label}
    </Button>
  );
}
```

Create `components/tool/FavouriteStar.tsx`:

```tsx
"use client";

import { Star } from "lucide-react";
import { useWorkspace } from "@/components/shell/WorkspaceProvider";
import { cx } from "@/lib/cx";

export function FavouriteStar({ slug, name }: { slug: string; name: string }) {
  const { isFavourite, toggle } = useWorkspace();
  const pinned = isFavourite(slug);

  return (
    <button
      type="button"
      aria-pressed={pinned}
      aria-label={pinned ? `Unpin ${name}` : `Pin ${name}`}
      onClick={() => toggle(slug)}
      className={cx(
        "rounded-sm p-1 transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]",
        pinned ? "text-warn-solid" : "text-fg-muted hover:text-fg",
      )}
    >
      <Star size={15} fill={pinned ? "currentColor" : "none"} aria-hidden />
    </button>
  );
}
```

Create `components/tool/ErrorNote.tsx`. Errors are prose, so they take the body font — and a position is always shown when the parser supplied one.

```tsx
import { AlertCircle } from "lucide-react";
import type { ToolError } from "@/lib/types";

export function ErrorNote({ error }: { error: ToolError | null }) {
  if (!error) return null;
  const where = error.line != null
    ? ` (line ${error.line}${error.column != null ? `, column ${error.column}` : ""})`
    : "";

  return (
    <div role="alert" className="flex items-start gap-2 rounded-md bg-rose-tint px-3 py-2">
      <AlertCircle size={14} className="mt-0.5 shrink-0 text-rose" aria-hidden />
      <p className="text-[12.5px] leading-snug text-rose">{error.message}{where}</p>
    </div>
  );
}
```

- [ ] **Step 6: Write ToolShell**

Create `components/tool/ToolShell.tsx`:

```tsx
"use client";

import { useEffect } from "react";
import { Link2 } from "lucide-react";
import type { ToolMeta } from "@/lib/registry/types";
import { encodeShare, SHARE_PREFIX } from "@/lib/share";
import { useWorkspace } from "@/components/shell/WorkspaceProvider";
import { Button } from "@/components/ui/Button";
import { FavouriteStar } from "./FavouriteStar";

interface Props {
  meta: ToolMeta;
  /** Serialisable state to encode when the user asks for a share link. */
  shareState?: unknown;
  /** The tool's controls. Rendered in one horizontal band above the panes. */
  options?: React.ReactNode;
  /** Copy / Clear / Load sample. Rendered right-aligned in the header. */
  actions?: React.ReactNode;
  children: React.ReactNode;
}

export function ToolShell({ meta, shareState, options, actions, children }: Props) {
  const { visit } = useWorkspace();

  useEffect(() => { visit(meta.slug); }, [meta.slug, visit]);

  // Sharing is explicit and gated twice: the tool must not handle secrets, and
  // the payload must fit. Over the ceiling, encodeShare returns null and the
  // button explains itself rather than handing over a link that will be cut.
  const payload = meta.handlesSecrets || shareState === undefined ? null : encodeShare(shareState);
  const canShare = !meta.handlesSecrets && shareState !== undefined;

  async function share() {
    if (!payload) return;
    const url = `${window.location.origin}${window.location.pathname}${SHARE_PREFIX}${payload}`;
    try { await navigator.clipboard.writeText(url); } catch { /* see CopyButton */ }
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-[1600px] flex-col gap-4 p-5 lg:p-7">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <h1 className="font-ui text-[1.375rem] font-bold tracking-[-0.01em] text-fg">{meta.name}</h1>
            <FavouriteStar slug={meta.slug} name={meta.name} />
          </div>
          <p className="mt-1 max-w-prose text-[13px] text-fg-muted">{meta.blurb}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {actions}
          {canShare ? (
            <Button
              size="sm"
              onClick={share}
              disabled={!payload}
              title={payload ? "Copy a link that opens this tool with your input" : "Input is too large to share by link"}
            >
              <Link2 size={13} aria-hidden />
              Share
            </Button>
          ) : null}
        </div>
      </header>

      {options ? (
        <div className="flex flex-wrap items-center gap-x-5 gap-y-3 rounded-lg bg-surface px-4 py-3 shadow-sm">
          {options}
        </div>
      ) : null}

      <div className="min-h-0 flex-1">{children}</div>
    </main>
  );
}
```

- [ ] **Step 7: Typecheck and commit**

Run: `npm run typecheck`
Expected: no errors.

```bash
git add components/tool tests/tool-state.test.ts
git commit -m "feat: add ToolShell with state precedence and gated sharing"
```

---

### Task 9: The rail

**Files:**
- Create: `components/shell/Rail.tsx`
- Test: none — verified in the browser in Step 3.

**Interfaces:**
- Consumes: `allMetas`, `groupTools`, `GROUP_LABELS` (Task 5); `useWorkspace` (Task 6); `KEYS`/`readJson`/`writeJson` (Task 2).
- Produces: `<Rail />`.

- [ ] **Step 1: Write the rail**

Create `components/shell/Rail.tsx`. The drawer pattern — two-frame mount, focus trap, Escape, body scroll lock — is ported from `job-copilot/components/Nav.tsx`; a translated-but-mounted panel stays focusable, which is why it unmounts rather than sitting off-screen.

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { Menu, PanelLeftClose, PanelLeftOpen, Star, X } from "lucide-react";
import { allMetas, groupTools } from "@/lib/registry";
import { useWorkspace } from "./WorkspaceProvider";
import { KEYS, readJson, writeJson } from "@/lib/storage";
import { cx } from "@/lib/cx";

function RailLinks({ collapsed, onNavigate }: { collapsed: boolean; onNavigate?: () => void }) {
  const pathname = usePathname();
  const { favourites } = useWorkspace();
  const metas = useMemo(() => allMetas(), []);
  const sections = useMemo(() => groupTools(metas), [metas]);

  // Favourites is absent, not empty, when nothing is pinned.
  const pinned = favourites
    .map((slug) => metas.find((m) => m.slug === slug))
    .filter((m): m is NonNullable<typeof m> => m != null);

  const groups = [
    ...(pinned.length ? [{ group: "favourites", label: "Favourites", tools: pinned }] : []),
    ...sections,
  ];

  return (
    <nav aria-label="Tools" className="flex flex-col gap-5 px-2 py-3">
      {groups.map((section) => (
        <div key={section.group}>
          {!collapsed ? (
            <p className="px-2 pb-1.5 font-ui text-[10.5px] font-semibold uppercase tracking-[.14em] text-nav-fg-muted">
              {section.label}
            </p>
          ) : null}
          <ul className="flex flex-col gap-px">
            {section.tools.map((meta) => {
              const active = pathname === `/${meta.slug}`;
              const Icon = meta.icon;
              return (
                <li key={`${section.group}-${meta.slug}`} className="relative">
                  {/* The rail's position marker is the ONE sanctioned edge
                      indicator in the system — cards and rows never get one. */}
                  {active ? (
                    <span aria-hidden className="absolute left-0 top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-r-sm bg-primary" />
                  ) : null}
                  <Link
                    href={`/${meta.slug}`}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    title={collapsed ? meta.name : undefined}
                    className={cx(
                      "flex items-center gap-2.5 rounded-md px-2 py-1.5 font-ui text-[13px] transition-colors",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]",
                      collapsed && "justify-center",
                      active ? "bg-nav-hover text-nav-fg" : "text-nav-fg-muted hover:bg-nav-hover hover:text-nav-fg",
                    )}
                  >
                    <Icon size={15} className="shrink-0" aria-hidden />
                    {!collapsed ? <span className="truncate">{meta.name}</span> : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

export function Rail() {
  const [collapsed, setCollapsed] = useState(false);
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [shown, setShown] = useState(false);
  const panelRef = useRef<HTMLElement>(null);
  const openerRef = useRef<Element | null>(null);

  useEffect(() => { setCollapsed(readJson(KEYS.rail, "expanded") === "collapsed"); }, []);

  function setRail(next: boolean) {
    setCollapsed(next);
    writeJson(KEYS.rail, next ? "collapsed" : "expanded");
  }

  // Two flags, because one cannot animate both ways. `mounted` keeps the panel
  // in the tree long enough to slide out; `shown` is what the transition reads
  // and is set a frame later, so the browser has a closed state to move from.
  useEffect(() => {
    if (open) {
      setMounted(true);
      let inner = 0;
      const outer = requestAnimationFrame(() => { inner = requestAnimationFrame(() => setShown(true)); });
      return () => { cancelAnimationFrame(outer); cancelAnimationFrame(inner); };
    }
    setShown(false);
    const timer = setTimeout(() => setMounted(false), 220);
    return () => clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    openerRef.current = document.activeElement;
    const priorOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") { setOpen(false); return; }
      if (event.key !== "Tab" || !panelRef.current) return;
      // Behind the drawer the page is inert, so letting focus escape strands
      // the keyboard on controls nobody can see.
      const items = panelRef.current.querySelectorAll<HTMLElement>('a[href], button:not([disabled])');
      if (!items.length) return;
      const first = items[0]!;
      const last = items[items.length - 1]!;
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }

    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = priorOverflow;
      (openerRef.current as HTMLElement | null)?.focus?.();
    };
  }, [open]);

  return (
    <>
      <aside
        className={cx(
          "sticky top-0 hidden h-dvh shrink-0 flex-col overflow-y-auto bg-nav lg:flex",
          collapsed ? "w-16" : "w-64",
        )}
      >
        <div className={cx("flex items-center gap-2 px-3 py-3.5", collapsed && "justify-center")}>
          {!collapsed ? (
            <Link href="/" className="font-ui text-[13px] font-bold tracking-tight text-nav-fg">
              DevTools
            </Link>
          ) : null}
          <button
            type="button"
            onClick={() => setRail(!collapsed)}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="ml-auto rounded-md p-1 text-nav-fg-muted hover:bg-nav-hover hover:text-nav-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
          >
            {collapsed ? <PanelLeftOpen size={15} aria-hidden /> : <PanelLeftClose size={15} aria-hidden />}
          </button>
        </div>
        <RailLinks collapsed={collapsed} />
      </aside>

      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open navigation"
        className="fixed bottom-4 left-4 z-40 rounded-lg bg-nav p-2.5 text-nav-fg shadow-lg lg:hidden"
      >
        <Menu size={17} aria-hidden />
      </button>

      {mounted ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            onClick={() => setOpen(false)}
            className={cx("absolute inset-0 bg-black/50 transition-opacity duration-200", shown ? "opacity-100" : "opacity-0")}
          />
          <aside
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label="Tools"
            className={cx(
              "absolute inset-y-0 left-0 w-64 overflow-y-auto bg-nav transition-transform duration-200",
              shown ? "translate-x-0" : "-translate-x-full",
            )}
          >
            <div className="flex items-center justify-between px-3 py-3.5">
              <span className="font-ui text-[13px] font-bold text-nav-fg">DevTools</span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close navigation"
                className="rounded-md p-1 text-nav-fg-muted hover:bg-nav-hover hover:text-nav-fg"
              >
                <X size={16} aria-hidden />
              </button>
            </div>
            <RailLinks collapsed={false} onNavigate={() => setOpen(false)} />
          </aside>
        </div>
      ) : null}
    </>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: no errors. The rail renders nothing until Task 14 registers a tool — that is expected.

- [ ] **Step 3: Commit**

```bash
git add components/shell/Rail.tsx
git commit -m "feat: add collapsible rail with mobile drawer and focus trap"
```

---

### Task 10: Top bar, theme toggle, and the local-only badge

**Files:**
- Create: `components/shell/TopBar.tsx`, `components/shell/ThemeToggle.tsx`, `components/shell/LocalBadge.tsx`
- Test: none — verified in the browser in Task 13.

**Interfaces:**
- Consumes: `KEYS` (Task 2).
- Produces: `<TopBar onOpenPalette={() => void} />`, `<ThemeToggle />`, `<LocalBadge />`.

- [ ] **Step 1: Write ThemeToggle**

Create `components/shell/ThemeToggle.tsx`. It writes the same bare `theme` key the pre-paint script in `app/layout.tsx` reads — the two must never disagree.

```tsx
"use client";

import { useEffect, useState } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { KEYS } from "@/lib/storage";
import { cx } from "@/lib/cx";

type Choice = "light" | "dark" | "system";

function apply(choice: Choice) {
  const dark = choice === "dark" ||
    (choice === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", dark);
  try {
    if (choice === "system") localStorage.removeItem(KEYS.theme);
    else localStorage.setItem(KEYS.theme, choice);
  } catch { /* site data blocked; the class is still applied for this tab */ }
}

const OPTIONS: { value: Choice; label: string; Icon: typeof Sun }[] = [
  { value: "light", label: "Light", Icon: Sun },
  { value: "dark", label: "Dark", Icon: Moon },
  { value: "system", label: "System", Icon: Monitor },
];

export function ThemeToggle() {
  const [choice, setChoice] = useState<Choice>("system");

  useEffect(() => {
    try {
      const stored = localStorage.getItem(KEYS.theme);
      setChoice(stored === "light" || stored === "dark" ? stored : "system");
    } catch { /* leave the default */ }
  }, []);

  return (
    <div role="radiogroup" aria-label="Theme" className="inline-flex rounded-md bg-surface-2 p-0.5">
      {OPTIONS.map(({ value, label, Icon }) => (
        <button
          key={value}
          role="radio"
          aria-checked={choice === value}
          aria-label={label}
          title={label}
          onClick={() => { setChoice(value); apply(value); }}
          className={cx(
            "rounded-sm p-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]",
            choice === value ? "bg-surface text-fg shadow-xs" : "text-fg-muted hover:text-fg",
          )}
        >
          <Icon size={14} aria-hidden />
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Write LocalBadge**

Create `components/shell/LocalBadge.tsx`. This is a claim the codebase has to keep — see the no-network Global Constraint.

```tsx
import { ShieldCheck } from "lucide-react";

export function LocalBadge() {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full bg-up-tint px-2.5 py-1"
      title="Every tool runs in your browser. Nothing you paste is uploaded, logged, or sent anywhere."
    >
      <ShieldCheck size={12} className="text-up" aria-hidden />
      <span className="font-ui text-[10.5px] font-semibold uppercase tracking-[.14em] text-up">
        Runs locally
      </span>
    </span>
  );
}
```

- [ ] **Step 3: Write TopBar**

Create `components/shell/TopBar.tsx`:

```tsx
"use client";

import { Search } from "lucide-react";
import { LocalBadge } from "./LocalBadge";
import { ThemeToggle } from "./ThemeToggle";

export function TopBar({ onOpenPalette }: { onOpenPalette: () => void }) {
  return (
    <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-bg/85 px-5 py-2.5 backdrop-blur">
      <button
        type="button"
        onClick={onOpenPalette}
        className="flex flex-1 items-center gap-2 rounded-md border border-border bg-surface px-2.5 py-1.5 text-left font-ui text-[12.5px] text-fg-muted transition-colors hover:border-fg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] sm:max-w-xs"
      >
        <Search size={13} aria-hidden />
        <span className="flex-1">Search tools</span>
        <kbd className="rounded-sm bg-surface-2 px-1.5 py-0.5 font-ui text-[10.5px] text-fg-muted">⌘K</kbd>
      </button>
      <div className="ml-auto flex items-center gap-3">
        <span className="hidden sm:inline"><LocalBadge /></span>
        <ThemeToggle />
      </div>
    </header>
  );
}
```

- [ ] **Step 4: Typecheck and commit**

Run: `npm run typecheck`

```bash
git add components/shell/TopBar.tsx components/shell/ThemeToggle.tsx components/shell/LocalBadge.tsx
git commit -m "feat: add top bar with theme toggle and local-only badge"
```

---

### Task 11: Command palette

**Files:**
- Create: `components/shell/CommandPalette.tsx`
- Test: covered by `searchTools` in `tests/registry.test.ts` (Task 5); interaction verified in the browser.

**Interfaces:**
- Consumes: `allMetas`, `searchTools` (Task 5); `useWorkspace` (Task 6).
- Produces: `<CommandPalette open onClose />`.

- [ ] **Step 1: Write the palette**

Create `components/shell/CommandPalette.tsx`. Ranking is search score first, then recency — `searchTools` already sorts by score, so recency only reorders the ties.

```tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { allMetas, searchTools, GROUP_LABELS } from "@/lib/registry";
import { useWorkspace } from "./WorkspaceProvider";
import { cx } from "@/lib/cx";

export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const { recents } = useWorkspace();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const openerRef = useRef<Element | null>(null);
  const metas = useMemo(() => allMetas(), []);

  const results = useMemo(() => {
    const matched = searchTools(metas, query);
    if (query.trim()) return matched;
    // With no query, the most useful order is what you reached for last.
    const order = new Map(recents.map((r, i) => [r.slug, i]));
    return [...matched].sort(
      (a, b) => (order.get(a.slug) ?? Number.MAX_SAFE_INTEGER) - (order.get(b.slug) ?? Number.MAX_SAFE_INTEGER),
    );
  }, [metas, query, recents]);

  useEffect(() => {
    if (!open) return;
    openerRef.current = document.activeElement;
    setQuery("");
    setActive(0);
    inputRef.current?.focus();
    const priorOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = priorOverflow;
      (openerRef.current as HTMLElement | null)?.focus?.();
    };
  }, [open]);

  // Keep the highlighted row in view when arrowing past the fold.
  useEffect(() => {
    listRef.current?.querySelector('[data-active="true"]')?.scrollIntoView({ block: "nearest" });
  }, [active]);

  if (!open) return null;

  function onKeyDown(event: React.KeyboardEvent) {
    if (event.key === "Escape") { onClose(); return; }
    if (event.key === "ArrowDown") { event.preventDefault(); setActive((i) => Math.min(i + 1, results.length - 1)); }
    if (event.key === "ArrowUp") { event.preventDefault(); setActive((i) => Math.max(i - 1, 0)); }
    if (event.key === "Enter") {
      event.preventDefault();
      const target = results[active];
      if (target) { router.push(`/${target.slug}`); onClose(); }
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-[12vh]">
      <div className="absolute inset-0 bg-black/45" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Search tools"
        onKeyDown={onKeyDown}
        className="relative w-full max-w-lg overflow-hidden rounded-xl bg-surface shadow-lg"
      >
        <input
          ref={inputRef}
          value={query}
          onChange={(event) => { setQuery(event.target.value); setActive(0); }}
          placeholder="Search tools"
          aria-label="Search tools"
          role="combobox"
          aria-expanded
          aria-controls="palette-results"
          aria-activedescendant={results[active] ? `palette-${results[active]!.slug}` : undefined}
          className="w-full border-b border-border bg-transparent px-4 py-3 font-ui text-[14px] text-fg outline-none placeholder:text-fg-muted"
        />
        <ul id="palette-results" ref={listRef} role="listbox" className="max-h-80 overflow-y-auto p-1.5">
          {results.length === 0 ? (
            <li className="px-3 py-6 text-center text-[13px] text-fg-muted">
              No tool matches “{query}”.
            </li>
          ) : results.map((meta, index) => {
            const Icon = meta.icon;
            return (
              <li key={meta.slug}>
                <button
                  id={`palette-${meta.slug}`}
                  role="option"
                  aria-selected={index === active}
                  data-active={index === active}
                  onMouseEnter={() => setActive(index)}
                  onClick={() => { router.push(`/${meta.slug}`); onClose(); }}
                  className={cx(
                    "flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left",
                    index === active ? "bg-primary-tint" : "hover:bg-surface-2",
                  )}
                >
                  <Icon size={15} className="shrink-0 text-fg-muted" aria-hidden />
                  <span className="font-ui text-[13px] text-fg">{meta.name}</span>
                  <span className="ml-auto shrink-0 font-ui text-[10.5px] uppercase tracking-[.14em] text-fg-muted">
                    {GROUP_LABELS[meta.group].split(" ")[0]}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck and commit**

Run: `npm run typecheck`

```bash
git add components/shell/CommandPalette.tsx
git commit -m "feat: add command palette with keyboard navigation"
```

---

### Task 12: App shell layout and the [slug] route

**Files:**
- Create: `components/shell/AppShell.tsx`, `app/[slug]/page.tsx`, `app/not-found.tsx`
- Modify: `app/layout.tsx` — wrap `{children}` in `<AppShell>`

**Interfaces:**
- Consumes: `Rail` (Task 9), `TopBar` (Task 10), `CommandPalette` (Task 11), `WorkspaceProvider` (Task 6), `TOOLS`/`toolBySlug` (Task 5).
- Produces: `<AppShell>`; the route `/{slug}` rendering `toolBySlug(slug).Component`.

- [ ] **Step 1: Write AppShell**

Create `components/shell/AppShell.tsx`. The ⌘K listener lives here, at the one place that owns the palette's open state.

```tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { allMetas } from "@/lib/registry";
import { Rail } from "./Rail";
import { TopBar } from "./TopBar";
import { CommandPalette } from "./CommandPalette";
import { WorkspaceProvider } from "./WorkspaceProvider";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [paletteOpen, setPaletteOpen] = useState(false);
  // Read here, not inside WorkspaceProvider — see the note in that file.
  const knownSlugs = useMemo(() => allMetas().map((m) => m.slug), []);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPaletteOpen((open) => !open);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <WorkspaceProvider knownSlugs={knownSlugs}>
      <div className="flex min-h-dvh">
        <Rail />
        <div className="flex min-w-0 flex-1 flex-col">
          <TopBar onOpenPalette={() => setPaletteOpen(true)} />
          <div className="min-w-0 flex-1">{children}</div>
        </div>
      </div>
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </WorkspaceProvider>
  );
}
```

- [ ] **Step 2: Wire it into the root layout**

In `app/layout.tsx`, add the import and replace the `<body>` children:

```tsx
import { AppShell } from "@/components/shell/AppShell";
```

Replace `{children}` inside `<body>` with:

```tsx
<AppShell>{children}</AppShell>
```

- [ ] **Step 3: Write the dynamic route**

Create `app/[slug]/page.tsx`. `generateStaticParams` comes straight from the registry, so every tool is a prerendered page and no configuration drifts from `TOOLS`.

```tsx
import { notFound } from "next/navigation";
import { TOOLS, toolBySlug } from "@/lib/registry";

export function generateStaticParams() {
  return TOOLS.map((entry) => ({ slug: entry.meta.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const entry = toolBySlug(slug);
  if (!entry) return { title: "Not found — DevTools" };
  return { title: `${entry.meta.name} — DevTools`, description: entry.meta.blurb };
}

export default async function ToolPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const entry = toolBySlug(slug);
  // A static segment such as /settings takes precedence over this route, so
  // reaching here with an unknown slug means the tool genuinely does not exist.
  if (!entry) notFound();
  const { Component } = entry;
  return <Component />;
}
```

- [ ] **Step 4: Write the not-found page**

Create `app/not-found.tsx`. Per the spec's rule that an empty surface teaches, this points at the way back rather than just apologising.

```tsx
import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto max-w-lg p-10">
      <p className="eyebrow">404</p>
      <h1 className="mt-2 font-ui text-[1.375rem] font-bold tracking-[-0.01em] text-fg">No such tool</h1>
      <p className="mt-2 text-[13px] text-fg-muted">
        That address does not match any tool. Press <kbd className="rounded-sm bg-surface-2 px-1 font-ui text-[11px]">⌘K</kbd> to
        search everything available, or start from the dashboard.
      </p>
      <Link href="/" className="mt-4 inline-block font-ui text-[13px] text-primary hover:underline">
        Back to all tools
      </Link>
    </main>
  );
}
```

- [ ] **Step 5: Typecheck and commit**

Run: `npm run typecheck && npm run dev`

Expected: `http://localhost:3000` renders the shell — near-black rail (empty, no tools yet), top bar with a working theme toggle, ⌘K opening a palette that says no tool matches. `http://localhost:3000/nope` renders the 404.

```bash
git add components/shell/AppShell.tsx app/[slug] app/not-found.tsx app/layout.tsx
git commit -m "feat: wire app shell and registry-driven [slug] route"
```

---

### Task 13: Dashboard

**Files:**
- Modify: `app/page.tsx` — replace the Task 1 placeholder entirely
- Create: `components/shell/ToolCard.tsx`

**Interfaces:**
- Consumes: `allMetas`, `groupTools` (Task 5); `useWorkspace`, `RECENTS_SHOWN` (Task 6); `FavouriteStar` (Task 8).
- Produces: `<ToolCard meta />`; the `/` route.

- [ ] **Step 1: Write ToolCard**

Create `components/shell/ToolCard.tsx`:

```tsx
"use client";

import Link from "next/link";
import type { ToolMeta } from "@/lib/registry/types";
import { FavouriteStar } from "@/components/tool/FavouriteStar";

export function ToolCard({ meta }: { meta: ToolMeta }) {
  const Icon = meta.icon;
  return (
    <div className="group relative flex items-start gap-3 rounded-lg bg-surface p-4 shadow-sm transition-shadow hover:shadow-md">
      <span className="mt-0.5 shrink-0 rounded-md bg-surface-2 p-1.5 text-fg-2">
        <Icon size={15} aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        {/* The whole card is the hit target: the pseudo-element covers it, and
            the star sits above it on z-10 so pinning does not navigate. */}
        <Link
          href={`/${meta.slug}`}
          className="font-ui text-[13px] font-semibold text-fg after:absolute after:inset-0 after:content-[''] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
        >
          {meta.name}
        </Link>
        <p className="mt-1 text-[12.5px] leading-snug text-fg-muted">{meta.blurb}</p>
      </div>
      <span className="relative z-10 shrink-0">
        <FavouriteStar slug={meta.slug} name={meta.name} />
      </span>
    </div>
  );
}
```

- [ ] **Step 2: Write the dashboard**

Replace `app/page.tsx` in full:

```tsx
"use client";

import { useMemo } from "react";
import { allMetas, groupTools } from "@/lib/registry";
import { useWorkspace } from "@/components/shell/WorkspaceProvider";
import { RECENTS_SHOWN } from "@/lib/workspace";
import { ToolCard } from "@/components/shell/ToolCard";
import { LocalBadge } from "@/components/shell/LocalBadge";
import type { ToolMeta } from "@/lib/registry/types";

function Section({ label, tools }: { label: string; tools: ToolMeta[] }) {
  if (tools.length === 0) return null;
  return (
    <section>
      <h2 className="eyebrow">{label}</h2>
      <div className="mt-2.5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {tools.map((meta) => <ToolCard key={meta.slug} meta={meta} />)}
      </div>
    </section>
  );
}

export default function Dashboard() {
  const { favourites, recents } = useWorkspace();
  const metas = useMemo(() => allMetas(), []);
  const bySlug = useMemo(() => new Map(metas.map((m) => [m.slug, m])), [metas]);
  const sections = useMemo(() => groupTools(metas), [metas]);

  const pick = (slugs: string[]) =>
    slugs.map((slug) => bySlug.get(slug)).filter((m): m is ToolMeta => m != null);

  return (
    <main className="mx-auto flex max-w-[1400px] flex-col gap-8 p-5 lg:p-8">
      <header>
        <h1 className="font-ui text-[1.375rem] font-bold tracking-[-0.01em] text-fg">DevTools</h1>
        <p className="mt-1.5 max-w-prose text-[13px] leading-relaxed text-fg-muted">
          The small utilities you reach for daily — formatting, encoding, decoding,
          hashing, comparing. Every one runs in this tab.
        </p>
        <div className="mt-3"><LocalBadge /></div>
      </header>

      {/* Recents and Favourites are absent, not empty, on a first visit. */}
      <Section label="Recent" tools={pick(recents.slice(0, RECENTS_SHOWN).map((r) => r.slug))} />
      <Section label="Favourites" tools={pick(favourites)} />

      {sections.map((section) => (
        <Section key={section.group} label={section.label} tools={section.tools} />
      ))}
    </main>
  );
}
```

- [ ] **Step 3: Typecheck and commit**

Run: `npm run typecheck`

```bash
git add app/page.tsx components/shell/ToolCard.tsx
git commit -m "feat: add dashboard with recents, favourites and category grids"
```

---

### Task 14: JSON parsing with position, and the diff engine

**Files:**
- Create: `lib/json/parse.ts`, `lib/tools/json-compare.ts`
- Test: `tests/json-parse.test.ts`, `tests/tools/json-compare.test.ts`

**Interfaces:**
- Consumes: `ToolResult`, `ok`, `err` (Task 4).
- Produces:
  - `parseJson(text: string): ToolResult<unknown>` — errors carry 1-indexed line and column
  - `type DiffKind = "unchanged" | "added" | "removed" | "changed" | "type-changed"`
  - `interface CompareOptions { ignoreKeyOrder; arrayMatching: "index" | "value" | "key"; arrayKeyField; ignoreWhitespace; numericTolerance; ignoreCase }`
  - `DEFAULT_COMPARE_OPTIONS: CompareOptions`
  - `interface DiffNode { path; key; kind; left?; right?; children? }` — **`kind` is authoritative for presence**: `added` means right-only, `removed` means left-only
  - `interface DiffStats { added; removed; changed; typeChanged; total }`
  - `diffValues(left: unknown, right: unknown, options: CompareOptions): DiffNode`
  - `computeStats(root: DiffNode): DiffStats`
  - `compareJson(leftText, rightText, options): ToolResult<{ root: DiffNode; stats: DiffStats }>` — on a parse failure the error message names which side
  - `MAX_DEPTH = 512`

- [ ] **Step 1: Write the failing parse test**

Create `tests/json-parse.test.ts`. A bare "invalid JSON" with no position is worse than the browser console, so position extraction is the whole point of this module.

```ts
import { describe, it, expect } from "vitest";
import { parseJson } from "@/lib/json/parse";

describe("parseJson", () => {
  it("parses valid JSON", () => {
    const result = parseJson('{"a":1}');
    expect(result).toEqual({ ok: true, value: { a: 1 } });
  });

  it("parses top-level scalars", () => {
    expect(parseJson("42")).toEqual({ ok: true, value: 42 });
    expect(parseJson("null")).toEqual({ ok: true, value: null });
  });

  it("reports line and column for a syntax error", () => {
    const result = parseJson('{\n  "a": 1,\n  "b": bad\n}');
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("unreachable");
    expect(result.error.line).toBe(3);
    expect(result.error.column).toBeGreaterThan(1);
  });

  it("points at line 1 for a first-line error", () => {
    const result = parseJson("{bad}");
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("unreachable");
    expect(result.error.line).toBe(1);
  });

  it("gives empty input its own message", () => {
    const result = parseJson("   ");
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("unreachable");
    expect(result.error.message).toMatch(/empty/i);
  });

  it("never throws, whatever it is handed", () => {
    for (const input of ["", "[", "{", '{"a"', " ", "[1,]"]) {
      expect(() => parseJson(input)).not.toThrow();
    }
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run tests/json-parse.test.ts`
Expected: FAIL — cannot resolve `@/lib/json/parse`.

- [ ] **Step 3: Write the parser**

Create `lib/json/parse.ts`. Line and column are computed from the character offset rather than read out of the engine's message: V8 has changed that wording between releases, but the `position N` fragment has been stable, and counting newlines ourselves is version-proof.

```ts
import { err, ok, type ToolResult } from "@/lib/types";

function positionToLineColumn(text: string, position: number): { line: number; column: number } {
  const upTo = text.slice(0, Math.max(0, Math.min(position, text.length)));
  const lines = upTo.split("\n");
  return { line: lines.length, column: (lines[lines.length - 1]?.length ?? 0) + 1 };
}

export function parseJson(text: string): ToolResult<unknown> {
  if (text.trim() === "") return err("Input is empty.", { line: 1, column: 1 });

  try {
    return ok(JSON.parse(text) as unknown);
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : "Invalid JSON.";
    const match = /position (\d+)/.exec(message);
    if (!match) {
      // "Unexpected end of JSON input" carries no position; the end of the
      // text is where the parser gave up, so point there.
      return err(message, positionToLineColumn(text, text.length));
    }
    // Strip the engine's own position suffix — we render our own, and showing
    // both a character offset and a line number reads as two different errors.
    const clean = message
      .replace(/\s*in JSON at position \d+.*$/, ".")
      .replace(/\s*\(line \d+ column \d+\)/, "");
    return err(clean, positionToLineColumn(text, Number(match[1])));
  }
}
```

- [ ] **Step 4: Run it to verify it passes**

Run: `npx vitest run tests/json-parse.test.ts`
Expected: PASS, 6 tests.

- [ ] **Step 5: Write the failing diff-engine test**

Create `tests/tools/json-compare.test.ts`. This is the heaviest suite in the codebase — the tool is the flagship, and every option changes what "different" means.

```ts
import { describe, it, expect } from "vitest";
import {
  compareJson, diffValues, computeStats, DEFAULT_COMPARE_OPTIONS, MAX_DEPTH,
  type CompareOptions, type DiffNode,
} from "@/lib/tools/json-compare";

const OPTS = (patch: Partial<CompareOptions> = {}): CompareOptions => ({
  ...DEFAULT_COMPARE_OPTIONS, ...patch,
});

/** Finds a node by its JSON path, for asserting on one place in the tree. */
function at(root: DiffNode, path: string): DiffNode | undefined {
  if (root.path === path) return root;
  for (const child of root.children ?? []) {
    const found = at(child, path);
    if (found) return found;
  }
  return undefined;
}

describe("diffValues — scalars", () => {
  it("marks equal scalars unchanged", () => {
    expect(diffValues(1, 1, OPTS()).kind).toBe("unchanged");
    expect(diffValues("a", "a", OPTS()).kind).toBe("unchanged");
    expect(diffValues(null, null, OPTS()).kind).toBe("unchanged");
  });

  it("marks differing scalars of the same type as changed", () => {
    expect(diffValues(1, 2, OPTS()).kind).toBe("changed");
  });

  it("distinguishes a type change from a value change", () => {
    expect(diffValues("1", 1, OPTS()).kind).toBe("type-changed");
    expect(diffValues(null, 0, OPTS()).kind).toBe("type-changed");
    // An empty object vs an empty array is a type change, not an empty diff.
    expect(diffValues({}, [], OPTS()).kind).toBe("type-changed");
  });
});

describe("diffValues — objects", () => {
  it("is unchanged when key order differs and ignoreKeyOrder is on", () => {
    expect(diffValues({ a: 1, b: 2 }, { b: 2, a: 1 }, OPTS()).kind).toBe("unchanged");
  });

  it("reports added and removed keys", () => {
    const root = diffValues({ a: 1 }, { b: 2 }, OPTS());
    expect(at(root, "$.a")?.kind).toBe("removed");
    expect(at(root, "$.b")?.kind).toBe("added");
    expect(root.kind).toBe("changed");
  });

  it("recurses into nested objects and builds a dotted path", () => {
    const root = diffValues({ u: { name: "a" } }, { u: { name: "b" } }, OPTS());
    expect(at(root, "$.u.name")?.kind).toBe("changed");
    expect(at(root, "$.u")?.kind).toBe("changed");
  });

  it("marks an added subtree at its root only, not every descendant", () => {
    const root = diffValues({}, { u: { a: 1, b: 2 } }, OPTS());
    expect(at(root, "$.u")?.kind).toBe("added");
    expect(computeStats(root).added).toBe(1);
  });
});

describe("diffValues — arrays", () => {
  it("compares positionally in index mode", () => {
    const root = diffValues([1, 2, 3], [1, 9, 3], OPTS());
    expect(at(root, "$[1]")?.kind).toBe("changed");
    expect(at(root, "$[0]")?.kind).toBe("unchanged");
  });

  it("reports a longer right side as additions in index mode", () => {
    expect(at(diffValues([1], [1, 2], OPTS()), "$[1]")?.kind).toBe("added");
  });

  it("reports a longer left side as removals in index mode", () => {
    expect(at(diffValues([1, 2], [1], OPTS()), "$[1]")?.kind).toBe("removed");
  });

  it("sees a reorder as unchanged in value mode but changed in index mode", () => {
    expect(diffValues([1, 2], [2, 1], OPTS({ arrayMatching: "value" })).kind).toBe("unchanged");
    expect(diffValues([1, 2], [2, 1], OPTS({ arrayMatching: "index" })).kind).toBe("changed");
  });

  it("matches objects by a named field in key mode", () => {
    const left = [{ id: "a", v: 1 }, { id: "b", v: 2 }];
    const right = [{ id: "b", v: 2 }, { id: "a", v: 99 }];
    const root = diffValues(left, right, OPTS({ arrayMatching: "key", arrayKeyField: "id" }));
    expect(at(root, "$[id=a].v")?.kind).toBe("changed");
    expect(at(root, "$[id=b]")?.kind).toBe("unchanged");
  });

  it("reports key-mode elements present on only one side", () => {
    const root = diffValues(
      [{ id: "a" }], [{ id: "b" }],
      OPTS({ arrayMatching: "key", arrayKeyField: "id" }),
    );
    expect(at(root, "$[id=a]")?.kind).toBe("removed");
    expect(at(root, "$[id=b]")?.kind).toBe("added");
  });
});

describe("diffValues — comparison options", () => {
  it("treats numbers inside the tolerance as equal", () => {
    expect(diffValues(1.0001, 1.0002, OPTS({ numericTolerance: 0.001 })).kind).toBe("unchanged");
    expect(diffValues(1.0001, 1.9, OPTS({ numericTolerance: 0.001 })).kind).toBe("changed");
  });

  it("collapses whitespace when asked", () => {
    expect(diffValues("a  b", " a b ", OPTS({ ignoreWhitespace: true })).kind).toBe("unchanged");
    expect(diffValues("a  b", " a b ", OPTS({ ignoreWhitespace: false })).kind).toBe("changed");
  });

  it("ignores string case when asked", () => {
    expect(diffValues("Hello", "hello", OPTS({ ignoreCase: true })).kind).toBe("unchanged");
    // Keys are structural, so ignoreCase must NOT merge two different keys.
    expect(diffValues({ A: 1 }, { a: 1 }, OPTS({ ignoreCase: true })).kind).toBe("changed");
  });
});

describe("computeStats", () => {
  it("counts leaves for changes and subtree roots for add/remove", () => {
    const root = diffValues(
      { keep: 1, drop: 2, edit: 3, retype: "4" },
      { keep: 1, edit: 30, retype: 4, gain: { deep: true } },
      OPTS(),
    );
    const stats = computeStats(root);
    expect(stats.removed).toBe(1);     // drop
    expect(stats.added).toBe(1);       // gain, counted once not twice
    expect(stats.changed).toBe(1);     // edit
    expect(stats.typeChanged).toBe(1); // retype
  });

  it("reports zero differences for identical input", () => {
    const stats = computeStats(diffValues({ a: [1, { b: 2 }] }, { a: [1, { b: 2 }] }, OPTS()));
    expect(stats).toMatchObject({ added: 0, removed: 0, changed: 0, typeChanged: 0 });
  });
});

describe("compareJson", () => {
  it("is insensitive to formatting — reformatting one side yields no diff", () => {
    const result = compareJson('{"a":1,"b":[2,3]}', '{\n  "a": 1,\n  "b": [ 2, 3 ]\n}', OPTS());
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("unreachable");
    expect(computeStats(result.value.root)).toMatchObject({
      added: 0, removed: 0, changed: 0, typeChanged: 0,
    });
  });

  it("names the failing side and carries a position", () => {
    const result = compareJson("{bad}", "{}", OPTS());
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("unreachable");
    expect(result.error.message).toMatch(/left/i);
    expect(result.error.line).toBe(1);
  });

  it("names the right side when that is the broken one", () => {
    const result = compareJson("{}", "{bad}", OPTS());
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("unreachable");
    expect(result.error.message).toMatch(/right/i);
  });

  it("takes the last value for a duplicate key, matching JSON.parse", () => {
    const result = compareJson('{"a":1,"a":2}', '{"a":2}', OPTS());
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("unreachable");
    expect(computeStats(result.value.root).changed).toBe(0);
  });

  it("reports rather than overflowing on structures deeper than MAX_DEPTH", () => {
    let deep = "null";
    for (let i = 0; i < MAX_DEPTH + 50; i += 1) deep = `{"a":${deep}}`;
    const result = compareJson(deep, deep, OPTS());
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("unreachable");
    expect(result.error.message).toMatch(/deep/i);
  });

  it("handles a 10,000-element array without hanging", () => {
    const left = JSON.stringify(Array.from({ length: 10_000 }, (_, i) => i));
    const right = JSON.stringify(Array.from({ length: 10_000 }, (_, i) => (i === 5000 ? -1 : i)));
    const started = Date.now();
    const result = compareJson(left, right, OPTS());
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("unreachable");
    expect(computeStats(result.value.root).changed).toBe(1);
    expect(Date.now() - started).toBeLessThan(3000);
  });
});
```

- [ ] **Step 6: Run it to verify it fails**

Run: `npx vitest run tests/tools/json-compare.test.ts`
Expected: FAIL — cannot resolve `@/lib/tools/json-compare`.

- [ ] **Step 7: Write the diff engine**

Create `lib/tools/json-compare.ts`. Pure logic: no React, no DOM.

```ts
import { parseJson } from "@/lib/json/parse";
import { err, ok, type ToolResult } from "@/lib/types";

export const MAX_DEPTH = 512;

export type DiffKind = "unchanged" | "added" | "removed" | "changed" | "type-changed";

export interface CompareOptions {
  /** Objects compared as key sets rather than in document order. */
  ignoreKeyOrder: boolean;
  arrayMatching: "index" | "value" | "key";
  /** Field name used when arrayMatching is "key". */
  arrayKeyField: string;
  ignoreWhitespace: boolean;
  /** Numbers within the tolerance compare equal. Guards float noise. */
  numericTolerance: number;
  /** Applies to string VALUES only. Keys are structural. */
  ignoreCase: boolean;
}

export const DEFAULT_COMPARE_OPTIONS: CompareOptions = {
  ignoreKeyOrder: true,
  arrayMatching: "index",
  arrayKeyField: "id",
  ignoreWhitespace: false,
  numericTolerance: 0,
  ignoreCase: false,
};

export interface DiffNode {
  /** JSON path, e.g. "$.users[2].email", or "$[id=a].v" in key mode. */
  path: string;
  key: string | number | null;
  /**
   * Authoritative for presence: "added" means the node exists only on the
   * right, "removed" only on the left. Do not infer presence from whether
   * `left` / `right` happen to be set.
   */
  kind: DiffKind;
  left?: unknown;
  right?: unknown;
  children?: DiffNode[];
}

export interface DiffStats {
  added: number;
  removed: number;
  changed: number;
  typeChanged: number;
  total: number;
}

class DepthExceeded extends Error {}

type JsonType = "null" | "boolean" | "number" | "string" | "array" | "object";

function typeOf(value: unknown): JsonType {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  const primitive = typeof value;
  if (primitive === "boolean" || primitive === "number" || primitive === "string") return primitive;
  return "object";
}

function normaliseString(value: string, options: CompareOptions): string {
  let out = value;
  if (options.ignoreWhitespace) out = out.trim().replace(/\s+/g, " ");
  if (options.ignoreCase) out = out.toLowerCase();
  return out;
}

function scalarsEqual(left: unknown, right: unknown, options: CompareOptions): boolean {
  if (typeof left === "number" && typeof right === "number") {
    return options.numericTolerance > 0
      ? Math.abs(left - right) <= options.numericTolerance
      : left === right;
  }
  if (typeof left === "string" && typeof right === "string") {
    return normaliseString(left, options) === normaliseString(right, options);
  }
  return left === right;
}

/** Deep equality under the same options — used for array value matching. */
function deepEqual(left: unknown, right: unknown, options: CompareOptions, depth: number): boolean {
  if (depth > MAX_DEPTH) throw new DepthExceeded();
  const type = typeOf(left);
  if (type !== typeOf(right)) return false;

  if (type === "array") {
    const a = left as unknown[];
    const b = right as unknown[];
    return a.length === b.length && a.every((item, i) => deepEqual(item, b[i], options, depth + 1));
  }
  if (type === "object") {
    const a = left as Record<string, unknown>;
    const b = right as Record<string, unknown>;
    const aKeys = Object.keys(a);
    if (aKeys.length !== Object.keys(b).length) return false;
    return aKeys.every(
      (k) => Object.prototype.hasOwnProperty.call(b, k) && deepEqual(a[k], b[k], options, depth + 1),
    );
  }
  return scalarsEqual(left, right, options);
}

function childPath(parent: string, key: string | number): string {
  return typeof key === "number" ? `${parent}[${key}]` : `${parent}.${key}`;
}

/** Marks a whole value as present on one side only. */
function oneSided(
  value: unknown,
  kind: "added" | "removed",
  path: string,
  key: string | number | null,
  depth: number,
): DiffNode {
  if (depth > MAX_DEPTH) throw new DepthExceeded();
  const side = kind === "added" ? { right: value } : { left: value };
  const type = typeOf(value);

  let children: DiffNode[] | undefined;
  if (type === "array") {
    children = (value as unknown[]).map((item, i) =>
      oneSided(item, kind, childPath(path, i), i, depth + 1));
  } else if (type === "object") {
    children = Object.entries(value as Record<string, unknown>).map(([k, v]) =>
      oneSided(v, kind, childPath(path, k), k, depth + 1));
  }

  return { path, key, kind, ...side, ...(children ? { children } : {}) };
}

function rollUp(children: DiffNode[]): DiffKind {
  return children.every((c) => c.kind === "unchanged") ? "unchanged" : "changed";
}

function diffObjects(
  left: Record<string, unknown>,
  right: Record<string, unknown>,
  options: CompareOptions,
  path: string,
  key: string | number | null,
  depth: number,
): DiffNode {
  const leftKeys = Object.keys(left);
  const rightKeys = Object.keys(right);
  // With ignoreKeyOrder the union is sorted so both panes list keys the same
  // way; without it we keep the left document's order and append right-only
  // keys after, which is what makes a reordering visible.
  const union = options.ignoreKeyOrder
    ? [...new Set([...leftKeys, ...rightKeys])].sort()
    : [...leftKeys, ...rightKeys.filter((k) => !leftKeys.includes(k))];

  const children = union.map((k) => {
    const inLeft = Object.prototype.hasOwnProperty.call(left, k);
    const inRight = Object.prototype.hasOwnProperty.call(right, k);
    if (inLeft && inRight) return walk(left[k], right[k], options, childPath(path, k), k, depth + 1);
    return oneSided(
      inLeft ? left[k] : right[k],
      inLeft ? "removed" : "added",
      childPath(path, k), k, depth + 1,
    );
  });

  return { path, key, kind: rollUp(children), left, right, children };
}

function diffArraysByIndex(
  left: unknown[], right: unknown[], options: CompareOptions,
  path: string, key: string | number | null, depth: number,
): DiffNode {
  const children: DiffNode[] = [];
  for (let i = 0; i < Math.max(left.length, right.length); i += 1) {
    if (i < left.length && i < right.length) {
      children.push(walk(left[i], right[i], options, childPath(path, i), i, depth + 1));
    } else if (i < left.length) {
      children.push(oneSided(left[i], "removed", childPath(path, i), i, depth + 1));
    } else {
      children.push(oneSided(right[i], "added", childPath(path, i), i, depth + 1));
    }
  }
  return { path, key, kind: rollUp(children), left, right, children };
}

function diffArraysByValue(
  left: unknown[], right: unknown[], options: CompareOptions,
  path: string, key: string | number | null, depth: number,
): DiffNode {
  const takenRight = new Set<number>();
  const children: DiffNode[] = [];

  // Greedy: each left element claims the first unclaimed equal right element.
  // A reorder therefore matches everything and reads as unchanged.
  left.forEach((item, i) => {
    const match = right.findIndex(
      (candidate, j) => !takenRight.has(j) && deepEqual(item, candidate, options, depth + 1),
    );
    if (match === -1) {
      children.push(oneSided(item, "removed", childPath(path, i), i, depth + 1));
    } else {
      takenRight.add(match);
      children.push({
        path: childPath(path, i), key: i, kind: "unchanged", left: item, right: right[match],
      });
    }
  });

  right.forEach((item, j) => {
    if (!takenRight.has(j)) children.push(oneSided(item, "added", childPath(path, j), j, depth + 1));
  });

  return { path, key, kind: rollUp(children), left, right, children };
}

function diffArraysByKey(
  left: unknown[], right: unknown[], options: CompareOptions,
  path: string, key: string | number | null, depth: number,
): DiffNode {
  const field = options.arrayKeyField;
  const keyOf = (item: unknown): string | null => {
    if (typeOf(item) !== "object") return null;
    const raw = (item as Record<string, unknown>)[field];
    return typeof raw === "string" || typeof raw === "number" ? String(raw) : null;
  };

  const leftKeyed = new Map<string, unknown>();
  const leftUnkeyed: unknown[] = [];
  for (const item of left) {
    const k = keyOf(item);
    if (k === null) leftUnkeyed.push(item); else leftKeyed.set(k, item);
  }
  const rightKeyed = new Map<string, unknown>();
  const rightUnkeyed: unknown[] = [];
  for (const item of right) {
    const k = keyOf(item);
    if (k === null) rightUnkeyed.push(item); else rightKeyed.set(k, item);
  }

  const children: DiffNode[] = [];
  for (const k of [...new Set([...leftKeyed.keys(), ...rightKeyed.keys()])]) {
    const nodePath = `${path}[${field}=${k}]`;
    const inLeft = leftKeyed.has(k);
    const inRight = rightKeyed.has(k);
    if (inLeft && inRight) {
      children.push(walk(leftKeyed.get(k), rightKeyed.get(k), options, nodePath, k, depth + 1));
    } else {
      children.push(oneSided(
        inLeft ? leftKeyed.get(k) : rightKeyed.get(k),
        inLeft ? "removed" : "added", nodePath, k, depth + 1,
      ));
    }
  }

  // Elements with no usable key cannot be matched by identity, so they fall
  // back to positional comparison among themselves.
  if (leftUnkeyed.length || rightUnkeyed.length) {
    const positional = diffArraysByIndex(leftUnkeyed, rightUnkeyed, options, path, key, depth);
    children.push(...(positional.children ?? []));
  }

  return { path, key, kind: rollUp(children), left, right, children };
}

function walk(
  left: unknown, right: unknown, options: CompareOptions,
  path: string, key: string | number | null, depth: number,
): DiffNode {
  if (depth > MAX_DEPTH) throw new DepthExceeded();

  const leftType = typeOf(left);
  if (leftType !== typeOf(right)) return { path, key, kind: "type-changed", left, right };

  if (leftType === "object") {
    return diffObjects(
      left as Record<string, unknown>, right as Record<string, unknown>,
      options, path, key, depth,
    );
  }
  if (leftType === "array") {
    const a = left as unknown[];
    const b = right as unknown[];
    if (options.arrayMatching === "value") return diffArraysByValue(a, b, options, path, key, depth);
    if (options.arrayMatching === "key") return diffArraysByKey(a, b, options, path, key, depth);
    return diffArraysByIndex(a, b, options, path, key, depth);
  }

  return {
    path, key,
    kind: scalarsEqual(left, right, options) ? "unchanged" : "changed",
    left, right,
  };
}

export function diffValues(left: unknown, right: unknown, options: CompareOptions): DiffNode {
  return walk(left, right, options, "$", null, 0);
}

export function computeStats(root: DiffNode): DiffStats {
  const stats: DiffStats = { added: 0, removed: 0, changed: 0, typeChanged: 0, total: 0 };

  function visit(node: DiffNode) {
    stats.total += 1;
    if (node.kind === "added" || node.kind === "removed") {
      // Count the subtree ROOT only. "+1" for a whole added object reads the
      // way a person counts it; "+1 for the object and +1 per field" does not.
      stats[node.kind] += 1;
      return;
    }
    if (node.kind === "type-changed") { stats.typeChanged += 1; return; }
    // A container is only ever "changed" because a descendant is, so counting
    // it as well would double-count every edit.
    if (node.kind === "changed" && !node.children) { stats.changed += 1; return; }
    for (const child of node.children ?? []) visit(child);
  }

  visit(root);
  return stats;
}

export function compareJson(
  leftText: string, rightText: string, options: CompareOptions,
): ToolResult<{ root: DiffNode; stats: DiffStats }> {
  const position = (e: { line?: number; column?: number }) => ({
    ...(e.line != null ? { line: e.line } : {}),
    ...(e.column != null ? { column: e.column } : {}),
  });

  const left = parseJson(leftText);
  if (!left.ok) return err(`Left side: ${left.error.message}`, position(left.error));

  const right = parseJson(rightText);
  if (!right.ok) return err(`Right side: ${right.error.message}`, position(right.error));

  try {
    const root = diffValues(left.value, right.value, options);
    return ok({ root, stats: computeStats(root) });
  } catch (cause) {
    if (cause instanceof DepthExceeded) {
      return err(`Structure nests deeper than ${MAX_DEPTH} levels, which is past what this tool will walk.`);
    }
    throw cause;
  }
}
```

- [ ] **Step 8: Run the tests**

Run: `npx vitest run tests/tools/json-compare.test.ts`
Expected: PASS, 24 tests. If the 10,000-element test exceeds 3s, check that it is running in `index` mode (O(n)) rather than `value` mode (O(n²)) before changing any code.

- [ ] **Step 9: Commit**

```bash
git add lib/json lib/tools/json-compare.ts tests/json-parse.test.ts tests/tools/json-compare.test.ts
git commit -m "feat: add structural JSON diff engine with positional parse errors"
```

---

### Task 15: Aligned row model for the two panes

**Files:**
- Create: `lib/tools/json-compare-rows.ts`
- Test: `tests/tools/json-compare-rows.test.ts`

**Interfaces:**
- Consumes: `DiffNode`, `DiffKind` (Task 14).
- Produces:
  - `type Gutter = " " | "+" | "-" | "~" | "!"`
  - `GUTTER_FOR: Record<DiffKind, Gutter>`
  - `interface DiffRow { index; depth; gutter; kind; leftText: string | null; rightText: string | null; path; isDifference }`
  - `toRows(root: DiffNode): DiffRow[]`

A `null` on one side means a filler row: that pane renders a blank line, so matched keys stay on the same visual line and synchronised scrolling is correct.

- [ ] **Step 1: Write the failing test**

Create `tests/tools/json-compare-rows.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { diffValues, DEFAULT_COMPARE_OPTIONS } from "@/lib/tools/json-compare";
import { toRows } from "@/lib/tools/json-compare-rows";

const rowsFor = (left: unknown, right: unknown) =>
  toRows(diffValues(left, right, DEFAULT_COMPARE_OPTIONS));

describe("toRows", () => {
  it("emits both panes for an unchanged scalar", () => {
    const rows = rowsFor(1, 1);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      gutter: " ", leftText: "1", rightText: "1", isDifference: false,
    });
  });

  it("brackets an object with an opening and a closing row", () => {
    expect(rowsFor({ a: 1 }, { a: 1 }).map((r) => r.leftText)).toEqual(["{", '"a": 1', "}"]);
  });

  it("blanks the left pane for an added key and marks the gutter", () => {
    const added = rowsFor({}, { a: 1 }).find((r) => r.path === "$.a");
    expect(added).toMatchObject({
      gutter: "+", leftText: null, rightText: '"a": 1', isDifference: true,
    });
  });

  it("blanks the right pane for a removed key", () => {
    expect(rowsFor({ a: 1 }, {}).find((r) => r.path === "$.a")).toMatchObject({
      gutter: "-", rightText: null,
    });
  });

  it("shows both values on a changed row", () => {
    expect(rowsFor({ a: 1 }, { a: 2 }).find((r) => r.path === "$.a")).toMatchObject({
      gutter: "~", leftText: '"a": 1', rightText: '"a": 2',
    });
  });

  it("uses ! for a type change", () => {
    expect(rowsFor({ a: "1" }, { a: 1 }).find((r) => r.path === "$.a")?.gutter).toBe("!");
  });

  it("never emits a row that is blank on both sides", () => {
    // Every row occupies one line in BOTH panes; a null is a blank line, not
    // a missing one. That invariant is what keeps the panes aligned.
    const rows = rowsFor({ a: 1, gone: 2 }, { a: 1, added: 3 });
    expect(rows.every((r) => r.leftText !== null || r.rightText !== null)).toBe(true);
  });

  it("indents nested structures by depth", () => {
    expect(rowsFor({ u: { n: 1 } }, { u: { n: 1 } }).find((r) => r.path === "$.u.n")?.depth).toBe(2);
  });

  it("renders array elements without a key label", () => {
    expect(rowsFor([1], [1]).map((r) => r.leftText)).toEqual(["[", "1", "]"]);
  });

  it("expands an added object across its own rows", () => {
    const rows = rowsFor({}, { u: { a: 1 } });
    const differing = rows.filter((r) => r.isDifference);
    expect(differing.map((r) => r.path)).toContain("$.u");
    expect(differing.map((r) => r.path)).toContain("$.u.a");
    expect(differing.every((r) => r.leftText === null)).toBe(true);
  });

  it("assigns sequential indices for jump-to-next-difference", () => {
    const rows = rowsFor({ a: 1, b: 2 }, { a: 9, b: 8 });
    expect(rows.map((r) => r.index)).toEqual(rows.map((_, i) => i));
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run tests/tools/json-compare-rows.test.ts`
Expected: FAIL — cannot resolve `@/lib/tools/json-compare-rows`.

- [ ] **Step 3: Write the row model**

Create `lib/tools/json-compare-rows.ts`:

```ts
import type { DiffKind, DiffNode } from "./json-compare";

export type Gutter = " " | "+" | "-" | "~" | "!";

export const GUTTER_FOR: Record<DiffKind, Gutter> = {
  unchanged: " ",
  added: "+",
  removed: "-",
  changed: "~",
  "type-changed": "!",
};

export interface DiffRow {
  index: number;
  depth: number;
  /**
   * Not decoration. Colour alone never carries meaning in this system, so a
   * colourblind reader gets the classification from this glyph.
   */
  gutter: Gutter;
  kind: DiffKind;
  /** null renders as a blank line, keeping the two panes aligned. */
  leftText: string | null;
  rightText: string | null;
  path: string;
  isDifference: boolean;
}

function label(key: string | number | null): string {
  // Array elements and the root carry no key label; object members do.
  return typeof key === "string" ? `"${key}": ` : "";
}

function scalarText(value: unknown): string {
  return typeof value === "string" ? JSON.stringify(value) : String(value);
}

function brackets(value: unknown): [string, string] {
  return Array.isArray(value) ? ["[", "]"] : ["{", "}"];
}

export function toRows(root: DiffNode): DiffRow[] {
  const rows: Omit<DiffRow, "index">[] = [];

  function emit(node: DiffNode, depth: number) {
    const gutter = GUTTER_FOR[node.kind];
    const isDifference = node.kind !== "unchanged";
    // Presence comes from `kind`, which the engine documents as authoritative.
    const showLeft = node.kind !== "added";
    const showRight = node.kind !== "removed";

    if (node.children === undefined) {
      rows.push({
        depth, gutter, kind: node.kind, path: node.path, isDifference,
        leftText: showLeft ? `${label(node.key)}${scalarText(node.left)}` : null,
        rightText: showRight ? `${label(node.key)}${scalarText(node.right)}` : null,
      });
      return;
    }

    const [open, close] = brackets(showLeft ? node.left : node.right);

    rows.push({
      depth, gutter, kind: node.kind, path: node.path, isDifference,
      leftText: showLeft ? `${label(node.key)}${open}` : null,
      rightText: showRight ? `${label(node.key)}${open}` : null,
    });

    for (const child of node.children) emit(child, depth + 1);

    // The closing bracket carries the container's own classification, so an
    // added block is tinted end to end rather than stopping short of its brace.
    rows.push({
      depth, gutter, kind: node.kind, path: `${node.path}#close`, isDifference,
      leftText: showLeft ? close : null,
      rightText: showRight ? close : null,
    });
  }

  emit(root, 0);
  return rows.map((row, index) => ({ ...row, index }));
}
```

- [ ] **Step 4: Run the tests**

Run: `npx vitest run tests/tools/json-compare-rows.test.ts`
Expected: PASS, 11 tests.

- [ ] **Step 5: Commit**

```bash
git add lib/tools/json-compare-rows.ts tests/tools/json-compare-rows.test.ts
git commit -m "feat: add aligned row model for the JSON Compare panes"
```

---

### Task 16: JSON Compare UI and registration

**Files:**
- Create: `components/tools/JsonCompare.tsx`, `lib/tools/json-compare-sample.ts`
- Modify: `lib/registry/index.ts` — add the first `TOOLS` entry

**Interfaces:**
- Consumes: `compareJson`, `DEFAULT_COMPARE_OPTIONS`, `CompareOptions`, `DiffStats` (Task 14); `toRows`, `DiffRow` (Task 15); `ToolShell`, `useToolState`, `ErrorNote` (Task 8); `Button`, `Toggle`, `Segmented`, `Select`, `CodeArea`, `Field` (Task 7).
- Produces: the registered tool at `/json-compare`; `SAMPLE_LEFT`, `SAMPLE_RIGHT`.

- [ ] **Step 1: Write the sample payload**

Create `lib/tools/json-compare-sample.ts`. Every tool ships a sample so an empty page can teach rather than sit blank. This pair deliberately exercises all four classifications: a changed value, a type change, a removed key, and an added object.

```ts
export const SAMPLE_LEFT = JSON.stringify(
  {
    service: "checkout",
    version: "2.1.0",
    replicas: 3,
    port: "8080",
    features: ["cart", "coupons"],
    limits: { cpu: "500m", memory: "512Mi" },
    deprecated: true,
  },
  null,
  2,
);

export const SAMPLE_RIGHT = JSON.stringify(
  {
    service: "checkout",
    version: "2.2.0",
    replicas: 5,
    port: 8080,
    features: ["cart", "coupons", "gift-cards"],
    limits: { cpu: "500m", memory: "1Gi" },
    probes: { liveness: "/healthz", readiness: "/ready" },
  },
  null,
  2,
);
```

- [ ] **Step 2: Write the tool component**

Create `components/tools/JsonCompare.tsx`. Two things carry the design rules here: every tinted row also carries a gutter glyph (the Status Escape Rule), and the panes scroll together because `toRows` guarantees both sides have the same number of lines.

```tsx
"use client";

import { useMemo, useRef, useState, useEffect } from "react";
import { Eraser, FileJson } from "lucide-react";
import type { ToolMeta } from "@/lib/registry/types";
import { compareJson, DEFAULT_COMPARE_OPTIONS, type CompareOptions } from "@/lib/tools/json-compare";
import { toRows, type DiffRow } from "@/lib/tools/json-compare-rows";
import { SAMPLE_LEFT, SAMPLE_RIGHT } from "@/lib/tools/json-compare-sample";
import { ToolShell } from "@/components/tool/ToolShell";
import { useToolState } from "@/components/tool/useToolState";
import { ErrorNote } from "@/components/tool/ErrorNote";
import { Button } from "@/components/ui/Button";
import { Toggle } from "@/components/ui/Toggle";
import { Select } from "@/components/ui/Select";
import { CodeArea } from "@/components/ui/CodeArea";
import { cx } from "@/lib/cx";

interface State {
  left: string;
  right: string;
  options: CompareOptions;
}

const DEFAULTS: State = { left: "", right: "", options: DEFAULT_COMPARE_OPTIONS };

function isState(value: unknown): value is State {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as State;
  return typeof candidate.left === "string"
    && typeof candidate.right === "string"
    && typeof candidate.options === "object" && candidate.options !== null
    && typeof candidate.options.ignoreKeyOrder === "boolean"
    && ["index", "value", "key"].includes(candidate.options.arrayMatching);
}

const ROW_TINT: Record<DiffRow["kind"], string> = {
  unchanged: "",
  added: "bg-up-tint",
  removed: "bg-rose-tint",
  changed: "bg-warn-tint",
  "type-changed": "bg-warn-tint",
};

const GUTTER_TEXT: Record<DiffRow["kind"], string> = {
  unchanged: "text-fg-muted",
  added: "text-up",
  removed: "text-rose",
  changed: "text-warn",
  "type-changed": "text-warn",
};

function Pane({
  rows, side, label, activeIndex, scrollRef,
}: {
  rows: DiffRow[];
  side: "leftText" | "rightText";
  label: string;
  activeIndex: number | null;
  scrollRef: React.RefObject<HTMLDivElement | null>;
}) {
  return (
    <div className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-lg bg-surface shadow-sm">
      <p className="eyebrow border-b border-border px-3 py-2">{label}</p>
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-auto">
        <pre className="w-max min-w-full font-ui text-[12.5px] leading-[1.6]">
          {rows.map((row) => {
            const text = row[side];
            return (
              <div
                key={`${row.index}-${side}`}
                data-row={row.index}
                className={cx(
                  "flex items-start px-2",
                  ROW_TINT[row.kind],
                  activeIndex === row.index && "ring-1 ring-inset ring-[var(--ring)]",
                )}
              >
                {/* The glyph, not the tint, is what carries the classification. */}
                <span aria-hidden className={cx("w-4 shrink-0 select-none", GUTTER_TEXT[row.kind])}>
                  {row.gutter}
                </span>
                <span className="whitespace-pre text-fg">
                  {text === null ? "" : `${"  ".repeat(row.depth)}${text}`}
                </span>
              </div>
            );
          })}
        </pre>
      </div>
    </div>
  );
}

export function JsonCompare({ meta }: { meta: ToolMeta }) {
  const [state, update, reset] = useToolState<State>(meta, DEFAULTS, isState);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const leftScroll = useRef<HTMLDivElement>(null);
  const rightScroll = useRef<HTMLDivElement>(null);

  const result = useMemo(
    () => (state.left.trim() && state.right.trim()
      ? compareJson(state.left, state.right, state.options)
      : null),
    [state.left, state.right, state.options],
  );

  const rows = useMemo(() => (result?.ok ? toRows(result.value.root) : []), [result]);
  const differences = useMemo(() => rows.filter((r) => r.isDifference), [rows]);

  // The panes are two independent scroll containers holding the same number of
  // lines, so mirroring scrollTop keeps matched keys on the same screen line.
  useEffect(() => {
    const left = leftScroll.current;
    const right = rightScroll.current;
    if (!left || !right) return;
    let syncing = false;
    const mirror = (from: HTMLDivElement, to: HTMLDivElement) => () => {
      if (syncing) return;
      syncing = true;
      to.scrollTop = from.scrollTop;
      requestAnimationFrame(() => { syncing = false; });
    };
    const onLeft = mirror(left, right);
    const onRight = mirror(right, left);
    left.addEventListener("scroll", onLeft);
    right.addEventListener("scroll", onRight);
    return () => {
      left.removeEventListener("scroll", onLeft);
      right.removeEventListener("scroll", onRight);
    };
  }, [rows.length]);

  function jump(direction: 1 | -1) {
    if (differences.length === 0) return;
    const current = differences.findIndex((r) => r.index === activeIndex);
    const next = current === -1
      ? (direction === 1 ? 0 : differences.length - 1)
      : (current + direction + differences.length) % differences.length;
    const target = differences[next]!;
    setActiveIndex(target.index);
    leftScroll.current
      ?.querySelector(`[data-row="${target.index}"]`)
      ?.scrollIntoView({ block: "center" });
  }

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      // Only when the user is reading the diff, never while typing in a pane.
      const tag = (event.target as HTMLElement | null)?.tagName;
      if (tag === "TEXTAREA" || tag === "INPUT") return;
      if (event.key === "n") { event.preventDefault(); jump(1); }
      if (event.key === "p") { event.preventDefault(); jump(-1); }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const stats = result?.ok ? result.value.stats : null;
  const setOption = (patch: Partial<CompareOptions>) =>
    update({ options: { ...state.options, ...patch } });

  return (
    <ToolShell
      meta={meta}
      shareState={state}
      actions={
        <>
          <Button size="sm" onClick={() => update({ left: SAMPLE_LEFT, right: SAMPLE_RIGHT })}>
            <FileJson size={13} aria-hidden />
            Load sample
          </Button>
          <Button size="sm" onClick={reset}>
            <Eraser size={13} aria-hidden />
            Clear
          </Button>
        </>
      }
      options={
        <>
          <Toggle
            checked={state.options.ignoreKeyOrder}
            onChange={(v) => setOption({ ignoreKeyOrder: v })}
            label="Ignore key order"
          />
          <Toggle
            checked={state.options.ignoreWhitespace}
            onChange={(v) => setOption({ ignoreWhitespace: v })}
            label="Ignore whitespace"
          />
          <Toggle
            checked={state.options.ignoreCase}
            onChange={(v) => setOption({ ignoreCase: v })}
            label="Ignore case"
          />
          <label className="flex items-center gap-2">
            <span className="eyebrow">Arrays</span>
            <Select
              value={state.options.arrayMatching}
              ariaLabel="Array matching mode"
              onChange={(v) => setOption({ arrayMatching: v })}
              options={[
                { value: "index", label: "By index" },
                { value: "value", label: "By value" },
                { value: "key", label: "By key field" },
              ]}
            />
          </label>
          {state.options.arrayMatching === "key" ? (
            <label className="flex items-center gap-2">
              <span className="eyebrow">Key field</span>
              <input
                value={state.options.arrayKeyField}
                onChange={(e) => setOption({ arrayKeyField: e.target.value })}
                aria-label="Array key field"
                className="h-9 w-24 rounded-md border border-border bg-surface px-2 font-ui text-[13px] text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
              />
            </label>
          ) : null}
          <label className="flex items-center gap-2">
            <span className="eyebrow">Tolerance</span>
            <input
              type="number"
              step="any"
              min="0"
              value={state.options.numericTolerance}
              onChange={(e) => setOption({ numericTolerance: Number(e.target.value) || 0 })}
              aria-label="Numeric tolerance"
              className="h-9 w-24 rounded-md border border-border bg-surface px-2 font-ui text-[13px] text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
            />
          </label>
        </>
      }
    >
      <div className="flex h-[calc(100dvh-15rem)] min-h-[26rem] flex-col gap-3">
        <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-2">
          <CodeArea
            value={state.left}
            onChange={(left) => update({ left })}
            ariaLabel="Left JSON"
            placeholder="Paste the original JSON"
          />
          <CodeArea
            value={state.right}
            onChange={(right) => update({ right })}
            ariaLabel="Right JSON"
            placeholder="Paste the JSON to compare against"
          />
        </div>

        {result && !result.ok ? <ErrorNote error={result.error} /> : null}

        {stats ? (
          <div className="flex flex-wrap items-center gap-4 rounded-lg bg-surface px-4 py-2.5 shadow-sm">
            {/* Every figure carries its word, so the row reads without colour. */}
            <span className="font-ui text-[12.5px] text-up tabular">+{stats.added} added</span>
            <span className="font-ui text-[12.5px] text-rose tabular">-{stats.removed} removed</span>
            <span className="font-ui text-[12.5px] text-warn tabular">~{stats.changed} changed</span>
            <span className="font-ui text-[12.5px] text-warn tabular">!{stats.typeChanged} retyped</span>
            <span className="font-ui text-[12.5px] text-fg-muted tabular">{stats.total} nodes compared</span>
            <div className="ml-auto flex items-center gap-2">
              <span className="text-[12px] text-fg-muted">
                {differences.length === 0 ? "No differences" : `${differences.length} differing lines`}
              </span>
              <Button size="sm" onClick={() => jump(-1)} disabled={!differences.length}>Prev</Button>
              <Button size="sm" onClick={() => jump(1)} disabled={!differences.length}>Next</Button>
            </div>
          </div>
        ) : null}

        {rows.length > 0 ? (
          <div className="flex min-h-0 flex-[2] gap-3">
            <Pane rows={rows} side="leftText" label="Left" activeIndex={activeIndex} scrollRef={leftScroll} />
            <Pane rows={rows} side="rightText" label="Right" activeIndex={activeIndex} scrollRef={rightScroll} />
          </div>
        ) : (
          // An empty surface teaches: say what goes here and offer the sample.
          <div className="flex flex-[2] items-center justify-center rounded-lg bg-surface p-8 text-center shadow-sm">
            <p className="max-w-sm text-[13px] leading-relaxed text-fg-muted">
              Paste JSON into both panes to see a structural diff. Formatting
              differences are ignored — only the data is compared.
            </p>
          </div>
        )}
      </div>
    </ToolShell>
  );
}
```

- [ ] **Step 3: Register the tool**

Replace the empty `TOOLS` array in `lib/registry/index.ts`:

```ts
import { GitCompare } from "lucide-react";
import { JsonCompare } from "@/components/tools/JsonCompare";
import type { ToolEntry, ToolMeta } from "./types";

export * from "./types";
export { searchTools, groupTools } from "./search";

const JSON_COMPARE_META: ToolMeta = {
  slug: "json-compare",
  name: "JSON Compare",
  blurb: "Diff two JSON documents structurally, ignoring formatting.",
  group: "data",
  icon: GitCompare,
  aliases: ["diff", "json diff", "compare", "delta"],
  handlesSecrets: false,
};

/**
 * The single source of truth. Every tool registers here exactly once and
 * appears in four places: the rail, the ⌘K palette, the dashboard, and the
 * [slug] route. Declaration order is display order within a group.
 */
export const TOOLS: ToolEntry[] = [
  { meta: JSON_COMPARE_META, Component: () => <JsonCompare meta={JSON_COMPARE_META} /> },
];

export function allMetas(): ToolMeta[] {
  return TOOLS.map((entry) => entry.meta);
}

export function toolBySlug(slug: string): ToolEntry | undefined {
  return TOOLS.find((entry) => entry.meta.slug === slug);
}
```

Rename the file to `lib/registry/index.tsx` — it now contains JSX:

```bash
git mv lib/registry/index.ts lib/registry/index.tsx
```

- [ ] **Step 4: Run the whole suite**

Run: `npm test`
Expected: PASS across every file. In particular the registry invariant `"has at least one registered tool"`, which has been failing since Task 5, now passes.

- [ ] **Step 5: Verify the tool in the browser**

Run: `npm run dev` and open `http://localhost:3000/json-compare`.

Check each of these:
- **Load sample** fills both panes and produces `+1 added`, `-1 removed`, `~3 changed`, `!1 retyped`.
- Reformatting the left pane (add newlines and spaces inside it) changes **nothing** in the diff — this is the structural guarantee.
- Every tinted row carries its gutter glyph. Squint or screenshot in greyscale: the classification must still be readable.
- Scrolling one pane scrolls the other, and matched keys stay on the same line.
- Click into the diff area (not a textarea) and press `n` / `p` — the view jumps between differences and the active row is ringed.
- **Share** copies a URL; opening it in a new tab restores both payloads and every option, then clears the hash from the address bar.
- Reload the page: input is restored from `localStorage`.
- The star in the header pins the tool; it appears in a **Favourites** group at the top of the rail.
- Press ⌘K and type `jsncmp` — JSON Compare is the match.
- Toggle to dark mode: all four tint colours still hold contrast, and the rail does not shift shade.
- Narrow the window below 1024px: panes stack, no horizontal page scroll, the drawer button appears.

- [ ] **Step 6: Commit**

```bash
git add components/tools lib/tools/json-compare-sample.ts lib/registry
git commit -m "feat: add JSON Compare tool with aligned panes and diff navigation"
```

---

---

### Task 17: Difference summary and the text-diff toggle

Spec §7.1 asks for two more things on JSON Compare that Task 16 does not cover:
a collapsible tree summary listing every difference by JSON path grouped by
classification, and a text-diff toggle for when line-level noise is genuinely
wanted.

**Files:**
- Create: `lib/tools/json-compare-summary.ts`, `components/tools/DiffSummary.tsx`, `components/tools/TextDiff.tsx`
- Modify: `components/tools/JsonCompare.tsx` — add the view toggle and the summary panel
- Test: `tests/tools/json-compare-summary.test.ts`

**Interfaces:**
- Consumes: `DiffNode`, `DiffKind` (Task 14); `Segmented` (Task 7).
- Produces:
  - `interface SummaryItem { path: string; kind: Exclude<DiffKind, "unchanged">; left?: unknown; right?: unknown }`
  - `interface SummaryGroup { kind: Exclude<DiffKind, "unchanged">; label: string; items: SummaryItem[] }`
  - `summarise(root: DiffNode): SummaryGroup[]`
  - `<DiffSummary groups onSelect />`, `<TextDiff left right />`

- [ ] **Step 1: Add the dependency**

```bash
npm i diff@^8.0.2
npm i -D @types/diff@^8.0.0
```

- [ ] **Step 2: Write the failing summary test**

Create `tests/tools/json-compare-summary.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { diffValues, DEFAULT_COMPARE_OPTIONS } from "@/lib/tools/json-compare";
import { summarise } from "@/lib/tools/json-compare-summary";

const summaryFor = (left: unknown, right: unknown) =>
  summarise(diffValues(left, right, DEFAULT_COMPARE_OPTIONS));

describe("summarise", () => {
  it("returns nothing for identical documents", () => {
    expect(summaryFor({ a: 1 }, { a: 1 })).toEqual([]);
  });

  it("groups items by classification", () => {
    const groups = summaryFor({ drop: 1, edit: 2 }, { edit: 3, gain: 4 });
    expect(groups.map((g) => g.kind).sort()).toEqual(["added", "changed", "removed"]);
  });

  it("orders groups added, removed, changed, type-changed", () => {
    const groups = summaryFor(
      { drop: 1, edit: 2, retype: "3" },
      { edit: 9, retype: 3, gain: 4 },
    );
    expect(groups.map((g) => g.kind)).toEqual(["added", "removed", "changed", "type-changed"]);
  });

  it("lists each difference by its JSON path", () => {
    const groups = summaryFor({ users: [{ email: "a" }] }, { users: [{ email: "b" }] });
    const changed = groups.find((g) => g.kind === "changed");
    expect(changed?.items.map((i) => i.path)).toEqual(["$.users[0].email"]);
  });

  it("carries both values on a changed item so the summary can show them", () => {
    const item = summaryFor({ a: 1 }, { a: 2 }).find((g) => g.kind === "changed")?.items[0];
    expect(item).toMatchObject({ path: "$.a", left: 1, right: 2 });
  });

  it("reports an added subtree once, at its root", () => {
    const groups = summaryFor({}, { u: { a: 1, b: 2 } });
    expect(groups.find((g) => g.kind === "added")?.items.map((i) => i.path)).toEqual(["$.u"]);
  });

  it("omits a group with no items rather than showing it empty", () => {
    const groups = summaryFor({ a: 1 }, { a: 2 });
    expect(groups).toHaveLength(1);
    expect(groups[0]!.kind).toBe("changed");
  });

  it("gives every group a spelled-out label, since colour never stands alone", () => {
    for (const group of summaryFor({ drop: 1 }, { gain: 2 })) {
      expect(group.label.length).toBeGreaterThan(0);
    }
  });
});
```

- [ ] **Step 3: Run it to verify it fails**

Run: `npx vitest run tests/tools/json-compare-summary.test.ts`
Expected: FAIL — cannot resolve `@/lib/tools/json-compare-summary`.

- [ ] **Step 4: Write the summariser**

Create `lib/tools/json-compare-summary.ts`:

```ts
import type { DiffKind, DiffNode } from "./json-compare";

export type DifferenceKind = Exclude<DiffKind, "unchanged">;

export interface SummaryItem {
  path: string;
  kind: DifferenceKind;
  left?: unknown;
  right?: unknown;
}

export interface SummaryGroup {
  kind: DifferenceKind;
  /** Always spelled out: the Status Escape Rule forbids colour standing alone. */
  label: string;
  items: SummaryItem[];
}

const GROUP_ORDER: DifferenceKind[] = ["added", "removed", "changed", "type-changed"];

const GROUP_LABELS: Record<DifferenceKind, string> = {
  added: "Added",
  removed: "Removed",
  changed: "Changed",
  "type-changed": "Type changed",
};

export function summarise(root: DiffNode): SummaryGroup[] {
  const found: SummaryItem[] = [];

  function visit(node: DiffNode) {
    if (node.kind === "added" || node.kind === "removed") {
      // Report the subtree root only — the same counting rule computeStats
      // uses, so the summary and the stats bar can never disagree.
      found.push({ path: node.path, kind: node.kind, left: node.left, right: node.right });
      return;
    }
    if (node.kind === "type-changed" || (node.kind === "changed" && !node.children)) {
      found.push({ path: node.path, kind: node.kind, left: node.left, right: node.right });
      return;
    }
    for (const child of node.children ?? []) visit(child);
  }

  visit(root);

  return GROUP_ORDER
    .map((kind) => ({
      kind,
      label: GROUP_LABELS[kind],
      items: found.filter((item) => item.kind === kind),
    }))
    // A group with nothing in it is absent, not empty.
    .filter((group) => group.items.length > 0);
}
```

- [ ] **Step 5: Run it to verify it passes**

Run: `npx vitest run tests/tools/json-compare-summary.test.ts`
Expected: PASS, 8 tests.

- [ ] **Step 6: Write the summary panel**

Create `components/tools/DiffSummary.tsx`:

```tsx
"use client";

import { useState } from "react";
import { ChevronRight } from "lucide-react";
import type { SummaryGroup } from "@/lib/tools/json-compare-summary";
import { cx } from "@/lib/cx";

const GLYPH: Record<SummaryGroup["kind"], string> = {
  added: "+", removed: "-", changed: "~", "type-changed": "!",
};

const TONE: Record<SummaryGroup["kind"], string> = {
  added: "text-up", removed: "text-rose", changed: "text-warn", "type-changed": "text-warn",
};

function preview(value: unknown): string {
  if (value === undefined) return "";
  const text = typeof value === "string" ? JSON.stringify(value) : JSON.stringify(value) ?? String(value);
  return text.length > 48 ? `${text.slice(0, 47)}…` : text;
}

export function DiffSummary({
  groups, onSelect,
}: {
  groups: SummaryGroup[];
  onSelect: (path: string) => void;
}) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  function toggle(kind: string) {
    setCollapsed((current) => {
      const next = new Set(current);
      if (next.has(kind)) next.delete(kind); else next.add(kind);
      return next;
    });
  }

  if (groups.length === 0) {
    return (
      <div className="rounded-lg bg-surface p-5 text-center shadow-sm">
        <p className="text-[13px] text-fg-muted">The two documents are structurally identical.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 overflow-auto rounded-lg bg-surface p-3 shadow-sm">
      {groups.map((group) => {
        const isCollapsed = collapsed.has(group.kind);
        return (
          <section key={group.kind}>
            <button
              type="button"
              onClick={() => toggle(group.kind)}
              aria-expanded={!isCollapsed}
              className="flex w-full items-center gap-1.5 rounded-sm py-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
            >
              <ChevronRight
                size={13}
                aria-hidden
                className={cx("text-fg-muted transition-transform", !isCollapsed && "rotate-90")}
              />
              {/* Glyph, word and count — readable with no colour at all. */}
              <span aria-hidden className={cx("font-ui text-[12px]", TONE[group.kind])}>
                {GLYPH[group.kind]}
              </span>
              <span className="eyebrow">{group.label}</span>
              <span className="font-ui text-[11px] text-fg-muted tabular">{group.items.length}</span>
            </button>

            {!isCollapsed ? (
              <ul className="mt-0.5 flex flex-col gap-px pl-5">
                {group.items.map((item) => (
                  <li key={item.path}>
                    <button
                      type="button"
                      onClick={() => onSelect(item.path)}
                      className="flex w-full items-baseline gap-2 rounded-sm px-1.5 py-0.5 text-left hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
                    >
                      <code className="font-ui text-[12px] text-fg">{item.path}</code>
                      {item.kind === "changed" || item.kind === "type-changed" ? (
                        <span className="truncate font-ui text-[11.5px] text-fg-muted">
                          {preview(item.left)} → {preview(item.right)}
                        </span>
                      ) : null}
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </section>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 7: Write the text-diff view**

Create `components/tools/TextDiff.tsx`. This is the secondary view: it answers "what changed in the file" rather than "what changed in the data", which is why it is a toggle and not the default.

```tsx
"use client";

import { useMemo } from "react";
import { diffLines } from "diff";
import { cx } from "@/lib/cx";

export function TextDiff({ left, right }: { left: string; right: string }) {
  const parts = useMemo(() => diffLines(left, right), [left, right]);

  return (
    <div className="min-h-0 flex-1 overflow-auto rounded-lg bg-surface shadow-sm">
      <pre className="w-max min-w-full font-ui text-[12.5px] leading-[1.6]">
        {parts.flatMap((part, partIndex) =>
          part.value.replace(/\n$/, "").split("\n").map((line, lineIndex) => {
            const glyph = part.added ? "+" : part.removed ? "-" : " ";
            return (
              <div
                key={`${partIndex}-${lineIndex}`}
                className={cx(
                  "flex items-start px-2",
                  part.added && "bg-up-tint",
                  part.removed && "bg-rose-tint",
                )}
              >
                <span
                  aria-hidden
                  className={cx(
                    "w-4 shrink-0 select-none",
                    part.added ? "text-up" : part.removed ? "text-rose" : "text-fg-muted",
                  )}
                >
                  {glyph}
                </span>
                <span className="whitespace-pre text-fg">{line}</span>
              </div>
            );
          }),
        )}
      </pre>
    </div>
  );
}
```

- [ ] **Step 8: Wire both into JsonCompare**

In `components/tools/JsonCompare.tsx`, add the imports:

```tsx
import { summarise } from "@/lib/tools/json-compare-summary";
import { DiffSummary } from "./DiffSummary";
import { TextDiff } from "./TextDiff";
import { Segmented } from "@/components/ui/Segmented";
```

Add `view` to the state interface, its default, and its validator:

```tsx
interface State {
  left: string;
  right: string;
  options: CompareOptions;
  view: "structural" | "summary" | "text";
}

const DEFAULTS: State = {
  left: "", right: "", options: DEFAULT_COMPARE_OPTIONS, view: "structural",
};
```

In `isState`, add the view check to the returned expression:

```tsx
    && ["structural", "summary", "text"].includes((candidate as State).view)
```

Add the derived summary and a path-to-row jump, next to the existing `rows` memo:

```tsx
  const summary = useMemo(() => (result?.ok ? summarise(result.value.root) : []), [result]);

  function selectPath(path: string) {
    const row = rows.find((r) => r.path === path);
    if (!row) return;
    // Selecting from the summary switches back to the panes, which is the only
    // view where a path has a place to scroll to.
    update({ view: "structural" });
    setActiveIndex(row.index);
    requestAnimationFrame(() => {
      leftScroll.current
        ?.querySelector(`[data-row="${row.index}"]`)
        ?.scrollIntoView({ block: "center" });
    });
  }
```

Add the view switch to the `options` prop of `ToolShell`, after the tolerance field:

```tsx
          <div className="ml-auto">
            <Segmented
              label="Diff view"
              value={state.view}
              onChange={(view) => update({ view })}
              options={[
                { value: "structural", label: "Panes" },
                { value: "summary", label: "Summary" },
                { value: "text", label: "Text" },
              ]}
            />
          </div>
```

Finally, replace the `{rows.length > 0 ? ... : ...}` block with a view switch:

```tsx
        {rows.length === 0 ? (
          // An empty surface teaches: say what goes here and offer the sample.
          <div className="flex flex-[2] items-center justify-center rounded-lg bg-surface p-8 text-center shadow-sm">
            <p className="max-w-sm text-[13px] leading-relaxed text-fg-muted">
              Paste JSON into both panes to see a structural diff. Formatting
              differences are ignored — only the data is compared.
            </p>
          </div>
        ) : state.view === "summary" ? (
          <div className="flex min-h-0 flex-[2]">
            <DiffSummary groups={summary} onSelect={selectPath} />
          </div>
        ) : state.view === "text" ? (
          <div className="flex min-h-0 flex-[2]">
            <TextDiff left={state.left} right={state.right} />
          </div>
        ) : (
          <div className="flex min-h-0 flex-[2] gap-3">
            <Pane rows={rows} side="leftText" label="Left" activeIndex={activeIndex} scrollRef={leftScroll} />
            <Pane rows={rows} side="rightText" label="Right" activeIndex={activeIndex} scrollRef={rightScroll} />
          </div>
        )}
```

- [ ] **Step 9: Run the full suite and typecheck**

Run: `npm test && npm run typecheck`
Expected: all suites PASS, no type errors.

- [ ] **Step 10: Verify in the browser**

Run `npm run dev`, open `/json-compare`, and load the sample. Check:
- **Summary** lists every difference by JSON path, grouped and labelled, with counts. Each group collapses and reopens.
- Clicking a path in the summary switches back to **Panes** and scrolls both panes to that row with the ring on it.
- **Text** shows a line-level diff of the raw input — and unlike the structural view, reformatting one side *does* light it up. That contrast is the point of having both.
- Every summary row and text-diff line still carries its glyph in greyscale.
- The chosen view survives a reload, and rides along in a shared link.

- [ ] **Step 11: Commit**

```bash
git add lib/tools/json-compare-summary.ts components/tools tests/tools/json-compare-summary.test.ts package.json package-lock.json
git commit -m "feat: add JSON Compare difference summary and text-diff view"
```

## Definition of done for Plan 1

- [ ] `npm test` passes — every suite green, including the registry invariants.
- [ ] `npm run typecheck` reports no errors.
- [ ] `npm run build` succeeds and prerenders `/json-compare` via `generateStaticParams`.
- [ ] `grep -rn "fetch(\|XMLHttpRequest\|WebSocket" app lib components` returns nothing outside comments — the no-network claim on the badge is true.
- [ ] `grep -rln "react" lib/tools/` returns nothing — the Pure Logic Rule holds.
- [ ] The site renders correctly in both themes with site data blocked (test in a private window).
- [ ] All three JSON Compare views work — Panes, Summary, Text — and every
      differing row is legible in greyscale, glyph alone.

## What Plans 2 and 3 inherit

Written against what this plan actually ships, not against a guess:

- `ToolMeta` / `ToolEntry`, and the single `TOOLS` array to append to
- `ToolShell` + `useToolState` — persistence, sharing, favourites, and recents come free; a new tool implements none of them
- `ToolResult` / `ToolError`, and `parseJson` for anything JSON-shaped
- `components/ui/*` primitives and the `font-ui` / `.eyebrow` / `.tabular` type layer
- The pattern each remaining tool follows: `lib/tools/<slug>.ts` (pure, tested) → `components/tools/<Name>.tsx` (renders it) → one `TOOLS` entry
