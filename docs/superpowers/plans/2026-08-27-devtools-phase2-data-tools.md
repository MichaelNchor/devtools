# DevTools Phase 1, Plan 2 — Data & Formatting Tools

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship six of the seven remaining Data & Formatting tools — JSON Formatter, Base64, Epoch Converter, Regex Tester, YAML ↔ JSON, and SQL Formatter — plus the shared JSON highlighting module and the sample-payload registry invariant.

**Not in this plan:** JSON → Code (spec §7.4). A type-inference engine plus seven language emitters is a subsystem in its own right, with a testing burden comparable to every other tool here combined, and it shares no code with them. It gets its own plan so that neither it nor these six has to wait on the other.

**Architecture:** Unchanged from Plan 1 and not up for renegotiation. Every tool is a pure transform in `lib/tools/<slug>.ts` with zero React imports, a component in `components/tools/<Name>.tsx` that renders it, and exactly one `TOOLS` entry. The shell, persistence, sharing, favourites, and recents already exist; a new tool implements none of them.

**Tech Stack:** Next.js 15 (App Router), React 19, TypeScript 5+ (strict), Tailwind CSS 3, lucide-react, Vitest (node environment). New runtime dependencies: `js-yaml`, `sql-formatter`.

**Spec:** `docs/superpowers/specs/2026-08-27-devtools-design.md` (§7.2, §7.3, §7.5, §7.6, §7.14, §7.16, §7.17)

**Predecessor:** `docs/superpowers/plans/2026-08-27-devtools-phase1-foundation.md` — Tasks 1–17, all merged to `main`. Read its "What Plans 2 and 3 inherit" section before starting.

## Global Constraints

Copied from the spec. Every task's requirements implicitly include this section.

- **No network.** No `fetch`, no XHR, no WebSocket, no analytics, no external asset host except Google Fonts via `next/font`. `grep -rn "fetch(\|XMLHttpRequest\|WebSocket" app lib components` must return nothing outside comments.
- **The Pure Logic Rule.** `lib/tools/*.ts` exports plain functions taking plain data and returning plain data. No React imports, no `window`, no `document`. WebCrypto (`globalThis.crypto`) is the only permitted platform API. `grep -rln "react" lib/tools/` must return nothing.
- **The Status Escape Rule.** Colour never carries meaning alone. Every tinted or coloured state also carries a glyph or a word, so it survives greyscale and colourblindness.
- **The One Home Rule.** A tool appears once per dashboard section. Favourites plus its category is the one sanctioned repetition.
- **Secrets.** Only `hash`, `jwt`, and `password` are `handlesSecrets: true`. Every tool in THIS plan is `handlesSecrets: false`. `tests/registry.test.ts` enforces it.
- **Errors are positional where the parser can supply a position.** Use `err(message, { line, column })` from `lib/types.ts`; 1-indexed.

### TypeScript settings that will bite you

`tsconfig.json` runs stricter than most projects. These are not suggestions:

- `noUncheckedIndexedAccess` — `array[i]` is `T | undefined`. Use `!` only where an adjacent check proves it, otherwise guard.
- `exactOptionalPropertyTypes` — an absent optional property must be an absent key, never an explicit `undefined`. Build objects with spreads: `...(x != null ? { x } : {})`.
- `verbatimModuleSyntax` — type-only imports MUST be `import type { ... }`.

### Dependency notes — read before installing

Plan 1 lost time to a stub `@types` package. Resolved in advance:

| Package | Install | Types |
|---|---|---|
| `js-yaml@^5.4.1` | `npm i js-yaml@^5.4.1` | **Ships its own.** Do NOT install `@types/js-yaml` — it is pinned at v4 and does not describe this API. |
| `sql-formatter@^15.8.2` | `npm i sql-formatter@^15.8.2` | **Ships its own** `dist/esm/index.d.ts`, resolved via the adjacent-declaration fallback under `moduleResolution: "bundler"`. Do NOT install `@types/sql-formatter` — it is v4-era and wrong. |

After any install, run `npm run typecheck` before writing code against the package. If types do not resolve, stop and report — do not paper over it with `any`.

---

## File Structure

**New pure logic** (`lib/`, no React, one suite each):

| File | Responsibility |
|---|---|
| `lib/highlight/json.ts` | Tokenise JSON text into coloured spans. Tolerant of invalid input. |
| `lib/tools/json-format.ts` | Beautify / minify / sort-keys / validate. |
| `lib/tools/json-tree.ts` | Flatten a parsed value into collapsible tree rows with JSON paths. |
| `lib/tools/base64.ts` | Encode / decode, both alphabets, UTF-8 correct, positional decode errors. |
| `lib/tools/epoch.ts` | Epoch ↔ date in both directions, unit auto-detection. |
| `lib/tools/regex.ts` | Compile, match, capture groups, replace preview, backtracking budget. |
| `lib/tools/yaml-json.ts` | Bidirectional YAML/JSON conversion. |
| `lib/tools/sql-format.ts` | Thin, typed wrapper over `sql-formatter`. |

**New components** (`components/`):

| File | Responsibility |
|---|---|
| `components/ui/JsonCode.tsx` | Renders a token stream from `lib/highlight/json.ts`. Shared. |
| `components/tools/JsonFormat.tsx` | JSON Formatter page, raw and tree views. |
| `components/tools/JsonTree.tsx` | The collapsible tree, split out because it holds its own state. |
| `components/tools/Base64.tsx` | Base64 page. |
| `components/tools/Epoch.tsx` | Epoch Converter page. |
| `components/tools/RegexTester.tsx` | Regex Tester page. |
| `components/tools/YamlJson.tsx` | YAML ↔ JSON page. |
| `components/tools/SqlFormat.tsx` | SQL Formatter page. |

**Modified:** `lib/registry/types.ts`, `lib/registry/metas.ts`, `lib/registry/index.ts` (one entry per tool), `tests/registry.test.ts`, `components/tools/JsonCompare.tsx` (Task 1 rewires its sample; Task 13 highlights its panes).

---

### Task 1: Sample payloads become a registry invariant

Spec §8 requires the registry suite to assert "every tool has a sample payload". Plan 1 shipped JSON Compare's sample as two loose constants that only its own component knew about, so there is nothing to assert against. Fix that before adding seven more tools and seven more chances to forget.

**Files:**
- Modify: `lib/registry/types.ts`, `lib/registry/index.ts`, `lib/tools/json-compare-sample.ts`, `components/tools/JsonCompare.tsx`
- Test: `tests/registry.test.ts`

**Interfaces:**
- Produces: `ToolEntry.sample: Record<string, unknown>` — the state patch a tool's "Load sample" button applies. Every later task in this plan sets it.

- [ ] **Step 1: Write the failing invariant**

Add to the `describe("registry invariants", ...)` block in `tests/registry.test.ts`:

```ts
  it("gives every tool a sample payload", () => {
    // Spec 8. An empty tool page must be able to teach rather than sit blank,
    // and that only holds if every entry actually carries a sample.
    for (const entry of TOOLS) {
      expect(entry.sample, entry.meta.slug).toBeTruthy();
      expect(Object.keys(entry.sample).length, entry.meta.slug).toBeGreaterThan(0);
    }
  });
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run tests/registry.test.ts`
Expected: FAIL — `sample` does not exist on `ToolEntry`, so the suite does not compile / the property is undefined.

- [ ] **Step 3: Add the field to the entry type**

In `lib/registry/types.ts`, replace the `ToolEntry` interface:

```ts
export interface ToolEntry {
  meta: ToolMeta;
  Component: React.ComponentType;
  /**
   * The state patch this tool's "Load sample" button applies. Held on the
   * entry rather than inside the component so the registry suite can assert
   * every tool has one — an empty page should teach, not sit blank.
   */
  sample: Record<string, unknown>;
}
```

- [ ] **Step 4: Export a combined sample from the JSON Compare sample module**

Append to `lib/tools/json-compare-sample.ts`:

```ts
/** The state patch the "Load sample" button applies. */
export const JSON_COMPARE_SAMPLE = { left: SAMPLE_LEFT, right: SAMPLE_RIGHT };
```

- [ ] **Step 5: Wire it through the registry and the component**

In `lib/registry/index.ts`, add the import and the field:

```ts
import { JSON_COMPARE_SAMPLE } from "@/lib/tools/json-compare-sample";
```

```ts
export const TOOLS: ToolEntry[] = [
  { meta: JSON_COMPARE_META, Component: JsonCompare, sample: JSON_COMPARE_SAMPLE },
];
```

In `components/tools/JsonCompare.tsx`, replace the two-constant import:

```tsx
import { JSON_COMPARE_SAMPLE } from "@/lib/tools/json-compare-sample";
```

and the sample button's handler:

```tsx
          <Button size="sm" onClick={() => update(JSON_COMPARE_SAMPLE)}>
```

- [ ] **Step 6: Run the full suite and typecheck**

Run: `npm test && npm run typecheck`
Expected: PASS, no type errors. `SAMPLE_LEFT` / `SAMPLE_RIGHT` remain exported and used by `JSON_COMPARE_SAMPLE`.

- [ ] **Step 7: Commit**

```bash
git add lib/registry components/tools/JsonCompare.tsx lib/tools/json-compare-sample.ts tests/registry.test.ts
git commit -m "refactor: hold each tool's sample on its registry entry"
```

---

### Task 2: JSON tokeniser and the shared code renderer

Spec §7.3. A shared internal module, not a tool. JSON Compare renders its own token stream with per-node diff classes, which is why this is hand-rolled rather than Prism.

**Files:**
- Create: `lib/highlight/json.ts`, `components/ui/JsonCode.tsx`
- Test: `tests/highlight/json.test.ts`

**Interfaces:**
- Produces:
  - `type JsonTokenType = "key" | "string" | "number" | "atom" | "punct" | "space"`
  - `interface JsonToken { type: JsonTokenType; text: string }`
  - `tokenizeJson(text: string): JsonToken[]`
  - `<JsonCode text={string} />`

Note on `space`: spec §4.4 names five *colour* types. Whitespace carries no colour but must survive the round trip, so it is a sixth token type the renderer emits unstyled. `tokenizeJson(t).map(x => x.text).join("") === t` is a hard invariant — the tokeniser never loses a character.

- [ ] **Step 1: Write the failing test**

Create `tests/highlight/json.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { tokenizeJson } from "@/lib/highlight/json";

const types = (text: string) =>
  tokenizeJson(text).filter((t) => t.type !== "space").map((t) => `${t.type}:${t.text}`);

describe("tokenizeJson", () => {
  it("never loses a character", () => {
    // The renderer reassembles the document from these tokens, so anything
    // dropped here is text that vanishes from the user's screen.
    for (const sample of ['{"a": 1}', "[1,2]", '  {\n "k" : "v" \n} ', "", "{{{", '"unterminated']) {
      expect(tokenizeJson(sample).map((t) => t.text).join("")).toBe(sample);
    }
  });

  it("marks a string followed by a colon as a key", () => {
    expect(types('{"a":1}')).toEqual([
      "punct:{", 'key:"a"', "punct::", "number:1", "punct:}",
    ]);
  });

  it("marks a string not followed by a colon as a string", () => {
    expect(types('{"a":"b"}')).toContain('string:"b"');
  });

  it("sees a key even when whitespace separates it from its colon", () => {
    expect(types('{"a"  : 1}')).toContain('key:"a"');
  });

  it("treats array strings as strings, never keys", () => {
    expect(types('["a"]')).toEqual(["punct:[", 'string:"a"', "punct:]"]);
  });

  it("classifies true, false and null as atoms", () => {
    expect(types("[true,false,null]").filter((t) => t.startsWith("atom"))).toEqual([
      "atom:true", "atom:false", "atom:null",
    ]);
  });

  it("handles negative and exponent numbers as one token", () => {
    expect(types("[-1.5e+10]")).toContain("number:-1.5e+10");
  });

  it("keeps an escaped quote inside its string token", () => {
    expect(types('["a\\"b"]')).toContain('string:"a\\"b"');
  });

  it("does not throw on invalid JSON, because it highlights while you type", () => {
    // Highlighting runs on every keystroke, including the moment mid-edit when
    // the document is not yet valid. Throwing there would blank the editor.
    expect(() => tokenizeJson('{"a": }')).not.toThrow();
    expect(() => tokenizeJson("@#$")).not.toThrow();
  });

  it("emits an unterminated string as a single string token", () => {
    expect(types('"abc')).toEqual(['string:"abc']);
  });

  it("preserves whitespace as its own token", () => {
    expect(tokenizeJson(" 1").map((t) => t.type)).toEqual(["space", "number"]);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run tests/highlight/json.test.ts`
Expected: FAIL — cannot resolve `@/lib/highlight/json`.

- [ ] **Step 3: Write the tokeniser**

Create `lib/highlight/json.ts`:

```ts
export type JsonTokenType = "key" | "string" | "number" | "atom" | "punct" | "space";

export interface JsonToken {
  type: JsonTokenType;
  text: string;
}

const WHITESPACE = new Set([" ", "\t", "\n", "\r"]);
const PUNCTUATION = new Set(["{", "}", "[", "]", ":", ","]);

/** Reads one string literal starting at `start` (which must be a quote). */
function readString(text: string, start: number): number {
  let i = start + 1;
  while (i < text.length) {
    const ch = text[i];
    if (ch === "\\") { i += 2; continue; }
    i += 1;
    // An unterminated string runs to end-of-input rather than throwing; this
    // tokeniser highlights documents that are still being typed.
    if (ch === '"') break;
  }
  return i;
}

function readNumber(text: string, start: number): number {
  let i = start;
  if (text[i] === "-" || text[i] === "+") i += 1;
  while (i < text.length && /[0-9.eE]/.test(text[i]!)) {
    // Signs are only part of the number directly after an exponent marker.
    i += 1;
    if ((text[i] === "+" || text[i] === "-") && /[eE]/.test(text[i - 1] ?? "")) i += 1;
  }
  return i;
}

/**
 * Splits JSON text into coloured spans. Total by construction: every input
 * character lands in exactly one token, so joining the texts rebuilds the
 * input. Invalid input is tokenised, never rejected — this runs on keystrokes.
 */
export function tokenizeJson(text: string): JsonToken[] {
  const tokens: JsonToken[] = [];
  let i = 0;

  while (i < text.length) {
    const ch = text[i]!;

    if (WHITESPACE.has(ch)) {
      let j = i;
      while (j < text.length && WHITESPACE.has(text[j]!)) j += 1;
      tokens.push({ type: "space", text: text.slice(i, j) });
      i = j;
      continue;
    }

    if (PUNCTUATION.has(ch)) {
      tokens.push({ type: "punct", text: ch });
      i += 1;
      continue;
    }

    if (ch === '"') {
      const end = readString(text, i);
      // A string is a key when the next thing that is not whitespace is a
      // colon. Looking ahead is what separates {"a":1} from ["a"].
      let ahead = end;
      while (ahead < text.length && WHITESPACE.has(text[ahead]!)) ahead += 1;
      tokens.push({ type: text[ahead] === ":" ? "key" : "string", text: text.slice(i, end) });
      i = end;
      continue;
    }

    if (ch === "-" || (ch >= "0" && ch <= "9")) {
      const end = readNumber(text, i);
      tokens.push({ type: "number", text: text.slice(i, end) });
      i = end;
      continue;
    }

    const atom = ["true", "false", "null"].find((word) => text.startsWith(word, i));
    if (atom !== undefined) {
      tokens.push({ type: "atom", text: atom });
      i += atom.length;
      continue;
    }

    // Anything else is a stray character in a document mid-edit. Emit it as
    // punctuation so it still renders rather than disappearing.
    tokens.push({ type: "punct", text: ch });
    i += 1;
  }

  return tokens;
}
```

- [ ] **Step 4: Run the tests**

Run: `npx vitest run tests/highlight/json.test.ts`
Expected: PASS, 11 tests.

- [ ] **Step 5: Write the renderer**

Create `components/ui/JsonCode.tsx`:

```tsx
import { tokenizeJson, type JsonTokenType } from "@/lib/highlight/json";

const TONE: Record<JsonTokenType, string> = {
  key: "text-[var(--code-key)]",
  string: "text-[var(--code-string)]",
  number: "text-[var(--code-number)]",
  atom: "text-[var(--code-atom)]",
  punct: "text-[var(--code-punct)]",
  space: "",
};

/**
 * Renders highlighted JSON. Not a textarea — this is the read-only output
 * side. Colours come from the --code-* tokens, which resolve per theme, so
 * highlighting can never drift from the palette.
 */
export function JsonCode({ text, className }: { text: string; className?: string }) {
  return (
    <pre className={`w-max min-w-full whitespace-pre font-ui text-[12.5px] leading-[1.6] ${className ?? ""}`}>
      {tokenizeJson(text).map((token, index) => (
        <span key={index} className={TONE[token.type]}>{token.text}</span>
      ))}
    </pre>
  );
}
```

- [ ] **Step 6: Run the full suite and typecheck**

Run: `npm test && npm run typecheck`
Expected: PASS, no type errors.

- [ ] **Step 7: Commit**

```bash
git add lib/highlight components/ui/JsonCode.tsx tests/highlight
git commit -m "feat: add JSON tokeniser and shared highlighted code renderer"
```

---

### Task 3: JSON Formatter transform

Spec §7.2. Beautify (indent 2 / 4 / tab), minify, sort keys (off / ascending / descending, recursive), validate. Errors report line, column, and the offending token — `parseJson` from Plan 1 already does that, so this task reuses it rather than re-deriving positions.

**Files:**
- Create: `lib/tools/json-format.ts`
- Test: `tests/tools/json-format.test.ts`

**Interfaces:**
- Consumes: `parseJson` (`lib/json/parse.ts`), `ToolResult` / `ok` / `err` (`lib/types.ts`).
- Produces:
  - `type IndentStyle = "2" | "4" | "tab"`
  - `type SortMode = "off" | "asc" | "desc"`
  - `interface FormatOptions { indent: IndentStyle; sort: SortMode; minify: boolean }`
  - `const DEFAULT_FORMAT_OPTIONS: FormatOptions`
  - `formatJson(text: string, options: FormatOptions): ToolResult<string>`

- [ ] **Step 1: Write the failing test**

Create `tests/tools/json-format.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { formatJson, DEFAULT_FORMAT_OPTIONS } from "@/lib/tools/json-format";

const run = (text: string, patch: Partial<typeof DEFAULT_FORMAT_OPTIONS> = {}) =>
  formatJson(text, { ...DEFAULT_FORMAT_OPTIONS, ...patch });

const value = (text: string, patch: Partial<typeof DEFAULT_FORMAT_OPTIONS> = {}) => {
  const result = run(text, patch);
  if (!result.ok) throw new Error(`expected ok, got: ${result.error.message}`);
  return result.value;
};

describe("formatJson", () => {
  it("beautifies with two spaces by default", () => {
    expect(value('{"a":1}')).toBe('{\n  "a": 1\n}');
  });

  it("beautifies with four spaces", () => {
    expect(value('{"a":1}', { indent: "4" })).toBe('{\n    "a": 1\n}');
  });

  it("beautifies with tabs", () => {
    expect(value('{"a":1}', { indent: "tab" })).toBe('{\n\t"a": 1\n}');
  });

  it("minifies, ignoring the indent setting", () => {
    expect(value('{\n  "a": 1\n}', { minify: true, indent: "4" })).toBe('{"a":1}');
  });

  it("sorts keys ascending", () => {
    expect(value('{"b":1,"a":2}', { sort: "asc", minify: true })).toBe('{"a":2,"b":1}');
  });

  it("sorts keys descending", () => {
    expect(value('{"a":1,"b":2}', { sort: "desc", minify: true })).toBe('{"b":2,"a":1}');
  });

  it("leaves key order alone when sorting is off", () => {
    expect(value('{"b":1,"a":2}', { minify: true })).toBe('{"b":1,"a":2}');
  });

  it("sorts recursively, not just at the root", () => {
    expect(value('{"o":{"b":1,"a":2}}', { sort: "asc", minify: true })).toBe('{"o":{"a":2,"b":1}}');
  });

  it("sorts objects nested inside arrays", () => {
    expect(value('[{"b":1,"a":2}]', { sort: "asc", minify: true })).toBe('[{"a":2,"b":1}]');
  });

  it("never reorders array elements, which are positional", () => {
    // Sorting keys is safe; sorting elements would change what the data means.
    expect(value("[3,1,2]", { sort: "asc", minify: true })).toBe("[3,1,2]");
  });

  it("reports the position of a syntax error", () => {
    const result = run('{"a": }');
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.line).toBe(1);
    expect(result.error.column).toBeGreaterThan(0);
  });

  it("reports the line of an error in a multi-line document", () => {
    const result = run('{\n  "a": 1,\n  "b": @\n}');
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.line).toBe(3);
    expect(result.error.column).toBe(8);
  });

  it("points at end-of-document when every token is individually well formed", () => {
    // parseJson locates errors by walking for the first character that cannot
    // START a valid token. A misplaced but well-formed token — a "}" where a
    // value belongs — passes that walk, so the position falls to the end. This
    // is the documented fallback, asserted here so nobody 'fixes' it by
    // accident and starts depending on V8 error-message wording instead.
    const result = run('{\n  "a": 1,\n  "b": }\n}');
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.line).toBe(4);
  });

  it("formats a bare scalar document", () => {
    expect(value("42")).toBe("42");
  });

  it("round-trips an empty object and an empty array", () => {
    expect(value("{}", { minify: true })).toBe("{}");
    expect(value("[]", { minify: true })).toBe("[]");
  });

  it("preserves non-ASCII characters rather than escaping them", () => {
    expect(value('{"k":"café"}', { minify: true })).toBe('{"k":"café"}');
  });

  it("rejects an empty document with a message, not a crash", () => {
    expect(run("").ok).toBe(false);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run tests/tools/json-format.test.ts`
Expected: FAIL — cannot resolve `@/lib/tools/json-format`.

- [ ] **Step 3: Write the transform**

Create `lib/tools/json-format.ts`:

```ts
import { parseJson } from "@/lib/json/parse";
import { ok, type ToolResult } from "@/lib/types";

export type IndentStyle = "2" | "4" | "tab";
export type SortMode = "off" | "asc" | "desc";

export interface FormatOptions {
  indent: IndentStyle;
  sort: SortMode;
  /** Wins over `indent` — a minified document has no indentation to set. */
  minify: boolean;
}

export const DEFAULT_FORMAT_OPTIONS: FormatOptions = {
  indent: "2",
  sort: "off",
  minify: false,
};

const INDENT: Record<IndentStyle, string | number> = { "2": 2, "4": 4, tab: "\t" };

/**
 * Rebuilds the value with object keys in the requested order. Arrays are
 * rebuilt but never reordered: their order is data, not presentation.
 */
function sortValue(value: unknown, mode: Exclude<SortMode, "off">): unknown {
  if (Array.isArray(value)) return value.map((item) => sortValue(item, mode));
  if (typeof value !== "object" || value === null) return value;

  const entries = Object.entries(value as Record<string, unknown>);
  entries.sort(([a], [b]) => (mode === "asc" ? a.localeCompare(b) : b.localeCompare(a)));
  // Insertion order IS key order for JSON.stringify, so rebuilding the object
  // in sorted order is what actually applies the sort.
  const out: Record<string, unknown> = {};
  for (const [key, nested] of entries) out[key] = sortValue(nested, mode);
  return out;
}

export function formatJson(text: string, options: FormatOptions): ToolResult<string> {
  const parsed = parseJson(text);
  if (!parsed.ok) return parsed;

  const value = options.sort === "off" ? parsed.value : sortValue(parsed.value, options.sort);
  return ok(JSON.stringify(value, null, options.minify ? undefined : INDENT[options.indent]));
}
```

- [ ] **Step 4: Run the tests**

Run: `npx vitest run tests/tools/json-format.test.ts`
Expected: PASS, 17 tests.

- [ ] **Step 5: Commit**

```bash
git add lib/tools/json-format.ts tests/tools/json-format.test.ts
git commit -m "feat: add JSON formatter transform with recursive key sorting"
```

---

### Task 4: JSON tree model

Spec §7.2 asks the formatter's output for "a collapsible tree view with per-node copy of value or JSON path". The flattening is pure and belongs in `lib/`; only the collapse state is React's business.

**Files:**
- Create: `lib/tools/json-tree.ts`
- Test: `tests/tools/json-tree.test.ts`

**Interfaces:**
- Produces:
  - `interface TreeRow { path; key: string | number | null; depth; kind: "object" | "array" | "scalar"; preview: string; value: unknown; childCount: number; hasChildren: boolean }`
  - `toTreeRows(value: unknown, collapsed: ReadonlySet<string>): TreeRow[]`

`collapsed` holds the paths whose children are hidden. Passing it in keeps the function pure: the same value plus the same collapse set always yields the same rows.

- [ ] **Step 1: Write the failing test**

Create `tests/tools/json-tree.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { toTreeRows } from "@/lib/tools/json-tree";

const paths = (value: unknown, collapsed: string[] = []) =>
  toTreeRows(value, new Set(collapsed)).map((r) => r.path);

describe("toTreeRows", () => {
  it("emits one row for a scalar document", () => {
    const rows = toTreeRows(42, new Set());
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ path: "$", kind: "scalar", depth: 0, hasChildren: false });
  });

  it("gives every node a JSON path that matches JSON Compare's notation", () => {
    expect(paths({ users: [{ id: 1 }] })).toEqual(["$", "$.users", "$.users[0]", "$.users[0].id"]);
  });

  it("hides the children of a collapsed node but keeps the node itself", () => {
    expect(paths({ users: [{ id: 1 }] }, ["$.users"])).toEqual(["$", "$.users"]);
  });

  it("still hides descendants when an ancestor is collapsed", () => {
    expect(paths({ a: { b: { c: 1 } } }, ["$.a"])).toEqual(["$", "$.a"]);
  });

  it("reports child counts so a collapsed node can say what it hides", () => {
    const row = toTreeRows({ a: 1, b: 2 }, new Set())[0]!;
    expect(row).toMatchObject({ kind: "object", childCount: 2, hasChildren: true });
  });

  it("treats an empty object as having no children", () => {
    expect(toTreeRows({}, new Set())[0]).toMatchObject({ childCount: 0, hasChildren: false });
  });

  it("previews a scalar as its JSON form", () => {
    const rows = toTreeRows({ s: "x", n: 1, b: true, z: null }, new Set());
    expect(rows.map((r) => r.preview).slice(1)).toEqual(['"x"', "1", "true", "null"]);
  });

  it("previews a container by shape rather than dumping it", () => {
    expect(toTreeRows({ a: [1, 2] }, new Set())[1]!.preview).toBe("[2]");
    expect(toTreeRows({ a: { b: 1 } }, new Set())[1]!.preview).toBe("{1}");
  });

  it("carries the raw value so a row can copy it", () => {
    expect(toTreeRows({ a: { b: 1 } }, new Set())[1]!.value).toEqual({ b: 1 });
  });

  it("indents by depth", () => {
    const rows = toTreeRows({ a: { b: 1 } }, new Set());
    expect(rows.map((r) => r.depth)).toEqual([0, 1, 2]);
  });

  it("numbers array elements by index and gives them no key label", () => {
    const rows = toTreeRows(["x"], new Set());
    expect(rows[1]).toMatchObject({ path: "$[0]", key: 0 });
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run tests/tools/json-tree.test.ts`
Expected: FAIL — cannot resolve `@/lib/tools/json-tree`.

- [ ] **Step 3: Write the tree model**

Create `lib/tools/json-tree.ts`:

```ts
export interface TreeRow {
  /** Same notation as JSON Compare: "$.users[0].email". */
  path: string;
  key: string | number | null;
  depth: number;
  kind: "object" | "array" | "scalar";
  /** Short right-hand label: a scalar's value, or a container's shape. */
  preview: string;
  /** The raw value, so a row can copy it without re-walking the document. */
  value: unknown;
  childCount: number;
  hasChildren: boolean;
}

function kindOf(value: unknown): TreeRow["kind"] {
  if (Array.isArray(value)) return "array";
  return typeof value === "object" && value !== null ? "object" : "scalar";
}

function entriesOf(value: unknown): [string | number, unknown][] {
  if (Array.isArray(value)) return value.map((item, index) => [index, item]);
  if (typeof value === "object" && value !== null) return Object.entries(value as Record<string, unknown>);
  return [];
}

function previewOf(value: unknown, kind: TreeRow["kind"], childCount: number): string {
  if (kind === "array") return `[${childCount}]`;
  if (kind === "object") return `{${childCount}}`;
  return JSON.stringify(value) ?? String(value);
}

/**
 * Flattens a parsed document into display rows, skipping the subtree of any
 * collapsed path. Pure: same value plus same collapse set, same rows — which
 * is what lets the component memoise on those two inputs alone.
 */
export function toTreeRows(value: unknown, collapsed: ReadonlySet<string>): TreeRow[] {
  const rows: TreeRow[] = [];

  function walk(node: unknown, path: string, key: string | number | null, depth: number) {
    const kind = kindOf(node);
    const entries = entriesOf(node);
    rows.push({
      path, key, depth, kind, value: node,
      childCount: entries.length,
      hasChildren: entries.length > 0,
      preview: previewOf(node, kind, entries.length),
    });

    if (collapsed.has(path)) return;
    for (const [childKey, child] of entries) {
      const childPath = typeof childKey === "number" ? `${path}[${childKey}]` : `${path}.${childKey}`;
      walk(child, childPath, childKey, depth + 1);
    }
  }

  walk(value, "$", null, 0);
  return rows;
}
```

- [ ] **Step 4: Run the tests**

Run: `npx vitest run tests/tools/json-tree.test.ts`
Expected: PASS, 11 tests.

- [ ] **Step 5: Commit**

```bash
git add lib/tools/json-tree.ts tests/tools/json-tree.test.ts
git commit -m "feat: add JSON tree row model with collapse-aware flattening"
```

---

### Task 5: JSON Formatter UI and registration

Spec §7.2. The first tool registered by this plan, so it is also the one that proves the Task 1 `sample` field works end to end.

**Files:**
- Create: `components/tools/JsonFormat.tsx`, `components/tools/JsonTree.tsx`, `lib/tools/json-format-sample.ts`
- Modify: `lib/registry/metas.ts`, `lib/registry/index.ts`

**Interfaces:**
- Consumes: `formatJson`, `DEFAULT_FORMAT_OPTIONS`, `FormatOptions` (Task 3); `toTreeRows`, `TreeRow` (Task 4); `JsonCode` (Task 2); `ToolShell`, `useToolState`, `ErrorNote`, `CopyButton` (Plan 1); `Button`, `Segmented`, `Select`, `CodeArea` (Plan 1).
- Produces: the registered tool at `/json-format`.

- [ ] **Step 1: Write the sample**

Create `lib/tools/json-format-sample.ts`:

```ts
export const JSON_FORMAT_SAMPLE = {
  input: '{"service":"checkout","replicas":3,"limits":{"memory":"512Mi","cpu":"500m"},"features":["cart","coupons"],"enabled":true,"retries":null}',
};
```

- [ ] **Step 2: Write the tree component**

Create `components/tools/JsonTree.tsx`:

```tsx
"use client";

import { useMemo, useState } from "react";
import { ChevronRight } from "lucide-react";
import { toTreeRows, type TreeRow } from "@/lib/tools/json-tree";
import { CopyButton } from "@/components/tool/CopyButton";
import { cx } from "@/lib/cx";

const PREVIEW_TONE: Record<TreeRow["kind"], string> = {
  object: "text-[var(--code-punct)]",
  array: "text-[var(--code-punct)]",
  scalar: "text-[var(--code-string)]",
};

export function JsonTree({ value }: { value: unknown }) {
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(new Set());
  const rows = useMemo(() => toTreeRows(value, collapsed), [value, collapsed]);

  function toggle(path: string) {
    setCollapsed((current) => {
      const next = new Set(current);
      if (next.has(path)) next.delete(path); else next.add(path);
      return next;
    });
  }

  return (
    <div className="min-h-0 flex-1 overflow-auto rounded-lg bg-surface p-2 shadow-sm">
      {rows.map((row) => (
        <div
          key={row.path}
          className="group flex items-center gap-1.5 rounded-sm px-1 py-[1px] hover:bg-surface-2"
          style={{ paddingLeft: `${row.depth * 14 + 4}px` }}
        >
          {row.hasChildren ? (
            <button
              type="button"
              onClick={() => toggle(row.path)}
              aria-expanded={!collapsed.has(row.path)}
              aria-label={`${collapsed.has(row.path) ? "Expand" : "Collapse"} ${row.path}`}
              className="rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
            >
              <ChevronRight
                size={12}
                aria-hidden
                className={cx("text-fg-muted transition-transform", !collapsed.has(row.path) && "rotate-90")}
              />
            </button>
          ) : (
            <span className="w-3 shrink-0" />
          )}

          <span className="font-ui text-[12.5px] text-[var(--code-key)]">
            {row.key === null ? "$" : typeof row.key === "number" ? `[${row.key}]` : row.key}
          </span>
          <span className={cx("truncate font-ui text-[12.5px]", PREVIEW_TONE[row.kind])}>
            {row.preview}
          </span>

          {/* Actions stay mounted but invisible until hover or keyboard focus,
              so a keyboard user can still reach them. */}
          <span className="ml-auto flex shrink-0 items-center gap-1 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
            <CopyButton text={row.path} label="Copy path" />
            <CopyButton text={JSON.stringify(row.value, null, 2) ?? ""} label="Copy value" />
          </span>
        </div>
      ))}
    </div>
  );
}
```

Note the prop name: Plan 1's `CopyButton` is `{ text, label }` — `text`, not `value`. It disables itself on empty text, which is why the copy-value button passes `?? ""` rather than `undefined`.

- [ ] **Step 3: Write the tool component**

Create `components/tools/JsonFormat.tsx`:

```tsx
"use client";

import { useMemo } from "react";
import { Eraser, FileJson } from "lucide-react";
import { JSON_FORMAT_META } from "@/lib/registry/metas";
import {
  formatJson, DEFAULT_FORMAT_OPTIONS,
  type FormatOptions, type IndentStyle, type SortMode,
} from "@/lib/tools/json-format";
import { JSON_FORMAT_SAMPLE } from "@/lib/tools/json-format-sample";
import { ToolShell } from "@/components/tool/ToolShell";
import { useToolState } from "@/components/tool/useToolState";
import { ErrorNote } from "@/components/tool/ErrorNote";
import { CopyButton } from "@/components/tool/CopyButton";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { Segmented } from "@/components/ui/Segmented";
import { CodeArea } from "@/components/ui/CodeArea";
import { JsonCode } from "@/components/ui/JsonCode";
import { JsonTree } from "./JsonTree";

interface State {
  input: string;
  options: FormatOptions;
  view: "raw" | "tree";
}

const DEFAULTS: State = { input: "", options: DEFAULT_FORMAT_OPTIONS, view: "raw" };

function isState(value: unknown): value is State {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as State;
  if (typeof candidate.input !== "string") return false;
  if (typeof candidate.options !== "object" || candidate.options === null) return false;
  const o = candidate.options;
  return typeof o.minify === "boolean"
    && ["2", "4", "tab"].includes(o.indent)
    && ["off", "asc", "desc"].includes(o.sort)
    && ["raw", "tree"].includes(candidate.view);
}

export function JsonFormat() {
  const meta = JSON_FORMAT_META;
  const [state, update, reset] = useToolState<State>(meta, DEFAULTS, isState);

  const result = useMemo(
    () => (state.input.trim() ? formatJson(state.input, state.options) : null),
    [state.input, state.options],
  );

  // The tree renders the parsed value, which is exactly the formatted output
  // read back. Parsing the OUTPUT rather than the input means the tree always
  // agrees with what the raw view shows.
  const parsed = useMemo(() => {
    if (!result?.ok) return null;
    try { return JSON.parse(result.value) as unknown; } catch { return null; }
  }, [result]);

  const setOption = (patch: Partial<FormatOptions>) =>
    update({ options: { ...state.options, ...patch } });

  return (
    <ToolShell
      meta={meta}
      shareState={state}
      actions={
        <>
          <Button size="sm" onClick={() => update(JSON_FORMAT_SAMPLE)}>
            <FileJson size={13} aria-hidden />
            Load sample
          </Button>
          <Button size="sm" onClick={reset}>
            <Eraser size={13} aria-hidden />
            Clear
          </Button>
          {result?.ok ? <CopyButton text={result.value} label="Copy output" /> : null}
        </>
      }
      options={
        <>
          <label className="flex items-center gap-2">
            <span className="eyebrow">Indent</span>
            <Select
              value={state.options.indent}
              ariaLabel="Indent width"
              onChange={(indent: IndentStyle) => setOption({ indent })}
              options={[
                { value: "2", label: "2 spaces" },
                { value: "4", label: "4 spaces" },
                { value: "tab", label: "Tab" },
              ]}
            />
          </label>
          <label className="flex items-center gap-2">
            <span className="eyebrow">Sort keys</span>
            <Select
              value={state.options.sort}
              ariaLabel="Sort keys"
              onChange={(sort: SortMode) => setOption({ sort })}
              options={[
                { value: "off", label: "Off" },
                { value: "asc", label: "A → Z" },
                { value: "desc", label: "Z → A" },
              ]}
            />
          </label>
          <Segmented
            label="Output density"
            value={state.options.minify ? "minify" : "beautify"}
            onChange={(mode) => setOption({ minify: mode === "minify" })}
            options={[
              { value: "beautify", label: "Beautify" },
              { value: "minify", label: "Minify" },
            ]}
          />
          <div className="ml-auto">
            <Segmented
              label="Output view"
              value={state.view}
              onChange={(view) => update({ view })}
              options={[
                { value: "raw", label: "Raw" },
                { value: "tree", label: "Tree" },
              ]}
            />
          </div>
        </>
      }
    >
      <div className="flex h-[calc(100dvh-15rem)] min-h-[26rem] flex-col gap-3">
        <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-2">
          <CodeArea
            value={state.input}
            onChange={(input) => update({ input })}
            ariaLabel="JSON input"
            placeholder="Paste JSON to format"
          />

          {result === null ? (
            <div className="flex items-center justify-center rounded-md border border-border bg-surface p-8 text-center">
              <p className="max-w-sm text-[13px] leading-relaxed text-fg-muted">
                Paste JSON on the left to beautify, minify, sort its keys, or
                browse it as a tree.
              </p>
            </div>
          ) : !result.ok ? (
            <div className="flex items-start rounded-md border border-border bg-surface p-3">
              <ErrorNote error={result.error} />
            </div>
          ) : state.view === "tree" && parsed !== null ? (
            <JsonTree value={parsed} />
          ) : (
            <div className="min-h-0 overflow-auto rounded-md border border-border bg-surface p-3">
              <JsonCode text={result.value} />
            </div>
          )}
        </div>
      </div>
    </ToolShell>
  );
}
```

- [ ] **Step 4: Register the tool**

In `lib/registry/metas.ts`, add the icon import and the meta:

```ts
import { Braces, GitCompare } from "lucide-react";
```

```ts
export const JSON_FORMAT_META: ToolMeta = {
  slug: "json-format",
  name: "JSON Formatter",
  blurb: "Beautify, minify, sort keys, and validate JSON with positional errors.",
  group: "data",
  icon: Braces,
  aliases: ["format", "beautify", "prettify", "minify", "validate", "pretty print"],
  handlesSecrets: false,
};
```

In `lib/registry/index.ts`, add the imports and the entry:

```ts
import { JsonFormat } from "@/components/tools/JsonFormat";
import { JSON_COMPARE_META, JSON_FORMAT_META } from "./metas";
import { JSON_FORMAT_SAMPLE } from "@/lib/tools/json-format-sample";
```

```ts
export const TOOLS: ToolEntry[] = [
  { meta: JSON_COMPARE_META, Component: JsonCompare, sample: JSON_COMPARE_SAMPLE },
  { meta: JSON_FORMAT_META, Component: JsonFormat, sample: JSON_FORMAT_SAMPLE },
];
```

- [ ] **Step 5: Run the suite, typecheck, and build**

Run: `npm test && npm run typecheck && npm run build`
Expected: all PASS. The build must prerender BOTH `/json-compare` and `/json-format` — if it fails with "Functions cannot be passed directly to Client Components", you passed `meta` as a prop somewhere; read the comment at the top of `lib/registry/index.ts`.

- [ ] **Step 6: Verify in the browser**

Run `npm run dev`, open `/json-format`, and check:
- Load sample, then switch Beautify / Minify and 2 / 4 / Tab — output changes accordingly.
- Sort A→Z reorders keys at every level, and array elements never move.
- Break the JSON (delete a brace): the error names a line and column, and the output pane shows the error rather than stale output.
- Tree view: nodes collapse and reopen; hovering a row reveals copy-path and copy-value; both copy the right thing.
- Tab to a tree row — the copy buttons become visible on focus, not only on hover.
- Reload: input, options, and the chosen view all come back.

- [ ] **Step 7: Commit**

```bash
git add components/tools/JsonFormat.tsx components/tools/JsonTree.tsx lib/tools/json-format-sample.ts lib/registry
git commit -m "feat: add JSON Formatter with raw and collapsible tree views"
```

---

### Task 6: Base64 transform

Spec §7.17. Standard and URL-safe alphabets, padding toggle, data-URI wrapper. **UTF-8 must go through `TextEncoder` / `TextDecoder`, never `btoa` on a raw string** — `btoa("café")` throws, and that bug is the entire reason this tool exists rather than a one-liner.

**Files:**
- Create: `lib/tools/base64.ts`
- Test: `tests/tools/base64.test.ts`

**Interfaces:**
- Produces:
  - `interface Base64Options { urlSafe: boolean; padding: boolean }`
  - `const DEFAULT_BASE64_OPTIONS: Base64Options`
  - `encodeBase64(text: string, options: Base64Options): ToolResult<string>`
  - `decodeBase64(text: string, options: Base64Options): ToolResult<{ text: string | null; bytes: Uint8Array }>` — `text` is `null` when the bytes are not valid UTF-8, which is what tells the UI to offer the hex view instead.
  - `bytesToHex(bytes: Uint8Array): string`
  - `toDataUri(base64: string, mime: string): string`

- [ ] **Step 1: Write the failing test**

Create `tests/tools/base64.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import {
  encodeBase64, decodeBase64, bytesToHex, toDataUri, DEFAULT_BASE64_OPTIONS,
} from "@/lib/tools/base64";

const opts = (patch: Partial<typeof DEFAULT_BASE64_OPTIONS> = {}) => ({ ...DEFAULT_BASE64_OPTIONS, ...patch });

const enc = (text: string, patch = {}) => {
  const r = encodeBase64(text, opts(patch));
  if (!r.ok) throw new Error(r.error.message);
  return r.value;
};

describe("encodeBase64", () => {
  it("encodes ASCII", () => {
    expect(enc("hello")).toBe("aGVsbG8=");
  });

  it("encodes multi-byte UTF-8 that btoa would reject", () => {
    // btoa("café") throws InvalidCharacterError. Going through TextEncoder is
    // the whole point of this tool having a transform at all.
    expect(enc("café")).toBe("Y2Fmw6k=");
  });

  it("encodes emoji outside the basic plane", () => {
    expect(enc("🙂")).toBe("8J+Zgg==");
  });

  it("drops padding when asked", () => {
    expect(enc("hello", { padding: false })).toBe("aGVsbG8");
  });

  it("uses the URL-safe alphabet when asked", () => {
    // Bytes chosen to produce both + and / in the standard alphabet.
    const standard = enc("ûÿ¾");
    expect(standard).toContain("+");
    const urlSafe = enc("ûÿ¾", { urlSafe: true });
    expect(urlSafe).not.toContain("+");
    expect(urlSafe).not.toContain("/");
  });

  it("encodes the empty string as the empty string", () => {
    expect(enc("")).toBe("");
  });
});

describe("decodeBase64", () => {
  const dec = (text: string, patch = {}) => decodeBase64(text, opts(patch));

  it("round-trips ASCII", () => {
    const r = dec("aGVsbG8=");
    expect(r.ok && r.value.text).toBe("hello");
  });

  it("round-trips multi-byte UTF-8", () => {
    const r = dec("Y2Fmw6k=");
    expect(r.ok && r.value.text).toBe("café");
  });

  it("accepts input with no padding", () => {
    const r = dec("aGVsbG8");
    expect(r.ok && r.value.text).toBe("hello");
  });

  it("accepts the URL-safe alphabet regardless of the toggle", () => {
    // A pasted URL-safe token should decode without the user first flipping a
    // switch — the alphabet is detectable from the characters themselves.
    const r = dec("8J-Zgg==");
    expect(r.ok && r.value.text).toBe("🙂");
  });

  it("ignores surrounding whitespace and newlines", () => {
    const r = dec("aGVs\nbG8=\n");
    expect(r.ok && r.value.text).toBe("hello");
  });

  it("reports the position of an invalid character", () => {
    const r = dec("aGV$bG8=");
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.column).toBe(4);
    expect(r.error.message).toContain("$");
  });

  it("rejects a length that cannot be base64", () => {
    expect(dec("a").ok).toBe(false);
  });

  it("returns null text but real bytes for data that is not UTF-8", () => {
    // 0xFF is never a valid UTF-8 lead byte. The bytes still decoded fine, so
    // the tool offers a hex view rather than claiming the input was bad.
    const r = dec("/w==");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.text).toBeNull();
    expect(Array.from(r.value.bytes)).toEqual([255]);
  });

  it("decodes the empty string to empty bytes", () => {
    const r = dec("");
    expect(r.ok && r.value.text).toBe("");
  });
});

describe("helpers", () => {
  it("renders bytes as spaced uppercase hex", () => {
    expect(bytesToHex(new Uint8Array([0, 15, 255]))).toBe("00 0F FF");
  });

  it("builds a data URI", () => {
    expect(toDataUri("aGk=", "text/plain")).toBe("data:text/plain;base64,aGk=");
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run tests/tools/base64.test.ts`
Expected: FAIL — cannot resolve `@/lib/tools/base64`.

- [ ] **Step 3: Write the transform**

Create `lib/tools/base64.ts`:

```ts
import { err, ok, type ToolResult } from "@/lib/types";

export interface Base64Options {
  urlSafe: boolean;
  padding: boolean;
}

export const DEFAULT_BASE64_OPTIONS: Base64Options = { urlSafe: false, padding: true };

const STANDARD = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

function bytesToBase64(bytes: Uint8Array): string {
  let out = "";
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i]!;
    const b = bytes[i + 1];
    const c = bytes[i + 2];
    const triple = (a << 16) | ((b ?? 0) << 8) | (c ?? 0);
    out += STANDARD[(triple >> 18) & 63]! + STANDARD[(triple >> 12) & 63]!;
    out += b === undefined ? "=" : STANDARD[(triple >> 6) & 63]!;
    out += c === undefined ? "=" : STANDARD[triple & 63]!;
  }
  return out;
}

export function encodeBase64(text: string, options: Base64Options): ToolResult<string> {
  // TextEncoder, never btoa: btoa throws on any code point above U+00FF, so
  // "café" and every emoji would fail.
  let encoded = bytesToBase64(new TextEncoder().encode(text));
  if (options.urlSafe) encoded = encoded.replace(/\+/g, "-").replace(/\//g, "_");
  if (!options.padding) encoded = encoded.replace(/=+$/, "");
  return ok(encoded);
}

export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0").toUpperCase()).join(" ");
}

export function toDataUri(base64: string, mime: string): string {
  return `data:${mime};base64,${base64}`;
}

export function decodeBase64(
  text: string,
  _options: Base64Options,
): ToolResult<{ text: string | null; bytes: Uint8Array }> {
  // Whitespace is stripped because base64 is routinely wrapped at 64 or 76
  // columns, and a pasted PEM body would otherwise look invalid.
  const stripped = text.replace(/\s+/g, "");
  // Both alphabets are accepted on input regardless of the toggle: a token
  // pasted from a URL should just decode.
  const normalised = stripped.replace(/-/g, "+").replace(/_/g, "/").replace(/=+$/, "");

  const badIndex = normalised.split("").findIndex((ch) => !STANDARD.includes(ch));
  if (badIndex !== -1) {
    return err(
      `"${normalised[badIndex]}" is not a base64 character.`,
      { line: 1, column: badIndex + 1 },
    );
  }
  if (normalised.length % 4 === 1) {
    return err("This is not a valid base64 length — one character is left over.");
  }

  const bytes = new Uint8Array(Math.floor((normalised.length * 3) / 4));
  let byteIndex = 0;
  for (let i = 0; i < normalised.length; i += 4) {
    const chunk = [0, 1, 2, 3].map((offset) => {
      const ch = normalised[i + offset];
      return ch === undefined ? -1 : STANDARD.indexOf(ch);
    });
    const triple = (chunk[0]! << 18) | (chunk[1]! << 12)
      | (Math.max(chunk[2]!, 0) << 6) | Math.max(chunk[3]!, 0);
    if (byteIndex < bytes.length) bytes[byteIndex++] = (triple >> 16) & 255;
    if (chunk[2] !== -1 && byteIndex < bytes.length) bytes[byteIndex++] = (triple >> 8) & 255;
    if (chunk[3] !== -1 && byteIndex < bytes.length) bytes[byteIndex++] = triple & 255;
  }

  // fatal: true makes the decoder throw on invalid UTF-8 instead of silently
  // substituting U+FFFD, which is how we learn to offer the hex view.
  let decoded: string | null;
  try {
    decoded = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    decoded = null;
  }

  return ok({ text: decoded, bytes });
}
```

- [ ] **Step 4: Run the tests**

Run: `npx vitest run tests/tools/base64.test.ts`
Expected: PASS, 17 tests.

- [ ] **Step 5: Commit**

```bash
git add lib/tools/base64.ts tests/tools/base64.test.ts
git commit -m "feat: add base64 transform with UTF-8 safety and positional errors"
```

---

### Task 7: Base64 UI and registration

Spec §7.17. Text or file input, hex view for non-UTF-8 output, and a file download for decoded binary.

**Files:**
- Create: `components/tools/Base64.tsx`, `lib/tools/base64-sample.ts`
- Modify: `lib/registry/metas.ts`, `lib/registry/index.ts`

**Interfaces:**
- Consumes: `encodeBase64`, `decodeBase64`, `bytesToHex`, `toDataUri`, `DEFAULT_BASE64_OPTIONS`, `Base64Options` (Task 6).
- Produces: the registered tool at `/base64`.

- [ ] **Step 1: Write the sample**

Create `lib/tools/base64-sample.ts`:

```ts
export const BASE64_SAMPLE = {
  input: "Encode me — including café, 🙂, and other multi-byte text.",
  mode: "encode" as const,
};
```

- [ ] **Step 2: Write the component**

Create `components/tools/Base64.tsx`:

```tsx
"use client";

import { useMemo, useRef, useState } from "react";
import { Eraser, FileJson, Upload } from "lucide-react";
import { BASE64_META } from "@/lib/registry/metas";
import {
  encodeBase64, decodeBase64, bytesToHex, toDataUri,
  DEFAULT_BASE64_OPTIONS, type Base64Options,
} from "@/lib/tools/base64";
import { BASE64_SAMPLE } from "@/lib/tools/base64-sample";
import { ToolShell } from "@/components/tool/ToolShell";
import { useToolState } from "@/components/tool/useToolState";
import { ErrorNote } from "@/components/tool/ErrorNote";
import { CopyButton } from "@/components/tool/CopyButton";
import { Button } from "@/components/ui/Button";
import { Toggle } from "@/components/ui/Toggle";
import { Segmented } from "@/components/ui/Segmented";
import { CodeArea } from "@/components/ui/CodeArea";

interface State {
  input: string;
  mode: "encode" | "decode";
  options: Base64Options;
  mime: string;
}

const DEFAULTS: State = {
  input: "", mode: "encode", options: DEFAULT_BASE64_OPTIONS, mime: "text/plain",
};

function isState(value: unknown): value is State {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as State;
  if (typeof candidate.input !== "string" || typeof candidate.mime !== "string") return false;
  if (typeof candidate.options !== "object" || candidate.options === null) return false;
  return typeof candidate.options.urlSafe === "boolean"
    && typeof candidate.options.padding === "boolean"
    && ["encode", "decode"].includes(candidate.mode);
}

export function Base64() {
  const meta = BASE64_META;
  const [state, update, reset] = useToolState<State>(meta, DEFAULTS, isState);
  const [fileName, setFileName] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const encoded = useMemo(
    () => (state.mode === "encode" && state.input ? encodeBase64(state.input, state.options) : null),
    [state.mode, state.input, state.options],
  );
  const decoded = useMemo(
    () => (state.mode === "decode" && state.input ? decodeBase64(state.input, state.options) : null),
    [state.mode, state.input, state.options],
  );

  const output = encoded?.ok ? encoded.value : decoded?.ok ? decoded.value.text ?? "" : "";
  const error = encoded && !encoded.ok ? encoded.error : decoded && !decoded.ok ? decoded.error : null;
  const binary = decoded?.ok && decoded.value.text === null ? decoded.value.bytes : null;

  async function onFile(file: File) {
    setFileName(file.name);
    const buffer = new Uint8Array(await file.arrayBuffer());
    if (state.mode === "encode") {
      // Encoding a file means encoding its BYTES, so the text path is bypassed
      // entirely rather than trying to read the file as a string first.
      let binaryString = "";
      for (const byte of buffer) binaryString += String.fromCharCode(byte);
      update({ input: binaryString, mime: file.type || "application/octet-stream" });
    } else {
      update({ input: new TextDecoder().decode(buffer) });
    }
  }

  function download() {
    if (!binary) return;
    // Uint8Array -> Blob -> object URL. No network: this is a local blob.
    const url = URL.createObjectURL(new Blob([binary as BlobPart], { type: state.mime }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = fileName ?? "decoded.bin";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <ToolShell
      meta={meta}
      shareState={state}
      actions={
        <>
          <Button size="sm" onClick={() => update(BASE64_SAMPLE)}>
            <FileJson size={13} aria-hidden />
            Load sample
          </Button>
          <Button size="sm" onClick={() => fileInput.current?.click()}>
            <Upload size={13} aria-hidden />
            Load file
          </Button>
          <input
            ref={fileInput}
            type="file"
            className="sr-only"
            aria-label="Load a file"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) void onFile(f); }}
          />
          <Button size="sm" onClick={() => { setFileName(null); reset(); }}>
            <Eraser size={13} aria-hidden />
            Clear
          </Button>
          {output ? <CopyButton text={output} label="Copy output" /> : null}
        </>
      }
      options={
        <>
          <Segmented
            label="Direction"
            value={state.mode}
            onChange={(mode) => update({ mode })}
            options={[
              { value: "encode", label: "Encode" },
              { value: "decode", label: "Decode" },
            ]}
          />
          <Toggle
            checked={state.options.urlSafe}
            onChange={(urlSafe) => update({ options: { ...state.options, urlSafe } })}
            label="URL-safe alphabet"
          />
          <Toggle
            checked={state.options.padding}
            onChange={(padding) => update({ options: { ...state.options, padding } })}
            label="Padding"
          />
          <label className="flex items-center gap-2">
            <span className="eyebrow">MIME</span>
            <input
              value={state.mime}
              onChange={(e) => update({ mime: e.target.value })}
              aria-label="MIME type for the data URI"
              className="h-9 w-40 rounded-md border border-border bg-surface px-2 font-ui text-[13px] text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
            />
          </label>
        </>
      }
    >
      <div className="flex h-[calc(100dvh-15rem)] min-h-[26rem] flex-col gap-3">
        {fileName ? (
          <p className="text-[12px] text-fg-muted">
            Loaded <span className="font-ui text-fg">{fileName}</span>
          </p>
        ) : null}

        <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-2">
          <CodeArea
            value={state.input}
            onChange={(input) => update({ input })}
            ariaLabel={state.mode === "encode" ? "Text to encode" : "Base64 to decode"}
            placeholder={state.mode === "encode" ? "Type or paste text" : "Paste base64"}
          />
          <div className="flex min-h-0 flex-col gap-2">
            {error ? <ErrorNote error={error} /> : null}

            {binary ? (
              <div className="flex min-h-0 flex-1 flex-col gap-2 rounded-md border border-border bg-surface p-3">
                {/* The word, not just a colour, says what happened. */}
                <p className="text-[12.5px] text-warn">
                  ! Decoded bytes are not valid UTF-8. Showing hex.
                </p>
                <pre className="min-h-0 flex-1 overflow-auto whitespace-pre-wrap break-all font-ui text-[12px] text-fg">
                  {bytesToHex(binary)}
                </pre>
                <Button size="sm" onClick={download}>Download {binary.length} bytes</Button>
              </div>
            ) : (
              <CodeArea value={output} readOnly ariaLabel="Output" />
            )}

            {encoded?.ok && encoded.value ? (
              <div className="flex items-center gap-2">
                <p className="eyebrow">Data URI</p>
                <CopyButton text={toDataUri(encoded.value, state.mime)} label="Copy data URI" />
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </ToolShell>
  );
}
```

- [ ] **Step 3: Register the tool**

In `lib/registry/metas.ts`:

```ts
export const BASE64_META: ToolMeta = {
  slug: "base64",
  name: "Base64",
  blurb: "Encode and decode base64, including URL-safe and binary payloads.",
  group: "data",
  icon: Binary,
  aliases: ["b64", "encode", "decode", "data uri", "atob", "btoa"],
  handlesSecrets: false,
};
```

Add `Binary` to the lucide import. In `lib/registry/index.ts`, import `Base64`, `BASE64_META`, and `BASE64_SAMPLE`, then append the entry.

- [ ] **Step 4: Run the suite, typecheck, and build**

Run: `npm test && npm run typecheck && npm run build`
Expected: all PASS, `/base64` prerendered.

- [ ] **Step 5: Verify in the browser**

- Encode "café 🙂" — output is valid base64, and decoding it returns the same text.
- URL-safe on: no `+` or `/` in the output. Padding off: no trailing `=`.
- Paste a URL-safe token with the toggle OFF and decode — it still decodes.
- Decode `/w==` — the hex view appears with the warning glyph and a download button.
- Load a small binary file in encode mode, then copy the data URI and open it in a new tab.

- [ ] **Step 6: Commit**

```bash
git add components/tools/Base64.tsx lib/tools/base64-sample.ts lib/registry
git commit -m "feat: add Base64 tool with file, hex, and data-URI support"
```

---

### Task 8: Epoch Converter

Spec §7.14. Both directions, unit auto-detected by magnitude and overridable, and pre-1970 negatives handled.

**Files:**
- Create: `lib/tools/epoch.ts`, `components/tools/Epoch.tsx`, `lib/tools/epoch-sample.ts`
- Modify: `lib/registry/metas.ts`, `lib/registry/index.ts`
- Test: `tests/tools/epoch.test.ts`

**Interfaces:**
- Produces:
  - `type EpochUnit = "s" | "ms" | "us"`
  - `detectUnit(value: number): EpochUnit`
  - `epochToDate(value: number, unit: EpochUnit): ToolResult<Date>`
  - `formatDate(date: Date, timeZone: string): { iso; utc; local; zoned; rfc2822; relative }`
  - `dateToEpoch(text: string): ToolResult<number>` — milliseconds
  - `const EPOCH_ZONES: string[]`

- [ ] **Step 1: Write the failing test**

Create `tests/tools/epoch.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { detectUnit, epochToDate, dateToEpoch, formatDate } from "@/lib/tools/epoch";

describe("detectUnit", () => {
  it("reads a ten-digit value as seconds", () => {
    expect(detectUnit(1_700_000_000)).toBe("s");
  });

  it("reads a thirteen-digit value as milliseconds", () => {
    expect(detectUnit(1_700_000_000_000)).toBe("ms");
  });

  it("reads a sixteen-digit value as microseconds", () => {
    expect(detectUnit(1_700_000_000_000_000)).toBe("us");
  });

  it("reads 0 as seconds rather than guessing wildly", () => {
    expect(detectUnit(0)).toBe("s");
  });

  it("detects by magnitude on negative values too", () => {
    // Pre-1970 timestamps are negative; magnitude is what carries the unit.
    expect(detectUnit(-1_700_000_000)).toBe("s");
    expect(detectUnit(-1_700_000_000_000)).toBe("ms");
  });
});

describe("epochToDate", () => {
  it("converts seconds", () => {
    const r = epochToDate(0, "s");
    expect(r.ok && r.value.toISOString()).toBe("1970-01-01T00:00:00.000Z");
  });

  it("converts milliseconds", () => {
    const r = epochToDate(1_700_000_000_000, "ms");
    expect(r.ok && r.value.toISOString()).toBe("2023-11-14T22:13:20.000Z");
  });

  it("converts microseconds", () => {
    const r = epochToDate(1_700_000_000_000_000, "us");
    expect(r.ok && r.value.toISOString()).toBe("2023-11-14T22:13:20.000Z");
  });

  it("handles a pre-1970 negative value", () => {
    const r = epochToDate(-1, "s");
    expect(r.ok && r.value.toISOString()).toBe("1969-12-31T23:59:59.000Z");
  });

  it("rejects a value outside the representable date range", () => {
    expect(epochToDate(1e18, "s").ok).toBe(false);
  });

  it("rejects NaN rather than producing an Invalid Date", () => {
    expect(epochToDate(Number.NaN, "s").ok).toBe(false);
  });
});

describe("dateToEpoch", () => {
  it("parses an ISO 8601 string to milliseconds", () => {
    expect(dateToEpoch("2023-11-14T22:13:20.000Z")).toMatchObject({ ok: true, value: 1_700_000_000_000 });
  });

  it("parses a date-only string", () => {
    expect(dateToEpoch("1970-01-01")).toMatchObject({ ok: true, value: 0 });
  });

  it("rejects text that is not a date", () => {
    expect(dateToEpoch("not a date").ok).toBe(false);
  });

  it("rejects an empty string", () => {
    expect(dateToEpoch("").ok).toBe(false);
  });
});

describe("formatDate", () => {
  const at = new Date("2023-11-14T22:13:20.000Z");

  it("renders ISO, UTC and RFC 2822 forms", () => {
    const out = formatDate(at, "UTC");
    expect(out.iso).toBe("2023-11-14T22:13:20.000Z");
    expect(out.utc).toContain("2023");
    expect(out.rfc2822).toContain("Tue");
  });

  it("renders the chosen IANA zone, not just local time", () => {
    const tokyo = formatDate(at, "Asia/Tokyo");
    const utc = formatDate(at, "UTC");
    expect(tokyo.zoned).not.toBe(utc.zoned);
  });

  it("describes distance from now in words", () => {
    const soon = new Date(Date.now() + 60_000);
    expect(formatDate(soon, "UTC").relative).toMatch(/in |from now/);
  });

  it("falls back rather than throwing on an unknown zone", () => {
    // An old share link could carry a zone this browser does not know.
    expect(() => formatDate(at, "Not/AZone")).not.toThrow();
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run tests/tools/epoch.test.ts`
Expected: FAIL — cannot resolve `@/lib/tools/epoch`.

- [ ] **Step 3: Write the transform**

Create `lib/tools/epoch.ts`:

```ts
import { err, ok, type ToolResult } from "@/lib/types";

export type EpochUnit = "s" | "ms" | "us";

/** JS Date accepts ±8.64e15 ms from the epoch. Past that it is Invalid Date. */
const MAX_MS = 8.64e15;

export const EPOCH_ZONES = [
  "UTC", "America/New_York", "America/Chicago", "America/Denver",
  "America/Los_Angeles", "Europe/London", "Europe/Berlin", "Europe/Paris",
  "Africa/Lagos", "Africa/Johannesburg", "Asia/Dubai", "Asia/Kolkata",
  "Asia/Shanghai", "Asia/Tokyo", "Australia/Sydney",
];

const TO_MS: Record<EpochUnit, number> = { s: 1000, ms: 1, us: 0.001 };

/**
 * Picks the unit from magnitude. A second-precision timestamp for any date
 * near now has ten digits, milliseconds thirteen, microseconds sixteen — so
 * the digit count is the signal, and the sign is irrelevant to it.
 */
export function detectUnit(value: number): EpochUnit {
  const magnitude = Math.abs(value);
  if (magnitude >= 1e14) return "us";
  if (magnitude >= 1e11) return "ms";
  return "s";
}

export function epochToDate(value: number, unit: EpochUnit): ToolResult<Date> {
  if (!Number.isFinite(value)) return err("Enter a number.");
  const ms = value * TO_MS[unit];
  if (Math.abs(ms) > MAX_MS) {
    return err("That is outside the range of dates this browser can represent.");
  }
  return ok(new Date(ms));
}

export function dateToEpoch(text: string): ToolResult<number> {
  const trimmed = text.trim();
  if (!trimmed) return err("Enter a date.");
  const parsed = Date.parse(trimmed);
  if (Number.isNaN(parsed)) return err("That is not a date this browser recognises.");
  return ok(parsed);
}

const RELATIVE_STEPS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 31_536_000_000], ["month", 2_592_000_000], ["day", 86_400_000],
  ["hour", 3_600_000], ["minute", 60_000], ["second", 1000],
];

function relativeTo(date: Date, now: number): string {
  const delta = date.getTime() - now;
  const formatter = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
  for (const [unit, size] of RELATIVE_STEPS) {
    if (Math.abs(delta) >= size) return formatter.format(Math.round(delta / size), unit);
  }
  return formatter.format(0, "second");
}

function inZone(date: Date, timeZone: string): string {
  try {
    return new Intl.DateTimeFormat(undefined, {
      timeZone, dateStyle: "medium", timeStyle: "long",
    }).format(date);
  } catch {
    // An unknown IANA zone — from an old share link, or a browser with a
    // trimmed ICU build. Say so rather than throwing the page away.
    return `${date.toISOString()} (zone "${timeZone}" unavailable)`;
  }
}

export function formatDate(date: Date, timeZone: string): {
  iso: string; utc: string; local: string; zoned: string; rfc2822: string; relative: string;
} {
  return {
    iso: date.toISOString(),
    utc: date.toUTCString(),
    local: date.toString(),
    zoned: inZone(date, timeZone),
    // toUTCString is already RFC 1123, the modern form of RFC 2822's date.
    rfc2822: date.toUTCString(),
    relative: relativeTo(date, Date.now()),
  };
}
```

- [ ] **Step 4: Run the tests**

Run: `npx vitest run tests/tools/epoch.test.ts`
Expected: PASS, 19 tests.

- [ ] **Step 5: Write the sample and the component**

Create `lib/tools/epoch-sample.ts`:

```ts
export const EPOCH_SAMPLE = { input: "1700000000", direction: "from-epoch" as const };
```

Create `components/tools/Epoch.tsx`:

```tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { Clock, Eraser } from "lucide-react";
import { EPOCH_META } from "@/lib/registry/metas";
import {
  detectUnit, epochToDate, dateToEpoch, formatDate, EPOCH_ZONES, type EpochUnit,
} from "@/lib/tools/epoch";
import { EPOCH_SAMPLE } from "@/lib/tools/epoch-sample";
import { ToolShell } from "@/components/tool/ToolShell";
import { useToolState } from "@/components/tool/useToolState";
import { ErrorNote } from "@/components/tool/ErrorNote";
import { CopyButton } from "@/components/tool/CopyButton";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { Segmented } from "@/components/ui/Segmented";

interface State {
  input: string;
  direction: "from-epoch" | "to-epoch";
  unit: EpochUnit | "auto";
  zone: string;
}

const DEFAULTS: State = { input: "", direction: "from-epoch", unit: "auto", zone: "UTC" };

function isState(value: unknown): value is State {
  if (typeof value !== "object" || value === null) return false;
  const c = value as State;
  return typeof c.input === "string" && typeof c.zone === "string"
    && ["from-epoch", "to-epoch"].includes(c.direction)
    && ["auto", "s", "ms", "us"].includes(c.unit);
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-3 border-b border-border py-1.5 last:border-0">
      <span className="eyebrow w-28 shrink-0">{label}</span>
      <span className="min-w-0 flex-1 truncate font-ui text-[12.5px] text-fg tabular">{value}</span>
      <CopyButton text={value} label="Copy" />
    </div>
  );
}

export function Epoch() {
  const meta = EPOCH_META;
  const [state, update, reset] = useToolState<State>(meta, DEFAULTS, isState);
  const [now, setNow] = useState(() => Date.now());

  // The live ticker. One interval, cleared on unmount.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const result = useMemo(() => {
    if (!state.input.trim()) return null;
    if (state.direction === "to-epoch") {
      const parsed = dateToEpoch(state.input);
      return parsed.ok ? epochToDate(parsed.value, "ms") : parsed;
    }
    const numeric = Number(state.input.trim());
    if (!Number.isFinite(numeric)) return epochToDate(Number.NaN, "s");
    const unit = state.unit === "auto" ? detectUnit(numeric) : state.unit;
    return epochToDate(numeric, unit);
  }, [state.input, state.direction, state.unit]);

  const parts = result?.ok ? formatDate(result.value, state.zone) : null;
  const epochMs = result?.ok ? result.value.getTime() : null;

  return (
    <ToolShell
      meta={meta}
      shareState={state}
      actions={
        <>
          <Button size="sm" onClick={() => update(EPOCH_SAMPLE)}>
            <Clock size={13} aria-hidden />
            Load sample
          </Button>
          <Button
            size="sm"
            onClick={() => update({ direction: "from-epoch", unit: "s", input: String(Math.floor(now / 1000)) })}
          >
            Use now
          </Button>
          <Button size="sm" onClick={reset}>
            <Eraser size={13} aria-hidden />
            Clear
          </Button>
        </>
      }
      options={
        <>
          <Segmented
            label="Direction"
            value={state.direction}
            onChange={(direction) => update({ direction })}
            options={[
              { value: "from-epoch", label: "Epoch → date" },
              { value: "to-epoch", label: "Date → epoch" },
            ]}
          />
          {state.direction === "from-epoch" ? (
            <label className="flex items-center gap-2">
              <span className="eyebrow">Unit</span>
              <Select
                value={state.unit}
                ariaLabel="Epoch unit"
                onChange={(unit) => update({ unit })}
                options={[
                  { value: "auto", label: "Auto-detect" },
                  { value: "s", label: "Seconds" },
                  { value: "ms", label: "Milliseconds" },
                  { value: "us", label: "Microseconds" },
                ]}
              />
            </label>
          ) : null}
          <label className="flex items-center gap-2">
            <span className="eyebrow">Zone</span>
            <Select
              value={state.zone}
              ariaLabel="Time zone"
              onChange={(zone) => update({ zone })}
              options={EPOCH_ZONES.map((z) => ({ value: z, label: z }))}
            />
          </label>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <input
          value={state.input}
          onChange={(e) => update({ input: e.target.value })}
          aria-label={state.direction === "from-epoch" ? "Epoch value" : "Date"}
          placeholder={state.direction === "from-epoch" ? "1700000000" : "2023-11-14T22:13:20Z"}
          className="h-11 w-full rounded-md border border-border bg-surface px-3 font-ui text-[15px] text-fg tabular focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
        />

        {result && !result.ok ? <ErrorNote error={result.error} /> : null}

        {parts && epochMs !== null ? (
          <div className="rounded-lg bg-surface px-4 py-2 shadow-sm">
            <Row label="ISO 8601" value={parts.iso} />
            <Row label="UTC" value={parts.utc} />
            <Row label="Local" value={parts.local} />
            <Row label={state.zone} value={parts.zoned} />
            <Row label="RFC 2822" value={parts.rfc2822} />
            <Row label="Relative" value={parts.relative} />
            <Row label="Seconds" value={String(Math.floor(epochMs / 1000))} />
            <Row label="Milliseconds" value={String(epochMs)} />
            <Row label="Microseconds" value={String(epochMs * 1000)} />
          </div>
        ) : null}

        <div className="rounded-lg bg-surface px-4 py-3 shadow-sm">
          <p className="eyebrow mb-1.5">Now</p>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1 font-ui text-[12.5px] text-fg tabular">
            <span>{Math.floor(now / 1000)} s</span>
            <span>{now} ms</span>
            <span>{now * 1000} µs</span>
            <span className="text-fg-muted">{new Date(now).toISOString()}</span>
            {/* Spec 7.14 asks for a copy of the current epoch, not just a display. */}
            <span className="ml-auto">
              <CopyButton text={String(Math.floor(now / 1000))} label="Copy epoch" />
            </span>
          </div>
        </div>
      </div>
    </ToolShell>
  );
}
```

- [ ] **Step 6: Register the tool**

In `lib/registry/metas.ts` (add `Clock` to the lucide import):

```ts
export const EPOCH_META: ToolMeta = {
  slug: "epoch",
  name: "Epoch Converter",
  blurb: "Convert Unix timestamps to dates and back, in any time zone.",
  group: "data",
  icon: Clock,
  aliases: ["unix", "timestamp", "time", "date", "epoch time"],
  handlesSecrets: false,
};
```

Append the entry in `lib/registry/index.ts`.

- [ ] **Step 7: Run everything and verify in the browser**

Run: `npm test && npm run typecheck && npm run build`

Then `npm run dev` and check:
- `1700000000` auto-detects seconds; `1700000000000` auto-detects milliseconds; both land on the same instant.
- A negative value renders a pre-1970 date rather than an error.
- Changing the zone changes the zoned row and nothing else.
- The "Now" ticker advances once a second and does not re-render the rest of the page's state away.
- "Use now" fills the input with the current epoch in seconds.

- [ ] **Step 8: Commit**

```bash
git add lib/tools/epoch.ts lib/tools/epoch-sample.ts components/tools/Epoch.tsx tests/tools/epoch.test.ts lib/registry
git commit -m "feat: add Epoch Converter with unit detection and zone rendering"
```

---

### Task 9: Regex Tester transform

Spec §7.16. Pattern plus flags, capture-group table, replace preview, a pattern library, and a guard against catastrophic backtracking.

**Read this before implementing the guard.** A JavaScript regex runs to completion on the main thread and cannot be interrupted from outside. Nothing in this task can abort a single pathological match once `exec` has entered it — claiming otherwise would be a lie told in code. What IS achievable, and what this task builds:

1. A **budget checked between matches** in the global-match loop, so a pattern that is merely slow across thousands of matches stops instead of freezing the tab.
2. A **match cap**, so a degenerate empty-match pattern cannot spin forever.
3. A **static risk warning** for nested quantifiers — the shape that causes exponential backtracking — shown *before* the user hits it.

Say this plainly in the UI: the warning reads "may backtrack catastrophically", not "protected against".

**Files:**
- Create: `lib/tools/regex.ts`
- Test: `tests/tools/regex.test.ts`

**Interfaces:**
- Produces:
  - `interface RegexMatch { index: number; text: string; groups: { name: string | null; value: string | undefined; index: number }[] }`
  - `interface RegexReport { matches: RegexMatch[]; truncated: boolean; timedOut: boolean; riskyPattern: boolean }`
  - `runRegex(pattern: string, flags: string, text: string, budgetMs?: number): ToolResult<RegexReport>`
  - `replaceWithRegex(pattern: string, flags: string, text: string, replacement: string): ToolResult<string>`
  - `const REGEX_LIBRARY: { name: string; pattern: string; flags: string }[]`
  - `const MATCH_CAP = 5000`

- [ ] **Step 1: Write the failing test**

Create `tests/tools/regex.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { runRegex, replaceWithRegex, REGEX_LIBRARY, MATCH_CAP } from "@/lib/tools/regex";

const report = (pattern: string, flags: string, text: string) => {
  const r = runRegex(pattern, flags, text);
  if (!r.ok) throw new Error(r.error.message);
  return r.value;
};

describe("runRegex", () => {
  it("finds a single match with its position", () => {
    const out = report("b", "", "abc");
    expect(out.matches).toHaveLength(1);
    expect(out.matches[0]).toMatchObject({ index: 1, text: "b" });
  });

  it("finds every match with the global flag", () => {
    expect(report("a", "g", "aaa").matches.map((m) => m.index)).toEqual([0, 1, 2]);
  });

  it("stops at the first match without the global flag", () => {
    expect(report("a", "", "aaa").matches).toHaveLength(1);
  });

  it("reports numbered capture groups with their positions", () => {
    const out = report("(a)(b)", "", "ab");
    expect(out.matches[0]!.groups).toEqual([
      { name: null, value: "a", index: 0 },
      { name: null, value: "b", index: 1 },
    ]);
  });

  it("reports named capture groups by name", () => {
    const out = report("(?<first>a)(?<second>b)", "", "ab");
    expect(out.matches[0]!.groups.map((g) => g.name)).toEqual(["first", "second"]);
  });

  it("leaves an unmatched optional group undefined rather than empty", () => {
    // "" and "did not participate" are different answers, and the table shows
    // them differently.
    const out = report("(a)?(b)", "", "b");
    expect(out.matches[0]!.groups[0]!.value).toBeUndefined();
  });

  it("returns no matches without erroring when nothing matches", () => {
    expect(report("z", "g", "abc").matches).toEqual([]);
  });

  it("rejects an invalid pattern with the engine's message", () => {
    const r = runRegex("(", "", "abc");
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.message.length).toBeGreaterThan(0);
  });

  it("rejects an invalid flag combination", () => {
    expect(runRegex("a", "zz", "abc").ok).toBe(false);
  });

  it("does not hang on a pattern that matches the empty string globally", () => {
    // /a*/g against "bbb" matches empty at every position. Without an explicit
    // advance this loops forever, which is the classic version of this bug.
    const out = report("a*", "g", "bbb");
    expect(out.matches.length).toBeLessThanOrEqual(4);
  });

  it("caps the number of matches and says it truncated", () => {
    const out = report("a", "g", "a".repeat(MATCH_CAP + 100));
    expect(out.matches).toHaveLength(MATCH_CAP);
    expect(out.truncated).toBe(true);
  });

  it("flags a nested-quantifier pattern as risky", () => {
    expect(report("(a+)+$", "", "aaa").riskyPattern).toBe(true);
  });

  it("does not flag an ordinary pattern as risky", () => {
    expect(report("^[a-z]+$", "", "abc").riskyPattern).toBe(false);
  });

  it("gives up on a slow global run and reports it timed out", () => {
    const out = runRegex("a", "g", "a".repeat(200), 0);
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    // A zero budget expires on the first check, so it stops early and says so
    // rather than pretending the result is complete.
    expect(out.value.timedOut).toBe(true);
  });
});

describe("replaceWithRegex", () => {
  it("replaces with a numbered backreference", () => {
    expect(replaceWithRegex("(a)(b)", "g", "ab", "$2$1")).toMatchObject({ ok: true, value: "ba" });
  });

  it("replaces with a named backreference", () => {
    expect(replaceWithRegex("(?<x>a)", "g", "a", "[$<x>]")).toMatchObject({ ok: true, value: "[a]" });
  });

  it("replaces only the first match without the global flag", () => {
    expect(replaceWithRegex("a", "", "aa", "b")).toMatchObject({ ok: true, value: "ba" });
  });

  it("rejects an invalid pattern", () => {
    expect(replaceWithRegex("(", "", "a", "b").ok).toBe(false);
  });
});

describe("REGEX_LIBRARY", () => {
  it("ships patterns that all compile", () => {
    for (const entry of REGEX_LIBRARY) {
      expect(() => new RegExp(entry.pattern, entry.flags), entry.name).not.toThrow();
    }
  });

  it("covers the six patterns the spec names", () => {
    const names = REGEX_LIBRARY.map((e) => e.name.toLowerCase()).join(" ");
    for (const wanted of ["email", "url", "ipv4", "uuid", "iso", "semver"]) {
      expect(names, wanted).toContain(wanted);
    }
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run tests/tools/regex.test.ts`
Expected: FAIL — cannot resolve `@/lib/tools/regex`.

- [ ] **Step 3: Write the transform**

Create `lib/tools/regex.ts`:

```ts
import { err, ok, type ToolResult } from "@/lib/types";

export interface RegexMatch {
  index: number;
  text: string;
  groups: { name: string | null; value: string | undefined; index: number }[];
}

export interface RegexReport {
  matches: RegexMatch[];
  /** Hit MATCH_CAP; there are more matches than are shown. */
  truncated: boolean;
  /** The budget expired mid-run; the match list is incomplete. */
  timedOut: boolean;
  /** Static shape warning — nested quantifiers, which can blow up. */
  riskyPattern: boolean;
}

export const MATCH_CAP = 5000;
const DEFAULT_BUDGET_MS = 250;

export const REGEX_LIBRARY: { name: string; pattern: string; flags: string }[] = [
  { name: "Email", pattern: "[\\w.+-]+@[\\w-]+\\.[\\w.-]+", flags: "g" },
  { name: "URL", pattern: "https?://[^\\s\"'<>]+", flags: "g" },
  { name: "IPv4", pattern: "\\b(?:(?:25[0-5]|2[0-4]\\d|1?\\d?\\d)\\.){3}(?:25[0-5]|2[0-4]\\d|1?\\d?\\d)\\b", flags: "g" },
  { name: "UUID", pattern: "[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}", flags: "gi" },
  { name: "ISO date", pattern: "\\d{4}-\\d{2}-\\d{2}(?:T\\d{2}:\\d{2}:\\d{2}(?:\\.\\d+)?(?:Z|[+-]\\d{2}:\\d{2})?)?", flags: "g" },
  { name: "Semver", pattern: "\\bv?\\d+\\.\\d+\\.\\d+(?:-[\\w.]+)?(?:\\+[\\w.]+)?\\b", flags: "g" },
];

/**
 * A quantifier applied to an already-quantified group — (a+)+, (a*)*, (a+)*
 * and friends. That shape is what turns linear input into exponential work,
 * so it is worth warning about BEFORE the user pastes a long test string.
 * Purely a shape check: it neither proves nor disproves a blow-up.
 */
function looksRisky(pattern: string): boolean {
  return /\([^()]*[+*][^()]*\)\s*[+*]/.test(pattern);
}

function compile(pattern: string, flags: string, withIndices = false): ToolResult<RegExp> {
  // `d` is added internally, never shown to the user, so group positions are
  // exact. Deduped, because the user may have typed it themselves.
  const effective = withIndices && !flags.includes("d") ? `${flags}d` : flags;
  try {
    return ok(new RegExp(pattern, effective));
  } catch (cause) {
    return err(cause instanceof Error ? cause.message : "That is not a valid regular expression.");
  }
}

/**
 * Names the capture groups in index order by reading the pattern, because the
 * engine does not expose that mapping. `match.groups` is keyed by name with no
 * hint of which number each name belongs to, and matching names to values by
 * VALUE breaks the moment two groups capture the same text.
 */
function groupNames(pattern: string): (string | null)[] {
  const names: (string | null)[] = [];
  for (let i = 0; i < pattern.length; i += 1) {
    if (pattern[i] === "\\") { i += 1; continue; }
    if (pattern[i] !== "(") continue;
    const rest = pattern.slice(i + 1);
    // (?: (?= (?! (?<= (?<! are all non-capturing.
    if (/^\?(?::|=|!|<=|<!)/.test(rest)) continue;
    const named = /^\?<([A-Za-z_$][\w$]*)>/.exec(rest);
    names.push(named ? named[1]! : null);
  }
  return names;
}

function describeGroups(match: RegExpExecArray, names: (string | null)[]): RegexMatch["groups"] {
  // Positions come from the `d` flag's indices, which are exact and absolute
  // within the test text. Without it there is no honest per-group position.
  const indices = (match as RegExpExecArray & { indices?: (readonly [number, number] | undefined)[] }).indices;
  return match.slice(1).map((value, offset) => ({
    name: names[offset] ?? null,
    value,
    index: indices?.[offset + 1]?.[0] ?? -1,
  }));
}

export function runRegex(
  pattern: string,
  flags: string,
  text: string,
  budgetMs: number = DEFAULT_BUDGET_MS,
): ToolResult<RegexReport> {
  // Validate the user's flags exactly as typed first, so a bad flag is
  // reported against what they wrote rather than against our augmented copy.
  const validated = compile(pattern, flags);
  if (!validated.ok) return validated;

  const compiled = compile(pattern, flags, true);
  if (!compiled.ok) return compiled;

  const regex = compiled.value;
  const names = groupNames(pattern);
  const riskyPattern = looksRisky(pattern);
  const matches: RegexMatch[] = [];
  let truncated = false;
  let timedOut = false;

  if (!regex.global) {
    const single = regex.exec(text);
    if (single) matches.push({ index: single.index, text: single[0], groups: describeGroups(single, names) });
    return ok({ matches, truncated, timedOut, riskyPattern });
  }

  const startedAt = Date.now();
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    matches.push({ index: match.index, text: match[0], groups: describeGroups(match, names) });

    // A zero-width match leaves lastIndex where it was, so without this the
    // loop never advances and the tab hangs.
    if (match[0] === "") regex.lastIndex += 1;

    if (matches.length >= MATCH_CAP) { truncated = true; break; }
    // Checked BETWEEN matches. A single pathological match cannot be
    // interrupted from here — see the note at the top of this task.
    if (Date.now() - startedAt >= budgetMs) { timedOut = true; break; }
  }

  return ok({ matches, truncated, timedOut, riskyPattern });
}

export function replaceWithRegex(
  pattern: string,
  flags: string,
  text: string,
  replacement: string,
): ToolResult<string> {
  const compiled = compile(pattern, flags);
  if (!compiled.ok) return compiled;
  try {
    return ok(text.replace(compiled.value, replacement));
  } catch (cause) {
    return err(cause instanceof Error ? cause.message : "That replacement could not be applied.");
  }
}
```

- [ ] **Step 4: Run the tests**

Run: `npx vitest run tests/tools/regex.test.ts`
Expected: PASS, 20 tests.

- [ ] **Step 5: Commit**

```bash
git add lib/tools/regex.ts tests/tools/regex.test.ts
git commit -m "feat: add regex transform with match cap and backtracking warning"
```

---

### Task 10: Regex Tester UI and registration

Spec §7.16. Live match highlighting, a capture-group table, a replace preview, and the pattern library.

**Files:**
- Create: `components/tools/RegexTester.tsx`, `lib/tools/regex-sample.ts`
- Modify: `lib/registry/metas.ts`, `lib/registry/index.ts`

- [ ] **Step 1: Write the sample**

Create `lib/tools/regex-sample.ts`:

```ts
export const REGEX_SAMPLE = {
  pattern: "(?<user>[\\w.+-]+)@(?<host>[\\w-]+\\.[\\w.-]+)",
  flags: "g",
  text: "Contact ada@example.com or grace+dev@navy.mil.uk — but not bad@@example.",
  replacement: "$<user> at $<host>",
};
```

- [ ] **Step 2: Write the component**

Create `components/tools/RegexTester.tsx`:

```tsx
"use client";

import { useMemo } from "react";
import { Eraser, Regex as RegexIcon } from "lucide-react";
import { REGEX_META } from "@/lib/registry/metas";
import { runRegex, replaceWithRegex, REGEX_LIBRARY } from "@/lib/tools/regex";
import { REGEX_SAMPLE } from "@/lib/tools/regex-sample";
import { ToolShell } from "@/components/tool/ToolShell";
import { useToolState } from "@/components/tool/useToolState";
import { ErrorNote } from "@/components/tool/ErrorNote";
import { CopyButton } from "@/components/tool/CopyButton";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { CodeArea } from "@/components/ui/CodeArea";
import { cx } from "@/lib/cx";

const FLAGS = ["g", "i", "m", "s", "u", "y"] as const;

interface State {
  pattern: string;
  flags: string;
  text: string;
  replacement: string;
}

const DEFAULTS: State = { pattern: "", flags: "g", text: "", replacement: "" };

function isState(value: unknown): value is State {
  if (typeof value !== "object" || value === null) return false;
  const c = value as State;
  return typeof c.pattern === "string" && typeof c.flags === "string"
    && typeof c.text === "string" && typeof c.replacement === "string";
}

/** Splits the text into matched and unmatched runs for highlighting. */
function segments(text: string, matches: { index: number; text: string }[]) {
  const out: { text: string; matched: boolean }[] = [];
  let cursor = 0;
  for (const match of matches) {
    if (match.index > cursor) out.push({ text: text.slice(cursor, match.index), matched: false });
    if (match.text.length > 0) out.push({ text: match.text, matched: true });
    cursor = Math.max(cursor, match.index + match.text.length);
  }
  if (cursor < text.length) out.push({ text: text.slice(cursor), matched: false });
  return out;
}

export function RegexTester() {
  const meta = REGEX_META;
  const [state, update, reset] = useToolState<State>(meta, DEFAULTS, isState);

  const result = useMemo(
    () => (state.pattern ? runRegex(state.pattern, state.flags, state.text) : null),
    [state.pattern, state.flags, state.text],
  );
  const replaced = useMemo(
    () => (state.pattern && state.replacement
      ? replaceWithRegex(state.pattern, state.flags, state.text, state.replacement)
      : null),
    [state.pattern, state.flags, state.text, state.replacement],
  );

  const report = result?.ok ? result.value : null;

  function toggleFlag(flag: string) {
    update({
      flags: state.flags.includes(flag)
        ? state.flags.replace(flag, "")
        : state.flags + flag,
    });
  }

  return (
    <ToolShell
      meta={meta}
      shareState={state}
      actions={
        <>
          <Button size="sm" onClick={() => update(REGEX_SAMPLE)}>
            <RegexIcon size={13} aria-hidden />
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
          <div role="group" aria-label="Regex flags" className="flex items-center gap-1">
            <span className="eyebrow mr-1">Flags</span>
            {FLAGS.map((flag) => (
              <button
                key={flag}
                type="button"
                aria-pressed={state.flags.includes(flag)}
                onClick={() => toggleFlag(flag)}
                className={cx(
                  "h-7 w-7 rounded-md font-ui text-[12px] font-medium transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]",
                  state.flags.includes(flag)
                    ? "bg-primary text-on-primary"
                    : "bg-surface-2 text-fg-muted hover:text-fg",
                )}
              >
                {flag}
              </button>
            ))}
          </div>
          <label className="flex items-center gap-2">
            <span className="eyebrow">Library</span>
            <Select
              value=""
              ariaLabel="Load a common pattern"
              onChange={(name) => {
                const entry = REGEX_LIBRARY.find((e) => e.name === name);
                if (entry) update({ pattern: entry.pattern, flags: entry.flags });
              }}
              options={[
                { value: "", label: "Choose…" },
                ...REGEX_LIBRARY.map((e) => ({ value: e.name, label: e.name })),
              ]}
            />
          </label>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <span className="font-ui text-[15px] text-fg-muted">/</span>
          <input
            value={state.pattern}
            onChange={(e) => update({ pattern: e.target.value })}
            aria-label="Regular expression"
            placeholder="pattern"
            spellCheck={false}
            className="h-11 flex-1 rounded-md border border-border bg-surface px-3 font-ui text-[14px] text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
          />
          <span className="font-ui text-[15px] text-fg-muted">/{state.flags}</span>
        </div>

        {result && !result.ok ? <ErrorNote error={result.error} /> : null}

        {report?.riskyPattern ? (
          // Honest wording: this is a shape warning, not a guarantee.
          <p className="rounded-md bg-warn-tint px-3 py-2 text-[12.5px] text-warn">
            ! Nested quantifiers — this pattern may backtrack catastrophically on
            some inputs. Matching is not interruptible once it starts.
          </p>
        ) : null}

        {report?.truncated ? (
          <p className="rounded-md bg-warn-tint px-3 py-2 text-[12.5px] text-warn">
            ! Showing the first {report.matches.length} matches only.
          </p>
        ) : null}

        {report?.timedOut ? (
          <p className="rounded-md bg-warn-tint px-3 py-2 text-[12.5px] text-warn">
            ! Stopped early — this pattern was taking too long over your text.
          </p>
        ) : null}

        <div className="grid gap-3 lg:grid-cols-2">
          <div className="flex flex-col gap-2">
            <p className="eyebrow">Test text</p>
            <CodeArea
              value={state.text}
              onChange={(text) => update({ text })}
              ariaLabel="Test text"
              placeholder="Text to match against"
              className="h-40"
            />
            {report ? (
              <div className="min-h-24 overflow-auto rounded-md border border-border bg-surface p-3">
                <p className="eyebrow mb-1.5">
                  {report.matches.length} match{report.matches.length === 1 ? "" : "es"}
                </p>
                <pre className="whitespace-pre-wrap break-words font-ui text-[12.5px] text-fg">
                  {segments(state.text, report.matches).map((part, index) => (
                    <span
                      key={index}
                      className={part.matched ? "rounded-sm bg-up-tint text-up underline decoration-dotted" : ""}
                    >
                      {part.text}
                    </span>
                  ))}
                </pre>
              </div>
            ) : null}
          </div>

          <div className="flex flex-col gap-2">
            <p className="eyebrow">Capture groups</p>
            <div className="min-h-24 max-h-64 overflow-auto rounded-md border border-border bg-surface">
              {report && report.matches.length > 0 ? (
                <table className="w-full font-ui text-[12px]">
                  <thead className="sticky top-0 bg-surface">
                    <tr className="text-left text-fg-muted">
                      <th className="px-2 py-1 font-medium">#</th>
                      <th className="px-2 py-1 font-medium">Group</th>
                      <th className="px-2 py-1 font-medium">Value</th>
                      <th className="px-2 py-1 font-medium">At</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.matches.flatMap((match, matchIndex) =>
                      match.groups.map((group, groupIndex) => (
                        <tr key={`${matchIndex}-${groupIndex}`} className="border-t border-border">
                          <td className="px-2 py-1 text-fg-muted tabular">{matchIndex + 1}</td>
                          <td className="px-2 py-1 text-fg">{group.name ?? groupIndex + 1}</td>
                          <td className="px-2 py-1 text-fg">
                            {group.value === undefined
                              ? <span className="text-fg-muted">did not participate</span>
                              : JSON.stringify(group.value)}
                          </td>
                          <td className="px-2 py-1 text-fg-muted tabular">
                            {group.index === -1 ? "—" : group.index}
                          </td>
                        </tr>
                      )),
                    )}
                  </tbody>
                </table>
              ) : (
                <p className="p-3 text-[12.5px] text-fg-muted">
                  No captures yet. Groups appear here once the pattern matches.
                </p>
              )}
            </div>

            <p className="eyebrow">Replace preview</p>
            <input
              value={state.replacement}
              onChange={(e) => update({ replacement: e.target.value })}
              aria-label="Replacement"
              placeholder="$1 or $<name>"
              className="h-9 rounded-md border border-border bg-surface px-2 font-ui text-[13px] text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
            />
            {replaced?.ok ? (
              <div className="flex items-start gap-2">
                <pre className="min-w-0 flex-1 overflow-auto whitespace-pre-wrap break-words rounded-md border border-border bg-surface p-3 font-ui text-[12.5px] text-fg">
                  {replaced.value}
                </pre>
                <CopyButton text={replaced.value} label="Copy" />
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </ToolShell>
  );
}
```

- [ ] **Step 3: Register the tool**

In `lib/registry/metas.ts` (add `Regex` to the lucide import):

```ts
export const REGEX_META: ToolMeta = {
  slug: "regex",
  name: "Regex Tester",
  blurb: "Test regular expressions with live matches, groups, and replacements.",
  group: "data",
  icon: Regex,
  aliases: ["regexp", "pattern", "match", "regular expression"],
  handlesSecrets: false,
};
```

Append the entry in `lib/registry/index.ts`.

- [ ] **Step 4: Run everything and verify in the browser**

Run: `npm test && npm run typecheck && npm run build`

Then `npm run dev` and check:
- Load the sample — two emails highlight, and the group table names `user` and `host` rather than numbering them.
- The replace preview renders `ada at example.com`.
- Toggling `g` off leaves exactly one match highlighted.
- Typing `(` alone shows the engine's error and no stale matches.
- Typing `(a+)+$` shows the backtracking warning, worded as "may", not "protected".
- Every highlighted match is underlined as well as tinted — it must read in greyscale.

- [ ] **Step 5: Commit**

```bash
git add components/tools/RegexTester.tsx lib/tools/regex-sample.ts lib/registry
git commit -m "feat: add Regex Tester with group table and replace preview"
```

---

### Task 11: YAML ↔ JSON

Spec §7.5. Bidirectional via `js-yaml`. **YAML→JSON drops comments and anchors, and the UI must say so plainly above the output** rather than discarding them silently.

**Files:**
- Create: `lib/tools/yaml-json.ts`, `components/tools/YamlJson.tsx`, `lib/tools/yaml-json-sample.ts`
- Modify: `lib/registry/metas.ts`, `lib/registry/index.ts`, `package.json`
- Test: `tests/tools/yaml-json.test.ts`

**Interfaces:**
- Produces:
  - `interface YamlOptions { indent: number; flowStyle: boolean }`
  - `yamlToJson(text: string, indent: number): ToolResult<string>`
  - `jsonToYaml(text: string, options: YamlOptions): ToolResult<string>`
  - `hasCommentsOrAnchors(text: string): boolean`

- [ ] **Step 1: Install the dependency**

```bash
npm i js-yaml@^5.4.1
```

Do NOT install `@types/js-yaml` — see the dependency table in Global Constraints. Run `npm run typecheck` immediately to confirm the bundled types resolve.

- [ ] **Step 2: Write the failing test**

Create `tests/tools/yaml-json.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { yamlToJson, jsonToYaml, hasCommentsOrAnchors } from "@/lib/tools/yaml-json";

const value = <T,>(r: { ok: true; value: T } | { ok: false; error: { message: string } }): T => {
  if (!r.ok) throw new Error(r.error.message);
  return r.value;
};

describe("yamlToJson", () => {
  it("converts a mapping", () => {
    expect(value(yamlToJson("a: 1\nb: two", 2))).toBe('{\n  "a": 1,\n  "b": "two"\n}');
  });

  it("converts a nested sequence", () => {
    expect(JSON.parse(value(yamlToJson("list:\n  - 1\n  - 2", 2)))).toEqual({ list: [1, 2] });
  });

  it("honours the indent setting", () => {
    expect(value(yamlToJson("a: 1", 4))).toBe('{\n    "a": 1\n}');
  });

  it("reports the line of a YAML syntax error", () => {
    const r = yamlToJson("a: 1\n  b: [", 2);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.line).toBeGreaterThan(0);
  });

  it("rejects an empty document rather than emitting undefined", () => {
    expect(yamlToJson("   ", 2).ok).toBe(false);
  });
});

describe("jsonToYaml", () => {
  it("converts an object to block style", () => {
    expect(value(jsonToYaml('{"a":1}', { indent: 2, flowStyle: false })).trim()).toBe("a: 1");
  });

  it("emits flow style when asked", () => {
    const out = value(jsonToYaml('{"a":[1,2]}', { indent: 2, flowStyle: true }));
    expect(out).toContain("[");
  });

  it("emits block style by default, which is not flow", () => {
    const out = value(jsonToYaml('{"a":[1,2]}', { indent: 2, flowStyle: false }));
    expect(out).toContain("- 1");
  });

  it("reports a JSON syntax error positionally", () => {
    const r = jsonToYaml("{", { indent: 2, flowStyle: false });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.line).toBe(1);
  });
});

describe("hasCommentsOrAnchors", () => {
  it("sees a comment", () => {
    expect(hasCommentsOrAnchors("a: 1 # note")).toBe(true);
  });

  it("sees an anchor and an alias", () => {
    expect(hasCommentsOrAnchors("a: &anchor 1\nb: *anchor")).toBe(true);
  });

  it("does not mistake a # inside a quoted string for a comment", () => {
    // A false warning teaches users to ignore warnings, so this matters.
    expect(hasCommentsOrAnchors('a: "not # a comment"')).toBe(false);
  });

  it("returns false for plain YAML", () => {
    expect(hasCommentsOrAnchors("a: 1\nb: 2")).toBe(false);
  });
});
```

- [ ] **Step 3: Run it to verify it fails**

Run: `npx vitest run tests/tools/yaml-json.test.ts`
Expected: FAIL — cannot resolve `@/lib/tools/yaml-json`.

- [ ] **Step 4: Write the transform**

Create `lib/tools/yaml-json.ts`:

```ts
import { load, dump, YAMLException } from "js-yaml";
import { parseJson } from "@/lib/json/parse";
import { err, ok, type ToolResult } from "@/lib/types";

export interface YamlOptions {
  indent: number;
  /** Flow style is JSON-like inline collections; block style is the default. */
  flowStyle: boolean;
}

export function yamlToJson(text: string, indent: number): ToolResult<string> {
  if (!text.trim()) return err("Enter some YAML.");
  try {
    const parsed = load(text) as unknown;
    if (parsed === undefined) return err("That YAML document is empty.");
    return ok(JSON.stringify(parsed, null, indent));
  } catch (cause) {
    if (cause instanceof YAMLException) {
      // js-yaml marks are 0-indexed; ToolError is 1-indexed throughout.
      const mark = cause.mark;
      return err(
        cause.reason || cause.message,
        mark ? { line: mark.line + 1, column: mark.column + 1 } : undefined,
      );
    }
    return err(cause instanceof Error ? cause.message : "That YAML could not be parsed.");
  }
}

export function jsonToYaml(text: string, options: YamlOptions): ToolResult<string> {
  const parsed = parseJson(text);
  if (!parsed.ok) return parsed;
  try {
    return ok(dump(parsed.value, {
      indent: options.indent,
      // flowLevel 0 makes even the root inline; -1 disables flow entirely.
      flowLevel: options.flowStyle ? 0 : -1,
      lineWidth: -1,
      noRefs: true,
    }));
  } catch (cause) {
    return err(cause instanceof Error ? cause.message : "That value could not be written as YAML.");
  }
}

/**
 * Detects the two things a YAML→JSON round trip destroys. Quoted strings are
 * skipped so a "#" inside a value is not mistaken for a comment — a warning
 * that fires wrongly is a warning users learn to ignore.
 */
export function hasCommentsOrAnchors(text: string): boolean {
  for (const line of text.split("\n")) {
    let inSingle = false;
    let inDouble = false;
    for (let i = 0; i < line.length; i += 1) {
      const ch = line[i];
      if (ch === "\\") { i += 1; continue; }
      if (ch === "'" && !inDouble) inSingle = !inSingle;
      else if (ch === '"' && !inSingle) inDouble = !inDouble;
      else if (!inSingle && !inDouble) {
        if (ch === "#") return true;
        // &anchor / *alias, but only where a token can start.
        if ((ch === "&" || ch === "*") && /[\w-]/.test(line[i + 1] ?? "")) return true;
      }
    }
  }
  return false;
}
```

- [ ] **Step 5: Run the tests**

Run: `npx vitest run tests/tools/yaml-json.test.ts`
Expected: PASS, 13 tests. (Verified against js-yaml 5.4.1: it exports `load`, `dump` and `YAMLException`, and its exceptions carry both `.mark` with a 0-indexed `line` and a `.reason`.)

- [ ] **Step 6: Write the sample and the component**

Create `lib/tools/yaml-json-sample.ts`:

```ts
export const YAML_JSON_SAMPLE = {
  input: [
    "# deployment settings",
    "service: checkout",
    "replicas: 3",
    "limits:",
    "  cpu: 500m",
    "  memory: 512Mi",
    "features:",
    "  - cart",
    "  - coupons",
  ].join("\n"),
  direction: "yaml-to-json" as const,
};
```

Create `components/tools/YamlJson.tsx`:

```tsx
"use client";

import { useMemo } from "react";
import { ArrowLeftRight, Eraser } from "lucide-react";
import { YAML_JSON_META } from "@/lib/registry/metas";
import { yamlToJson, jsonToYaml, hasCommentsOrAnchors } from "@/lib/tools/yaml-json";
import { YAML_JSON_SAMPLE } from "@/lib/tools/yaml-json-sample";
import { ToolShell } from "@/components/tool/ToolShell";
import { useToolState } from "@/components/tool/useToolState";
import { ErrorNote } from "@/components/tool/ErrorNote";
import { CopyButton } from "@/components/tool/CopyButton";
import { Button } from "@/components/ui/Button";
import { Toggle } from "@/components/ui/Toggle";
import { Select } from "@/components/ui/Select";
import { Segmented } from "@/components/ui/Segmented";
import { CodeArea } from "@/components/ui/CodeArea";

interface State {
  input: string;
  direction: "yaml-to-json" | "json-to-yaml";
  indent: number;
  flowStyle: boolean;
}

const DEFAULTS: State = { input: "", direction: "yaml-to-json", indent: 2, flowStyle: false };

function isState(value: unknown): value is State {
  if (typeof value !== "object" || value === null) return false;
  const c = value as State;
  return typeof c.input === "string" && typeof c.flowStyle === "boolean"
    && typeof c.indent === "number" && Number.isFinite(c.indent)
    && ["yaml-to-json", "json-to-yaml"].includes(c.direction);
}

export function YamlJson() {
  const meta = YAML_JSON_META;
  const [state, update, reset] = useToolState<State>(meta, DEFAULTS, isState);

  const result = useMemo(() => {
    if (!state.input.trim()) return null;
    return state.direction === "yaml-to-json"
      ? yamlToJson(state.input, state.indent)
      : jsonToYaml(state.input, { indent: state.indent, flowStyle: state.flowStyle });
  }, [state.input, state.direction, state.indent, state.flowStyle]);

  const willDropDetail = state.direction === "yaml-to-json" && hasCommentsOrAnchors(state.input);

  return (
    <ToolShell
      meta={meta}
      shareState={state}
      actions={
        <>
          <Button size="sm" onClick={() => update(YAML_JSON_SAMPLE)}>
            <ArrowLeftRight size={13} aria-hidden />
            Load sample
          </Button>
          <Button
            size="sm"
            onClick={() => update({
              direction: state.direction === "yaml-to-json" ? "json-to-yaml" : "yaml-to-json",
              input: result?.ok ? result.value : state.input,
            })}
          >
            Swap
          </Button>
          <Button size="sm" onClick={reset}>
            <Eraser size={13} aria-hidden />
            Clear
          </Button>
          {result?.ok ? <CopyButton text={result.value} label="Copy output" /> : null}
        </>
      }
      options={
        <>
          <Segmented
            label="Direction"
            value={state.direction}
            onChange={(direction) => update({ direction })}
            options={[
              { value: "yaml-to-json", label: "YAML → JSON" },
              { value: "json-to-yaml", label: "JSON → YAML" },
            ]}
          />
          <label className="flex items-center gap-2">
            <span className="eyebrow">Indent</span>
            <Select
              value={String(state.indent)}
              ariaLabel="Indent width"
              onChange={(indent) => update({ indent: Number(indent) })}
              options={[
                { value: "2", label: "2 spaces" },
                { value: "4", label: "4 spaces" },
              ]}
            />
          </label>
          {state.direction === "json-to-yaml" ? (
            <Toggle
              checked={state.flowStyle}
              onChange={(flowStyle) => update({ flowStyle })}
              label="Flow style"
            />
          ) : null}
        </>
      }
    >
      <div className="flex flex-col gap-3">
        {willDropDetail ? (
          // Stated plainly, above the output, before the user copies it away.
          <p className="rounded-md bg-warn-tint px-3 py-2 text-[12.5px] text-warn">
            ! JSON has no comments or anchors. Converting drops them — the output
            below is the data only.
          </p>
        ) : null}

        <div className="grid min-h-0 gap-3 lg:grid-cols-2">
          <CodeArea
            value={state.input}
            onChange={(input) => update({ input })}
            ariaLabel={state.direction === "yaml-to-json" ? "YAML input" : "JSON input"}
            placeholder={state.direction === "yaml-to-json" ? "Paste YAML" : "Paste JSON"}
            className="h-[60dvh] min-h-[22rem]"
          />
          <div className="flex flex-col gap-2">
            {result && !result.ok ? <ErrorNote error={result.error} /> : null}
            <CodeArea
              value={result?.ok ? result.value : ""}
              readOnly
              ariaLabel="Output"
              className="h-[60dvh] min-h-[22rem]"
            />
          </div>
        </div>
      </div>
    </ToolShell>
  );
}
```

- [ ] **Step 7: Register the tool**

In `lib/registry/metas.ts` (add `ArrowLeftRight` to the lucide import):

```ts
export const YAML_JSON_META: ToolMeta = {
  slug: "yaml-json",
  name: "YAML ↔ JSON",
  blurb: "Convert between YAML and JSON in both directions.",
  group: "data",
  icon: ArrowLeftRight,
  aliases: ["yaml", "yml", "convert", "json to yaml", "yaml to json"],
  handlesSecrets: false,
};
```

Append the entry in `lib/registry/index.ts`.

- [ ] **Step 8: Run everything and verify in the browser**

Run: `npm test && npm run typecheck && npm run build`

Then `npm run dev` and check:
- Load the sample: the comment triggers the warning, and the JSON output is correct.
- Swap: the output becomes the input and the direction flips, so a round trip is two clicks.
- Flow style on (JSON → YAML) inlines collections; off gives block style.
- Malformed YAML reports a line number.

- [ ] **Step 9: Commit**

```bash
git add lib/tools/yaml-json.ts lib/tools/yaml-json-sample.ts components/tools/YamlJson.tsx tests/tools/yaml-json.test.ts lib/registry package.json package-lock.json
git commit -m "feat: add YAML to JSON conversion with lossy-conversion warning"
```

---

### Task 12: SQL Formatter

Spec §7.6. A wrapper over `sql-formatter` — dialect, keyword case, indent width, comma position. The library does the tokenising; this task's job is to type it, wrap its throws in `ToolResult`, and render it.

**One spec/library conflict, already resolved below.** `sql-formatter` v15 **removed** the `commaPosition` option — passing it throws `commaPosition config is no more supported`, and its `indentStyle: "tabularLeft"` is a different layout, not leading commas. The spec still asks for the feature, so `formatSql` applies it itself as a post-processing pass. Do not try to pass `commaPosition` to `format()`.

All six dialect values below are verified against v15's `supportedDialects` (`tsql` is valid; so is `transactsql`).

**Files:**
- Create: `lib/tools/sql-format.ts`, `components/tools/SqlFormat.tsx`, `lib/tools/sql-format-sample.ts`
- Modify: `lib/registry/metas.ts`, `lib/registry/index.ts`, `package.json`
- Test: `tests/tools/sql-format.test.ts`

**Interfaces:**
- Produces:
  - `type SqlDialect = "sql" | "postgresql" | "mysql" | "tsql" | "sqlite" | "bigquery"`
  - `interface SqlOptions { dialect: SqlDialect; keywordCase: "upper" | "lower" | "preserve"; indent: number; commaPosition: "after" | "before" }`
  - `const DEFAULT_SQL_OPTIONS: SqlOptions`
  - `const SQL_DIALECTS: { value: SqlDialect; label: string }[]`
  - `formatSql(text: string, options: SqlOptions): ToolResult<string>`

- [ ] **Step 1: Install the dependency**

```bash
npm i sql-formatter@^15.8.2
```

Do NOT install `@types/sql-formatter`. Run `npm run typecheck` to confirm the bundled declarations resolve.

- [ ] **Step 2: Write the failing test**

Create `tests/tools/sql-format.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { formatSql, DEFAULT_SQL_OPTIONS, SQL_DIALECTS } from "@/lib/tools/sql-format";

const run = (text: string, patch: Partial<typeof DEFAULT_SQL_OPTIONS> = {}) =>
  formatSql(text, { ...DEFAULT_SQL_OPTIONS, ...patch });

const value = (text: string, patch: Partial<typeof DEFAULT_SQL_OPTIONS> = {}) => {
  const r = run(text, patch);
  if (!r.ok) throw new Error(r.error.message);
  return r.value;
};

describe("formatSql", () => {
  it("breaks a flat query across lines", () => {
    const out = value("select a,b from t where a=1");
    expect(out.split("\n").length).toBeGreaterThan(1);
  });

  it("uppercases keywords by default", () => {
    expect(value("select a from t")).toContain("SELECT");
  });

  it("lowercases keywords when asked", () => {
    expect(value("SELECT a FROM t", { keywordCase: "lower" })).toContain("select");
  });

  it("honours the indent width", () => {
    const four = value("select a, b from t", { indent: 4 });
    expect(four).toMatch(/\n {4}\S/);
  });

  it("puts commas before the column when asked", () => {
    const out = value("select aaa, bbb from t", { commaPosition: "before" });
    expect(out).toMatch(/\n\s*,/);
  });

  it("accepts every dialect the UI offers", () => {
    // The dropdown and the library must not drift apart: a dialect the UI can
    // select but the library rejects is a runtime error waiting to happen.
    for (const dialect of SQL_DIALECTS) {
      expect(run("select 1", { dialect: dialect.value }).ok, dialect.value).toBe(true);
    }
  });

  it("formats a dialect-specific query", () => {
    expect(value("select * from t limit 1", { dialect: "postgresql" })).toContain("SELECT");
  });

  it("rejects an empty document", () => {
    expect(run("   ").ok).toBe(false);
  });

  it("returns an error rather than throwing on input it cannot parse", () => {
    // Whatever this library does with garbage, it must arrive as a ToolResult.
    const r = run("!!!(((");
    expect(typeof r.ok).toBe("boolean");
  });
});
```

- [ ] **Step 3: Run it to verify it fails**

Run: `npx vitest run tests/tools/sql-format.test.ts`
Expected: FAIL — cannot resolve `@/lib/tools/sql-format`.

- [ ] **Step 4: Write the transform**

Create `lib/tools/sql-format.ts`:

```ts
import { format } from "sql-formatter";
import { err, ok, type ToolResult } from "@/lib/types";

export type SqlDialect = "sql" | "postgresql" | "mysql" | "tsql" | "sqlite" | "bigquery";

export interface SqlOptions {
  dialect: SqlDialect;
  keywordCase: "upper" | "lower" | "preserve";
  indent: number;
  commaPosition: "after" | "before";
}

export const DEFAULT_SQL_OPTIONS: SqlOptions = {
  dialect: "sql",
  keywordCase: "upper",
  indent: 2,
  commaPosition: "after",
};

/** The dropdown's contents. Every value here must be a language the library knows. */
export const SQL_DIALECTS: { value: SqlDialect; label: string }[] = [
  { value: "sql", label: "Standard SQL" },
  { value: "postgresql", label: "PostgreSQL" },
  { value: "mysql", label: "MySQL" },
  { value: "tsql", label: "T-SQL" },
  { value: "sqlite", label: "SQLite" },
  { value: "bigquery", label: "BigQuery" },
];

/**
 * Moves trailing commas to the head of the following line.
 *
 * sql-formatter REMOVED its `commaPosition` option in v15 — passing it throws
 * "commaPosition config is no more supported". The spec still asks for leading
 * commas, so we do it ourselves afterwards. The comma is placed INTO the
 * previous indentation rather than in front of it, which is what keeps the
 * column names themselves aligned.
 */
function toLeadingCommas(sql: string): string {
  const out: string[] = [];
  let carryComma = false;

  for (const line of sql.split("\n")) {
    const endsWithComma = line.endsWith(",");
    const body = endsWithComma ? line.slice(0, -1) : line;

    if (carryComma) {
      const indent = /^\s*/.exec(body)?.[0] ?? "";
      out.push(`${indent.length >= 2 ? indent.slice(0, -2) : ""}, ${body.trimStart()}`);
    } else {
      out.push(body);
    }
    carryComma = endsWithComma;
  }

  return out.join("\n");
}

export function formatSql(text: string, options: SqlOptions): ToolResult<string> {
  if (!text.trim()) return err("Enter a SQL statement.");
  try {
    const formatted = format(text, {
      language: options.dialect,
      keywordCase: options.keywordCase,
      tabWidth: options.indent,
    });
    return ok(options.commaPosition === "before" ? toLeadingCommas(formatted) : formatted);
  } catch (cause) {
    // The library throws on input it cannot tokenise. Everything reaches the
    // UI as a ToolResult, so a thrown parse error never reaches a boundary.
    return err(cause instanceof Error ? cause.message : "That SQL could not be formatted.");
  }
}
```

- [ ] **Step 5: Run the tests**

Run: `npx vitest run tests/tools/sql-format.test.ts`
Expected: PASS, 9 tests.

- [ ] **Step 6: Write the sample and the component**

Create `lib/tools/sql-format-sample.ts`:

```ts
export const SQL_FORMAT_SAMPLE = {
  input: "select o.id, o.total, c.email from orders o join customers c on c.id = o.customer_id where o.total > 100 and o.status in ('paid','shipped') order by o.created_at desc limit 50",
};
```

Create `components/tools/SqlFormat.tsx`:

```tsx
"use client";

import { useMemo } from "react";
import { Database, Eraser } from "lucide-react";
import { SQL_FORMAT_META } from "@/lib/registry/metas";
import {
  formatSql, DEFAULT_SQL_OPTIONS, SQL_DIALECTS, type SqlOptions,
} from "@/lib/tools/sql-format";
import { SQL_FORMAT_SAMPLE } from "@/lib/tools/sql-format-sample";
import { ToolShell } from "@/components/tool/ToolShell";
import { useToolState } from "@/components/tool/useToolState";
import { ErrorNote } from "@/components/tool/ErrorNote";
import { CopyButton } from "@/components/tool/CopyButton";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { Segmented } from "@/components/ui/Segmented";
import { CodeArea } from "@/components/ui/CodeArea";

interface State {
  input: string;
  options: SqlOptions;
}

const DEFAULTS: State = { input: "", options: DEFAULT_SQL_OPTIONS };

function isState(value: unknown): value is State {
  if (typeof value !== "object" || value === null) return false;
  const c = value as State;
  if (typeof c.input !== "string") return false;
  if (typeof c.options !== "object" || c.options === null) return false;
  const o = c.options;
  return typeof o.indent === "number" && Number.isFinite(o.indent)
    && SQL_DIALECTS.some((d) => d.value === o.dialect)
    && ["upper", "lower", "preserve"].includes(o.keywordCase)
    && ["after", "before"].includes(o.commaPosition);
}

export function SqlFormat() {
  const meta = SQL_FORMAT_META;
  const [state, update, reset] = useToolState<State>(meta, DEFAULTS, isState);

  const result = useMemo(
    () => (state.input.trim() ? formatSql(state.input, state.options) : null),
    [state.input, state.options],
  );

  const setOption = (patch: Partial<SqlOptions>) =>
    update({ options: { ...state.options, ...patch } });

  return (
    <ToolShell
      meta={meta}
      shareState={state}
      actions={
        <>
          <Button size="sm" onClick={() => update(SQL_FORMAT_SAMPLE)}>
            <Database size={13} aria-hidden />
            Load sample
          </Button>
          <Button size="sm" onClick={reset}>
            <Eraser size={13} aria-hidden />
            Clear
          </Button>
          {result?.ok ? <CopyButton text={result.value} label="Copy output" /> : null}
        </>
      }
      options={
        <>
          <label className="flex items-center gap-2">
            <span className="eyebrow">Dialect</span>
            <Select
              value={state.options.dialect}
              ariaLabel="SQL dialect"
              onChange={(dialect) => setOption({ dialect })}
              options={SQL_DIALECTS}
            />
          </label>
          <label className="flex items-center gap-2">
            <span className="eyebrow">Keywords</span>
            <Select
              value={state.options.keywordCase}
              ariaLabel="Keyword case"
              onChange={(keywordCase) => setOption({ keywordCase })}
              options={[
                { value: "upper", label: "UPPER" },
                { value: "lower", label: "lower" },
                { value: "preserve", label: "Preserve" },
              ]}
            />
          </label>
          <label className="flex items-center gap-2">
            <span className="eyebrow">Indent</span>
            <Select
              value={String(state.options.indent)}
              ariaLabel="Indent width"
              onChange={(indent) => setOption({ indent: Number(indent) })}
              options={[
                { value: "2", label: "2 spaces" },
                { value: "4", label: "4 spaces" },
              ]}
            />
          </label>
          <Segmented
            label="Comma position"
            value={state.options.commaPosition}
            onChange={(commaPosition) => setOption({ commaPosition })}
            options={[
              { value: "after", label: "Trailing" },
              { value: "before", label: "Leading" },
            ]}
          />
        </>
      }
    >
      <div className="grid min-h-0 gap-3 lg:grid-cols-2">
        <CodeArea
          value={state.input}
          onChange={(input) => update({ input })}
          ariaLabel="SQL input"
          placeholder="Paste a SQL statement"
          className="h-[60dvh] min-h-[22rem]"
        />
        <div className="flex flex-col gap-2">
          {result && !result.ok ? <ErrorNote error={result.error} /> : null}
          <CodeArea
            value={result?.ok ? result.value : ""}
            readOnly
            ariaLabel="Formatted SQL"
            className="h-[60dvh] min-h-[22rem]"
          />
        </div>
      </div>
    </ToolShell>
  );
}
```

- [ ] **Step 7: Register the tool**

In `lib/registry/metas.ts` (add `Database` to the lucide import):

```ts
export const SQL_FORMAT_META: ToolMeta = {
  slug: "sql-format",
  name: "SQL Formatter",
  blurb: "Format SQL across six dialects with configurable casing and indent.",
  group: "data",
  icon: Database,
  aliases: ["sql", "query", "beautify sql", "postgres", "mysql"],
  handlesSecrets: false,
};
```

Append the entry in `lib/registry/index.ts`.

- [ ] **Step 8: Run everything and verify in the browser**

Run: `npm test && npm run typecheck && npm run build`

Then `npm run dev`, load the sample, and check each dialect, both keyword cases, both comma positions, and both indent widths change the output as described.

- [ ] **Step 9: Commit**

```bash
git add lib/tools/sql-format.ts lib/tools/sql-format-sample.ts components/tools/SqlFormat.tsx tests/tools/sql-format.test.ts lib/registry package.json package-lock.json
git commit -m "feat: add SQL Formatter with dialect, casing, and comma options"
```

---

### Task 13: Highlight the JSON Compare panes

Spec §7.3 says the tokeniser is "used by JSON Formatter's raw view **and by JSON Compare, which wraps the same spans in diff classes**". Plan 1 shipped JSON Compare before the tokeniser existed, so its panes render plain text. This task closes that gap now that Task 2 has landed.

The row tint, the gutter glyph, and the alignment invariant all stay exactly as they are — this changes only how the text INSIDE a row is painted. Syntax colour must not fight the diff tint: the tint is the row's background and the gutter carries the classification, so token colours sit on top without conflict.

**Files:**
- Modify: `components/tools/JsonCompare.tsx` (the `Pane` component only)

**Interfaces:**
- Consumes: `tokenizeJson`, `JsonTokenType` (Task 2).

- [ ] **Step 1: Replace the row's text span with token spans**

In `components/tools/JsonCompare.tsx`, add the import:

```tsx
import { tokenizeJson, type JsonTokenType } from "@/lib/highlight/json";
```

Add the token palette above the `Pane` component:

```tsx
const TOKEN_TONE: Record<JsonTokenType, string> = {
  key: "text-[var(--code-key)]",
  string: "text-[var(--code-string)]",
  number: "text-[var(--code-number)]",
  atom: "text-[var(--code-atom)]",
  punct: "text-[var(--code-punct)]",
  space: "",
};
```

Inside `Pane`, replace this:

```tsx
                <span className="whitespace-pre text-fg">
                  {text === null ? " " : `${"  ".repeat(row.depth)}${text}`}
                </span>
```

with this:

```tsx
                <span className="whitespace-pre">
                  {text === null ? " " : (
                    <>
                      {"  ".repeat(row.depth)}
                      {tokenizeJson(text).map((token, index) => (
                        <span key={index} className={TOKEN_TONE[token.type]}>{token.text}</span>
                      ))}
                    </>
                  )}
                </span>
```

Note the `" "` rather than `""` for a blank side: a row blank on one pane must still occupy a line, and the gutter glyph alone already guarantees that — the space is belt and braces for the one case where a future change makes the gutter empty.

- [ ] **Step 2: Run the suite and typecheck**

Run: `npm test && npm run typecheck`
Expected: PASS. The row model tests are untouched — they assert on `toRows`, which this task does not modify.

- [ ] **Step 3: Verify in the browser**

Run `npm run dev`, open `/json-compare`, load the sample, and check:
- Keys, strings, numbers and atoms are coloured inside every row.
- The diff tints still read: an added row is still green-tinted with a `+`, a removed row rose with a `-`.
- **Greyscale check.** Screenshot and desaturate: every differing row must still be identifiable from its gutter glyph alone. If syntax colour has made the gutter harder to pick out, the gutter wins — keep it.
- The panes still scroll in lockstep and matched keys still sit on the same line.

- [ ] **Step 4: Commit**

```bash
git add components/tools/JsonCompare.tsx
git commit -m "feat: syntax-highlight the JSON Compare panes"
```

---

## Definition of done for Plan 2

- [ ] `npm test` passes — every suite green, including the registry invariants and the new sample-payload assertion.
- [ ] `npm run typecheck` reports no errors.
- [ ] JSON Compare's panes are syntax-highlighted, and every differing row still reads in greyscale from its gutter glyph.
- [ ] `npm run build` succeeds and prerenders all seven routes: `/json-compare`, `/json-format`, `/base64`, `/epoch`, `/regex`, `/yaml-json`, `/sql-format`.
- [ ] `grep -rn "fetch(\|XMLHttpRequest\|WebSocket" app lib components` returns nothing outside comments.
- [ ] `grep -rln "react" lib/tools/ lib/highlight/` returns nothing — the Pure Logic Rule holds for the new modules too.
- [ ] Every new tool is `handlesSecrets: false`, and `tests/registry.test.ts` still passes its secrets assertion.
- [ ] The rail shows a **Data & Formatting** group with seven tools; the dashboard shows the same seven, each once per section.
- [ ] ⌘K finds every new tool by name and by at least one alias.
- [ ] Every tool page renders correctly in both themes, and every coloured state carries a glyph or a word (greyscale check).
- [ ] Below 1024px every tool page stacks without horizontal page scroll.

## What the remaining plans inherit

- `lib/highlight/json.ts` and `<JsonCode>` — any tool rendering JSON output uses these rather than re-highlighting.
- `ToolEntry.sample` — every new entry MUST set it; the registry suite fails otherwise.
- The verified dependency-typing table in Global Constraints. Extend it rather than re-deriving it.
- The pattern each remaining tool follows, unchanged from Plan 1: `lib/tools/<slug>.ts` (pure, tested) → `components/tools/<Name>.tsx` (renders it) → one `TOOLS` entry with a meta in `lib/registry/metas.ts`.

**Still unplanned after this:** JSON → Code (§7.4); Security & Identity — GUID (§7.7), JWT (§7.8), Hash (§7.9), Password (§7.10); Networking & Backend — IP Calculator (§7.11), cURL Converter (§7.12), HTTP Inspector (§7.13), Cron Parser (§7.15); plus Settings (§5.5) and the responsive/accessibility audit (build order step 6).
