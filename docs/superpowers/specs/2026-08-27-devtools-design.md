# DevTools — Design Spec

**Date:** 2026-08-27
**Status:** Approved, ready for implementation planning
**Scope:** Phase 1 — application shell, design system, and 16 client-side utility tools.

---

## 1. Purpose

A local-first developer workspace: a single site holding the small utilities a
backend developer reaches for daily — formatting, encoding, decoding, hashing,
comparing, converting. Modelled on `devtools.isaacanane.com`, built on the
design system already proven in `job-copilot`.

Two constraints shape everything below:

1. **Nothing leaves the browser.** Every Phase 1 tool is a pure client-side
   transform. There is no server, no database, no auth, no telemetry, no
   network request. A user pasting a production JWT must be able to verify by
   reading the source that the token stayed on their machine.
2. **Sixteen tools must feel like one product.** A shared shell, one tool-page
   pattern, and one registry — not sixteen bespoke pages that happen to share
   a stylesheet.

### Out of scope (Phase 2, separate spec)

The three animated simulators from the reference site: **Kafka Visualizer**,
**Redis Cache Lab**, **Load Balancer**. They are simulations with time-stepped
state, not transforms, and share almost nothing with the tool-page pattern.
Phase 1 must not build partial versions of them, and must not add a
"Architecture & Systems" nav group in anticipation. The registry's group type
gains that fourth value in Phase 2, not now.

---

## 2. Stack

| Concern | Choice | Rationale |
|---|---|---|
| Framework | Next.js 15, App Router | Matches `job-copilot`; tokens and shell patterns port directly |
| Language | TypeScript (strict) | Same |
| Styling | Tailwind CSS 3 + CSS custom properties | Same token layer as `job-copilot` |
| Icons | `lucide-react` | Same |
| Fonts | JetBrains Mono + Nunito via `next/font/google` | Same families, inverted emphasis (§4) |
| Tests | Vitest | Same |
| Deployment | Static-capable; no server runtime required | All logic is client-side |

Project root: `/Users/michaelnchor/Desktop/devtools`, git repo on `main`.

### New dependencies

| Package | Used by | Why not hand-rolled |
|---|---|---|
| `hash-wasm` | Hash Generator | WebCrypto has no MD5 or RIPEMD-160; hand-rolling either is a correctness liability |
| `js-yaml` | YAML ↔ JSON | YAML is a large spec; a partial parser is worse than none |
| `sql-formatter` | SQL Formatter | Multi-dialect SQL tokenising is a project in itself |
| `cronstrue` | Cron Parser | Humanising cron correctly across locales and edge fields |
| `cron-parser` | Cron Parser | Next-run computation with DST correctness |
| `uuid` | GUID Generator | v1 (clock sequence, node id) and v5 (namespace SHA-1) have exact specs worth not re-deriving |
| `diff` | JSON Compare (text mode only) | Myers diff for the secondary text view |
| `prismjs` | JSON→Code, SQL, cURL Convert, HTTP Inspector | Highlighting generated output in six target languages |

JSON highlighting is **not** Prism. It is hand-rolled (§7.3) because JSON
Compare renders its own token stream with per-node diff classes, and driving
that through a general highlighter fights the abstraction.

---

## 3. Architecture

### 3.1 The registry is the single source of truth

Every tool registers once and appears in four places: the rail, the ⌘K palette,
the dashboard, and routing. Adding a seventeenth tool means adding one file and
one array entry — nothing else.

```ts
// lib/registry.ts
export type ToolGroup = "security" | "data" | "network";

export interface ToolMeta {
  slug: string;            // URL segment, kebab-case, stable — never change after ship
  name: string;            // "JSON Compare"
  blurb: string;           // one line, sentence case, shown on card and tool page
  group: ToolGroup;
  icon: LucideIcon;
  aliases: string[];       // extra ⌘K search terms: ["diff", "delta", "compare json"]
  handlesSecrets: boolean; // true => never persisted, never shareable (§6.3, §6.4)
}

export interface ToolEntry {
  meta: ToolMeta;
  Component: React.ComponentType;
}

export const TOOLS: ToolEntry[] = [ /* 16 entries, declaration order = display order */ ];
```

Derived helpers live beside it: `toolBySlug`, `toolsByGroup`, `searchTools`.

### 3.2 Layers

```
app/
  layout.tsx                 root shell: fonts, pre-paint theme script, Rail, TopBar
  page.tsx                   dashboard
  [slug]/page.tsx            ONE dynamic route; generateStaticParams from TOOLS
  settings/page.tsx          static segment — takes precedence over [slug]
  globals.css                token layer, ported from job-copilot + §4 changes

components/
  shell/     Rail, TopBar, CommandPalette, ThemeToggle, LocalBadge
  tool/      ToolShell, PaneGroup, InputPane, OutputPane, OptionStrip,
             CopyButton, SampleButton, ShareButton, FavouriteStar, ErrorNote
  ui/        Button, Field, Select, Toggle, Segmented, Table, Tabs, CodeBlock

lib/
  registry.ts
  tools/<slug>.ts            PURE LOGIC. No React, no DOM beyond WebCrypto.
  storage.ts                 localStorage wrapper (§6.5)
  share.ts                   URL-hash encode/decode (§6.4)
  highlight/json.ts          hand-rolled JSON tokeniser (§7.3)

tests/
  tools/<slug>.test.ts       one suite per tool, against lib/tools/*
  share.test.ts
  registry.test.ts           invariants: unique slugs, no empty aliases, etc.
```

**The Pure Logic Rule.** `lib/tools/*.ts` exports plain functions taking plain
data and returning plain data. No React imports, no `window`, no `document`.
This is what makes all sixteen tools testable in Node without a browser, and it
is the boundary that keeps a UI change from breaking a transform.

Where a transform can fail on user input — and most can — the function returns
a discriminated result rather than throwing:

```ts
type ToolResult<T> = { ok: true; value: T } | { ok: false; error: ToolError };
interface ToolError { message: string; line?: number; column?: number; }
```

Line and column are populated wherever the parser can supply them (JSON, YAML,
cron, curl), because "invalid JSON" without a position is a worse experience
than the browser console.

### 3.3 The tool page pattern

`ToolShell` owns everything a tool page has in common, so a tool component
supplies only its panes and options:

- **Header** — tool name (mono), blurb (prose), favourite star.
- **Action row** — Copy output, Clear, Load sample, Share link (only when
  the tool does not handle secrets).
- **Option strip** — the tool's controls, in a single horizontal band above the
  panes; wraps on narrow viewports.
- **Panes** — input left, output right on ≥1024px; stacked below. Panes are
  independently scrollable and never make the page scroll horizontally.

Every tool ships a **sample payload**. An empty tool page explains what the
tool takes and offers one click to see it work — the same "empty surface
teaches" rule `job-copilot` holds.

---

## 4. Visual system

### 4.1 What is ported unchanged

The entire token layer from `job-copilot/app/globals.css`: `--bg #F6F7FB`,
`--surface #FFFFFF`, `--fg #313A46`, `--primary #236DC9`, the status family
(solid form for fills, deep form for text), the blue-grey shadow scale, the
near-black rail `#06070A` that does not invert, the 4/5/6/8px radius steps, and
the `.dark` block with its lighter text forms. Theme is set by a blocking
inline script before first paint, keyed on `localStorage.theme`, falling back
to `prefers-color-scheme`.

WCAG AA is held in both themes: 4.5:1 for body text, 3:1 for controls.

### 4.2 What changes: mono-forward

`job-copilot` uses JetBrains Mono as a label layer over a Nunito body. DevTools
inverts that emphasis. **Mono carries the structure; Nunito is demoted to
prose.** This is what distinguishes the two products — the palette is
deliberately unchanged.

| Role | Font | Size / weight |
|---|---|---|
| Page title | JetBrains Mono | 1.375rem / 700, tracking -0.01em |
| Section + tool headings | JetBrains Mono | 1rem / 600 |
| Rail labels, tab labels | JetBrains Mono | 0.8125rem / 500 |
| Eyebrow / label caps | JetBrains Mono | 10.5px / 600, tracking .14em, uppercase |
| Table + data cells | JetBrains Mono | 13px / 400, `font-variant-numeric: tabular-nums` |
| I/O panes, code, all payloads | JetBrains Mono | 13px / 400 |
| Prose: blurbs, help, empty states, errors | Nunito | 0.875rem / 400, line-height 1.5 |

New token `--font-ui: var(--font-mono)` with a Tailwind `font-ui` utility, so
the structural layer is named by its role rather than by its family, and can be
retuned in one place.

Density tightens against `job-copilot`: 13px data rows, hairline rules
(`--border`) replacing a level of card nesting inside panes, and no card
nested more than one deep.

### 4.3 Rules inherited from job-copilot's DESIGN.md

These carry over verbatim and constrain implementation:

- **The One Blue Rule.** `--primary` on at most ~10% of any screen. A row
  action repeated down a list is a ghost button, never a filled one.
- **The Status Escape Rule.** Status colour always pairs with a label or a
  glyph. Colour alone never carries meaning — this is load-bearing for JSON
  Compare (§7.1), where every coloured line also carries a `+`/`−`/`~` gutter
  mark.
- **No gradients** except the single sanctioned `.drench` feature card.
- **No coloured side-stripe borders** on cards, rows, or alerts.
- **The Whisper Rule.** If a shadow is the first thing you notice, it is too
  dark.
- `prefers-reduced-motion` is honoured globally.

### 4.4 Syntax highlighting tokens

New token pairs, defined in both `:root` and `.dark`, reusing existing hues so
highlighting cannot drift from the palette:

Each value is a reference to an existing themed variable, never a new literal
colour — so the referenced token already carries its own light and dark forms
and the highlighting cannot drift from the palette. `--code-keyword` is the one
that resolves differently per theme, because `--accent-strong` is the readable
form on white and `--accent` the readable form on a dark card.

| Token | Resolves to | Applies to |
|---|---|---|
| `--code-key` | `--primary` | object keys, attribute names |
| `--code-string` | `--up` | strings |
| `--code-number` | `--indigo` | numbers |
| `--code-atom` | `--warn` | true / false / null / undefined |
| `--code-punct` | `--fg-muted` | braces, commas, colons |
| `--code-comment` | `--fg-muted` | comments |
| `--code-keyword` | `--accent-strong` light / `--accent` dark | language keywords in generated code |

A Prism theme is generated from these same tokens.

Diff tinting reuses the status family: added `--up-tint` / `--up`, removed
`--rose-tint` / `--rose`, changed `--warn-tint` / `--warn`.

---

## 5. Shell surfaces

### 5.1 Rail

Near-black `#06070A`, 256px expanded / 64px collapsed, collapse state persisted.
On viewports below 1024px it becomes a drawer with focus trapping, Escape to
close, and `body` scroll lock — the pattern already implemented in
`job-copilot/components/Nav.tsx`, ported.

Groups in order:

1. **Favourites** — dynamic; the section is absent, not empty, when nothing is
   pinned.
2. **Security & Identity**
3. **Data & Formatting**
4. **Networking & Backend**

Active row: `--primary-tint` fill, `--primary-strong` text, and a 3px position
marker on the rail's left edge. Hover: `--nav-hover`.

### 5.2 Top bar

Tool name, ⌘K search trigger showing the shortcut hint, theme toggle, and a
quiet "runs locally" marker that links to a short explanation of the
no-network guarantee.

### 5.3 Dashboard (`/`)

In order: a one-line statement of what the site is; **Recent** (last 6 tools
used, absent when empty); **Favourites** (absent when empty); then the three
category sections as card grids. Each card is name (mono), blurb (prose), icon,
and a favourite star.

**The One Home Rule**, inherited: a tool appears once per section. A favourited
tool shows in Favourites *and* its category — that is the one sanctioned
repetition, because the sections answer different questions ("what do I use"
vs. "what exists").

### 5.4 Command palette (⌘K / Ctrl+K)

Opens over any surface. Fuzzy-matches `name` and `aliases`, ranked by
match quality then by recency of use. Arrow keys navigate, Enter opens, Escape
closes. Focus returns to the trigger on close. Available from every page.

### 5.5 Settings (`/settings`)

Theme (system / light / dark), rail default state, clear all stored tool
inputs, clear favourites and recents. Everything on this page acts on
`localStorage` only.

---

## 6. Workspace behaviours

Built into the shell. **No tool implements any of these itself.**

### 6.1 Favourites

Pin/unpin from the rail, dashboard card, or tool header. Persisted as an
ordered slug array. Unknown slugs are dropped on read, so a removed tool cannot
break the rail.

### 6.2 Recents

Visiting a tool page records its slug with a timestamp. Capped at 12 stored,
6 displayed. Same unknown-slug pruning.

### 6.3 Per-tool input persistence

Each tool declares a serialisable state object. `ToolShell` persists it under
`devtools:tool:<slug>` on change (debounced 400ms) and restores it on mount.
Restoring is best-effort: a stored shape that fails the tool's own validation
is discarded silently and the tool opens empty rather than broken.

**Tools with `handlesSecrets: true` are never persisted.** JWT Debugger, Hash
Generator, and Password Generator take tokens, keys, and generated
credentials; writing those to `localStorage` would outlive the tab that
created them and survive on a shared machine. Those three open empty every
time, by design.

### 6.4 Shareable URL state

Only for tools with `handlesSecrets: false` — the same flag that governs
persistence (§6.3), so a tool can never be shareable but unpersisted, or the
reverse. State is JSON, UTF-8 encoded, base64url, written to `#s=<payload>`.

- The share button is **explicit**. State is never written to the URL as the
  user types — a payload must not land in browser history or a screenshot
  without the user asking.
- If the encoded payload exceeds **8192 characters**, the button is disabled
  with a note explaining the input is too large to share by link. URLs beyond
  that are unreliable across clients, and silently producing a truncated link
  would be worse than refusing.
- On load, a present `#s=` hash is decoded and applied, then the hash is
  cleared from the address bar via `replaceState`. A malformed payload is
  ignored and the tool opens empty.
- Compression is explicitly out of scope for Phase 1.

Shareable — the thirteen tools with `handlesSecrets: false`: JSON Compare,
JSON Formatter, JSON→Code, YAML↔JSON, SQL Formatter, GUID, IP Calculator,
cURL Convert, HTTP Inspector, Epoch, Cron, Regex, Base64.

Not shareable — the three with `handlesSecrets: true`: JWT Debugger, Hash
Generator, Password Generator. A share button on these is an invitation to
leak a token or a key.

### 6.5 Storage contract

All keys namespaced `devtools:`, except `theme` which is bare, matching the
pre-paint script's expectation.

| Key | Holds |
|---|---|
| `theme` | `"light" \| "dark"`; absent means follow system |
| `devtools:favourites` | ordered slug array |
| `devtools:recents` | `{ slug, at }[]`, newest first |
| `devtools:rail` | `"expanded" \| "collapsed"` |
| `devtools:tool:<slug>` | that tool's serialised state |

`lib/storage.ts` wraps every read and write in try/catch and returns a default
on failure. Private-mode browsers and blocked site data must render the app
correctly, not crash it.

---

## 7. Tools

Sixteen tools, plus one shared internal module (§7.3) that is not a tool and
gets no route, no registry entry, and no rail row. Each entry below is binding
on inputs, outputs, and options.

### 7.1 JSON Compare — `/json-compare` (flagship)

**Structural, not textual.** Both sides are parsed to values and walked in
parallel; the diff is computed over the trees, so reformatting one side
produces zero differences.

Node classification: `unchanged`, `added` (right only), `removed` (left only),
`changed` (same type, different value), `type-changed` (e.g. `"1"` vs `1`).

**Options**

| Option | Default | Effect |
|---|---|---|
| Ignore key order | on | Object keys compared as sets; off renders keys in each side's own order |
| Array matching | `index` | `index` compares positionally; `value` matches equal elements first and reports the rest as add/remove; `key` matches objects by a user-named key field |
| Ignore whitespace in strings | off | Trims and collapses runs of whitespace before comparing strings |
| Numeric tolerance | 0 | Numbers within ±tolerance compare equal; guards float noise |
| Ignore case in string values | off | |

**Output**

- Two aligned panes with a gutter carrying `+` (added), `−` (removed), `~`
  (changed), `!` (type-changed). Alignment inserts blank rows so matched keys
  sit on the same line. **The glyph is not decorative** — it is what carries
  meaning for a colourblind user (§4.3).
- Collapsible tree summary listing every difference by JSON path
  (`$.users[2].email`), grouped by classification.
- Stats bar: `+N −N ~N !N` and total nodes compared.
- Keyboard `n` / `p` jump to next / previous difference, scrolling both panes
  together.
- Text-diff toggle (via `diff`) for when line-level noise is genuinely wanted.

**Edge cases that must be handled and tested:** cyclic structures in neither
input (JSON cannot express them, but the walker must not assume depth is
bounded — cap recursion at 512 levels and report), very large arrays
(10k+ elements) without freezing the tab, duplicate keys in raw input (last
wins, matching `JSON.parse`), `NaN`/`Infinity` absent from valid JSON, and
one side invalid — which reports a parse error with line and column rather
than an empty diff.

### 7.2 JSON Formatter — `/json-format`

Beautify (indent 2 / 4 / tab), minify, sort keys (off / ascending /
descending, recursive), validate. Errors report line, column, and the offending
token. Output offers a raw view and a collapsible tree view with per-node copy
of value or JSON path.

### 7.3 JSON highlighting — shared internal module, not a tool

`lib/highlight/json.ts` tokenises JSON into `{ type, text }` spans —
`key | string | number | atom | punct`. Used by JSON Formatter's raw view and
by JSON Compare, which wraps the same spans in diff classes. Pure and unit
tested; no DOM.

### 7.4 JSON → Code — `/json-to-code`

Infers a type model from a JSON sample and emits: TypeScript interfaces, C#
classes, Go structs, Java classes, Python (dataclass and Pydantic), Kotlin data
classes. Options: root type name, optional-vs-nullable handling, array element
unification (union vs. first-element), and per-language naming convention
(PascalCase members for C#, snake_case for Python) with the original key
preserved via the language's serialisation attribute where one exists.

### 7.5 YAML ↔ JSON — `/yaml-json`

Bidirectional via `js-yaml`. Direction toggle, indent, and flow-vs-block style
for YAML output. **YAML→JSON drops comments and anchors** — the UI states this
plainly above the output rather than silently discarding them.

### 7.6 SQL Formatter — `/sql-format`

`sql-formatter` with dialect (standard, PostgreSQL, MySQL, T-SQL, SQLite,
BigQuery), keyword case (upper / lower / preserve), indent width, and comma
position (trailing / leading).

### 7.7 GUID Generator — `/guid`

v4 and v7 from `crypto.getRandomValues`; v1 and v5 (namespace + name, with the
four standard namespaces plus custom) via `uuid`. Options: count (1–1000),
uppercase, braces, hyphens. Bulk output with copy-all.

### 7.8 JWT Debugger — `/jwt`

Decodes header, payload, and signature without verifying. Claims are humanised:
`exp`, `iat`, `nbf` render as absolute time, relative time, and an
expired/valid/not-yet-valid state. Verification is real, via WebCrypto:
HS256/384/512 with a secret, RS/PS256/384/512 and ES256/384/512 with a public
key in JWK or PEM. Verification state is stated explicitly — "signature valid",
"signature invalid", or "not verified" — and never implied by decoding
succeeding. `handlesSecrets: true` — neither persisted nor shareable.

### 7.9 Hash Generator — `/hash`

MD5, SHA-1, SHA-256, SHA-384, SHA-512, RIPEMD-160 via `hash-wasm`; also
HMAC with a key. Input is text or a dropped file (streamed in chunks so a large
file does not exhaust memory). Output hex or base64, with a compare field that
checks a pasted expected digest and reports match or mismatch.
`handlesSecrets: true` — neither persisted nor shareable.

### 7.10 Password Generator — `/password`

`crypto.getRandomValues` only — never `Math.random`. Length 8–128, character
sets (lower, upper, digits, symbols, custom), exclude ambiguous characters,
require-one-of-each-selected-set. Reports entropy in bits computed from the
actual selected pool, and a plain-language strength statement derived from it.
Bulk generate up to 100. `handlesSecrets: true` — neither persisted nor
shareable.

### 7.11 IP Calculator — `/ip-calculator`

IPv4 from `address/prefix` or `address` + mask: network address, broadcast,
first and last usable host, usable host count, netmask, wildcard mask, and
whether the range is private / loopback / link-local / multicast. `/31` and
`/32` are special-cased correctly rather than reporting negative host counts.
A subnet-split table divides the block into equal subnets at a chosen prefix.
IPv6: expand, compress, prefix range, and address count.

### 7.12 cURL Converter — `/curl-convert`

Parses a `curl` command — including `-X`, `-H`, `-d`/`--data`/`--data-raw`/
`--data-urlencode`, `-F`, `-u`, `--compressed`, `-k`, `-L`, `--cookie`, line
continuations, and single/double quoting — into a request model, then emits:
`fetch`, `axios`, Python `requests`, C# `HttpClient`, Go `net/http`, and
PowerShell `Invoke-RestMethod`. Unsupported flags are listed explicitly above
the output instead of being dropped silently.

### 7.13 HTTP Inspector — `/http-inspector`

Parses a pasted raw HTTP request or response: start line, headers, body.
Detects which it is. Pretty-prints a JSON or form-encoded body, decodes
`Authorization` (Basic and Bearer/JWT summary), splits `Cookie` and
`Set-Cookie` into fields, and parses `Content-Type` parameters. Reports header
count and body size.

### 7.14 Epoch Converter — `/epoch`

Both directions: epoch (seconds, milliseconds, microseconds — auto-detected by
magnitude, overridable) ↔ date. Renders ISO 8601, UTC, local, a chosen IANA
timezone, RFC 2822, and relative time. A live "now" ticker in all units, and a
copy of the current epoch. Handles pre-1970 negative values.

### 7.15 Cron Parser — `/cron`

Accepts 5-field (standard), 6-field (with seconds), and common macros
(`@daily`, `@hourly`, …). Humanises via `cronstrue`, computes the next 10 runs
via `cron-parser` in a chosen timezone, and renders a per-field breakdown
showing what each of the five or six positions matched. Invalid expressions
report which field failed and why.

### 7.16 Regex Tester — `/regex`

Pattern plus flags (`g i m s u y`), live match highlighting over the test text,
a capture-group table (index, name, value, position) per match, a replace
preview supporting `$1`/`$<name>`, and a small library of common patterns
(email, URL, IPv4, UUID, ISO date, semver) that load into the field. Guards
against catastrophic backtracking: matching runs under a time budget and, on
exceeding it, reports a possible catastrophic-backtracking warning rather than
hanging the tab.

### 7.17 Base64 — `/base64`

Encode and decode, text or file. Standard and URL-safe alphabets, padding
toggle, and a data-URI wrapper with MIME type. UTF-8 is handled correctly in
both directions (via `TextEncoder`/`TextDecoder`, not `btoa` on a raw string).
Invalid base64 on decode reports the offending position. Decoded binary that is
not valid UTF-8 offers a hex view and a file download.

---

## 8. Testing

Vitest, `node` environment. Node 20+ exposes WebCrypto globally, so hashing and
JWT verification are testable without a browser.

- **One suite per tool**, against `lib/tools/<slug>.ts`. Tools are pure
  functions, so tests assert on values, not rendered output.
- **JSON Compare carries the heaviest suite**: nested objects, nested arrays,
  each of the five classifications, key-order invariance, every array-matching
  mode, tolerance, depth capping, and both parse-error paths.
- **Registry invariants** (`tests/registry.test.ts`): slugs unique and
  kebab-case, every tool has a non-empty blurb and at least one alias, every
  group is a valid value, every tool has a sample payload, and the three
  three secret-handling tools are `handlesSecrets: true` and every other
  tool is `handlesSecrets: false`.
- **Share round-trip** (`tests/share.test.ts`): encode → decode is identity for
  representative states; malformed input decodes to `null` rather than throwing;
  the 8192-character limit is enforced.
- **Storage** is tested against a stubbed `localStorage` that throws, to prove
  the app still renders when site data is blocked.

TDD per tool: the transform's tests are written from this spec before its
implementation.

---

## 9. Build order

1. Scaffold, token layer, fonts, theme script, base `ui/` primitives.
2. Registry, `[slug]` route, `ToolShell`, Rail, TopBar, dashboard.
3. Workspace behaviours: storage, favourites, recents, persistence, palette,
   share.
4. **JSON Compare** — first tool, because it is the flagship and it stresses
   the shell hardest.
5. The remaining Data & Formatting tools, then Security & Identity, then
   Networking & Backend.
6. Settings, responsive pass, accessibility and contrast audit in both themes.

The dashboard and rail render correctly from the moment the registry holds one
entry, so the site is demonstrable from step 4 onward.
