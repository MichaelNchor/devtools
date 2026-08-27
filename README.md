# DevTools

Sixteen developer utilities that run entirely in your browser tab. No server,
no database, no network calls — paste a token or a payload and it never leaves
the page.

## Why

The tools you reach for daily — formatting JSON, decoding a JWT, hashing a
file, working out a subnet — are mostly hosted somewhere that logs what you
paste into them. This does the same jobs with nothing sent anywhere. You can
verify that claim yourself:

```bash
grep -rn "fetch(\|XMLHttpRequest\|WebSocket" app lib components
```

The single hit is a string literal in the cURL converter, which *generates*
`fetch()` code for you to copy. It is annotated as such in the source.

## The tools

**Security & Identity**

| Tool | What it does |
|---|---|
| GUID Generator | UUID v4 and v7 from `crypto.getRandomValues`, plus v1 and namespaced v5 |
| Password Generator | Rejection-sampled passwords with real entropy reporting |
| Hash Generator | MD5, SHA-1/256/384/512, RIPEMD-160, HMAC; files stream in chunks |
| JWT Debugger | Decode, humanise claims, and verify — three states, never two |

**Data & Formatting**

| Tool | What it does |
|---|---|
| JSON Compare | Structural diff with aligned panes, a summary, and a text view |
| JSON Formatter | Beautify, minify, sort keys recursively, browse as a tree |
| JSON → Code | Infer types and emit TypeScript, C#, Go, Java, Python, Kotlin |
| Base64 | Encode/decode text or files, URL-safe alphabet, data URIs |
| Epoch Converter | Timestamps ↔ dates in any IANA zone, with a live ticker |
| Regex Tester | Live matches, capture-group table, replace preview |
| YAML ↔ JSON | Both directions, with an honest lossy-conversion warning |
| SQL Formatter | Six dialects, keyword case, indent, leading or trailing commas |

**Networking & Backend**

| Tool | What it does |
|---|---|
| IP Calculator | IPv4 and IPv6 subnetting, including `/31` and `/32` done right |
| cURL Converter | A curl command into fetch, axios, requests, HttpClient, Go, PowerShell |
| HTTP Inspector | Break a raw request or response into headers, body, and claims |
| Cron Parser | Plain-language reading, per-field breakdown, next ten runs |

## Design rules

Three rules the code actually enforces rather than merely intends:

- **The Pure Logic Rule.** Every transform lives in `lib/tools/*.ts` as plain
  functions over plain data, with no React import and no DOM access. That is
  why all 384 tests run in Node with no browser.
- **The Status Escape Rule.** Colour never carries meaning alone. Every tinted
  state also carries a glyph or a word, so it survives greyscale.
- **Secrets never leave the tab.** JWT, Hash, and Password are marked
  `handlesSecrets`, which gates *both* `localStorage` persistence and URL
  sharing, so the two can never disagree.

## Running it

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # 384 tests, node environment
npm run typecheck
npm run build
```

## Layout

```
app/          Routes: the dashboard, /settings, and one dynamic [slug]
components/   Shell (rail, palette, top bar), tool pages, UI primitives
lib/tools/    Pure transforms — one module and one test suite per tool
lib/registry/ The single source of truth; a tool registers here exactly once
docs/         The design spec and the implementation plans built from it
```

Adding a tool means three things: a tested transform in `lib/tools/`, a
component that renders it, and one entry in the registry. The rail, the ⌘K
palette, the dashboard, and the route all follow from that entry.

## Stack

Next.js 15 (App Router), React 19, TypeScript in strict mode, Tailwind CSS 3,
Vitest. Built with [Claude Code](https://claude.com/claude-code).
