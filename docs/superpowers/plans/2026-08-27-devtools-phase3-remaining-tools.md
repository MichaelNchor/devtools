# DevTools Phase 1, Plan 3 — The Remaining Nine Tools

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Finish the tool set — JSON → Code, the four Security & Identity tools, the four Networking & Backend tools — then the Settings page and the responsive/accessibility audit that close out the build.

**Architecture:** Unchanged and not up for renegotiation. Pure transform in `lib/tools/<slug>.ts`, component in `components/tools/<Name>.tsx`, one `TOOLS` entry with a meta in `lib/registry/metas.ts` and a `sample` on the entry.

**Tech Stack:** As Plans 1–2, plus `uuid`, `hash-wasm`, `cronstrue`, `cron-parser`.

**Spec:** `docs/superpowers/specs/2026-08-27-devtools-design.md` (§7.4, §7.7–7.13, §7.15, §5.5)

**Predecessors:** Plan 1 (Tasks 1–17) and Plan 2 (Tasks 1–13), both merged. Read Plan 2's "Global Constraints" — every word still applies.

## Global Constraints

Identical to Plan 2. Restated because they are load-bearing:

- **No network.** `grep -rn "fetch(\|XMLHttpRequest\|WebSocket" app lib components` must return nothing outside comments.
- **The Pure Logic Rule.** No React, no `window`, no `document` in `lib/tools/`. WebCrypto (`globalThis.crypto`) is the only permitted platform API — and this plan is the one that actually uses it.
- **The Status Escape Rule.** Colour never carries meaning alone. Critical here: "signature valid" / "signature invalid" must read in greyscale.
- **Secrets.** `jwt`, `hash`, and `password` are `handlesSecrets: true` — the ONLY three. That gates both `localStorage` persistence and URL sharing. `tests/registry.test.ts` already asserts the exact set; it will fail if a fourth appears or one is missed.
- **TypeScript:** `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `verbatimModuleSyntax`. See Plan 2.

### Dependency notes

Verify each package's own typings before installing an `@types` package — Plan 1 lost time to a stub. Check `npm view <pkg> types` and the package README first.

| Package | For | Note |
|---|---|---|
| `uuid` | GUID v1/v5 | v4/v7 are hand-rolled from `crypto.getRandomValues`; only v1 and v5 need the library. |
| `hash-wasm` | Hash | WebCrypto has no MD5 or RIPEMD-160. Async API — every digest call returns a Promise. |
| `cronstrue` | Cron | Humanising. |
| `cron-parser` | Cron | Next-run computation with DST correctness. |

### The secret-handling tools behave differently on purpose

`jwt`, `hash`, and `password` pass `handlesSecrets: true`, which means `useToolState` returns defaults every time and `ToolShell` renders no Share button. **Do not add a sample-loading button that writes a token into state expecting it to persist** — it will not, by design. Their `sample` entries still exist (the registry invariant requires one) and still populate the field for the current session.

---

### Task 1: JSON → Code — type inference

Spec §7.4. Infers a language-neutral type model from a JSON sample. The model is what the seven emitters consume, so it is the piece worth getting exactly right.

**Files:** Create `lib/tools/json-to-code/infer.ts`; Test `tests/tools/json-to-code-infer.test.ts`

**Interfaces produced:**
- `type TypeNode = { kind: "primitive"; name: "string"|"number"|"boolean"|"null"|"any" } | { kind: "array"; element: TypeNode } | { kind: "object"; ref: string } | { kind: "union"; options: TypeNode[] }`
- `interface TypeField { key: string; type: TypeNode; optional: boolean; nullable: boolean }`
- `interface TypeModel { name: string; fields: TypeField[] }`
- `interface InferOptions { rootName: string; arrayUnification: "union" | "first" }`
- `inferTypes(value: unknown, options: InferOptions): TypeModel[]` — root model first, then nested models in discovery order.

**Required behaviours (write a test for each):**
1. A flat object yields one model with one field per key, typed by value.
2. A nested object yields a second model, named from its key in PascalCase (`user` → `User`), referenced by the parent as `{ kind: "object", ref: "User" }`.
3. An array of objects unifies its elements into ONE model, not one per element.
4. Under `arrayUnification: "union"`, a key present in only some elements is `optional: true`; under `"first"`, only the first element is inspected.
5. A key whose value is `null` in one element and a string in another is `nullable: true`, not `any`.
6. An array of mixed primitives becomes a `union` of those primitives, deduplicated.
7. An empty array's element type is `any` — there is nothing to infer from.
8. Two structurally identical nested objects under different keys still produce two models (names come from keys; deduplicating by shape would produce misleading names).
9. Model names are unique: a second `User` becomes `User2` rather than silently overwriting.
10. A root that is an array of objects produces a model named `rootName` for the ELEMENT, since that is the type the user wants.

- [ ] **Step 1:** Write the test file covering all ten behaviours.
- [ ] **Step 2:** Run it — expect FAIL (module unresolved).
- [ ] **Step 3:** Implement `inferTypes`.
- [ ] **Step 4:** Run — expect PASS.
- [ ] **Step 5:** `git commit -m "feat: add JSON to Code type inference"`

---

### Task 2: JSON → Code — language emitters

Spec §7.4. Seven targets: TypeScript, C#, Go, Java, Python dataclass, Python Pydantic, Kotlin.

**Files:** Create `lib/tools/json-to-code/emit.ts`; Test `tests/tools/json-to-code-emit.test.ts`

**Interfaces produced:**
- `type TargetLanguage = "typescript" | "csharp" | "go" | "java" | "python-dataclass" | "python-pydantic" | "kotlin"`
- `const LANGUAGES: { value: TargetLanguage; label: string }[]`
- `interface EmitOptions { language: TargetLanguage; optionalStyle: "optional" | "nullable" }`
- `emitCode(models: TypeModel[], options: EmitOptions): string`

**Required behaviours (write a test for each):**
1. Each language emits a compilable-looking declaration for a one-field model — assert on the exact expected text, not a substring.
2. **Naming conventions per spec:** C# members PascalCase, Python members snake_case, Go fields PascalCase (exported), TypeScript and Kotlin keep the original key.
3. **The original key is preserved via a serialisation attribute wherever the language has one:** C# `[JsonPropertyName("...")]`, Go `` `json:"..."` ``, Java `@JsonProperty("...")`, Kotlin `@SerialName("...")`, Python Pydantic `Field(alias="...")`. TypeScript needs none — it quotes the key directly. **Emit the attribute only when the converted name differs from the original key** — note that in C# and Go this is most fields, since `id` -> `Id` differs and both languages match JSON keys case-sensitively by default.
4. Optional vs nullable: under `"optional"` TypeScript emits `key?: T`, under `"nullable"` it emits `key: T | null`. C# nullable emits `T?`.
5. An array field emits the language's list type: `T[]`, `List<T>`, `[]T`, `List<T>`, `list[T]`, `List[T]`, `List<T>`.
6. A union of primitives degrades to the language's permissive type where the language has no unions (`object` in C#, `any` in Go via `interface{}`, `Any` in Python) but emits a real union in TypeScript.
7. Nested object references emit the referenced model's name.
8. Every emitted model appears in the output, root first.
9. A key that is not a valid identifier (`"my-key"`) is converted and carries its serialisation attribute.
10. Output ends with exactly one trailing newline, so copying it into a file is clean.

- [ ] **Step 1–5:** Same TDD cycle as Task 1. Commit `"feat: add JSON to Code language emitters"`.

---

### Task 3: JSON → Code UI and registration

**Files:** Create `components/tools/JsonToCode.tsx`, `lib/tools/json-to-code-sample.ts`; Modify `lib/registry/metas.ts`, `lib/registry/index.ts`

State: `{ input, rootName, language, optionalStyle, arrayUnification }`. Meta: slug `json-to-code`, name "JSON → Code", group `data`, icon `Code2`, aliases `["types","interface","typescript","codegen","class"]`, `handlesSecrets: false`.

Output renders read-only in a `CodeArea` with a `CopyButton`. Parse errors render through `ErrorNote`.

- [ ] **Steps:** Build, register, `npm test && npm run typecheck && npm run build`, verify `/json-to-code` in the browser, commit.

---

### Task 4: GUID Generator

Spec §7.7. v4 and v7 from `crypto.getRandomValues`; v1 and v5 via `uuid`. Options: count (1–1000), uppercase, braces, hyphens.

**Files:** Create `lib/tools/guid.ts`, `components/tools/Guid.tsx`, `lib/tools/guid-sample.ts`; Test `tests/tools/guid.test.ts`

**Interfaces produced:**
- `type GuidVersion = "v1" | "v4" | "v5" | "v7"`
- `interface GuidOptions { version: GuidVersion; count: number; uppercase: boolean; braces: boolean; hyphens: boolean; namespace: string; name: string }`
- `const GUID_NAMESPACES: { value: string; label: string }[]` — the four standard namespaces (DNS, URL, OID, X500) plus custom.
- `generateGuids(options: GuidOptions): ToolResult<string[]>`

**Required behaviours:**
1. v4 output matches `/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/` — version nibble 4 AND the RFC 4122 variant bits.
2. v7 sets version nibble 7 and its first 48 bits are a big-endian millisecond timestamp: two v7s generated in order sort lexicographically in generation order.
3. `count: 10` returns ten distinct values.
4. `count: 0` and `count: 1001` are rejected with a message (spec caps at 1–1000).
5. `uppercase` uppercases; `braces` wraps in `{}`; `hyphens: false` strips them — and the three compose.
6. v5 with the same namespace and name is deterministic — the same input twice gives the same GUID.
7. v5 with an invalid namespace UUID is rejected rather than throwing.
8. v1 produces a version-1 GUID.
9. Every version passes the variant-bits check.

`handlesSecrets: false` — a GUID is not a secret. Meta: icon `Fingerprint`, group `security`, aliases `["uuid","guid","id","identifier"]`.

- [ ] **Steps:** `npm i uuid`, TDD cycle, register, verify, commit.

---

### Task 5: Password Generator

Spec §7.10. `crypto.getRandomValues` ONLY — never `Math.random`. This is the tool where that rule is not stylistic.

**Files:** Create `lib/tools/password.ts`, `components/tools/Password.tsx`, `lib/tools/password-sample.ts`; Test `tests/tools/password.test.ts`

**Interfaces produced:**
- `interface PasswordOptions { length: number; lower: boolean; upper: boolean; digits: boolean; symbols: boolean; custom: string; excludeAmbiguous: boolean; requireEachSet: boolean; count: number }`
- `generatePasswords(options: PasswordOptions): ToolResult<string[]>`
- `entropyBits(options: PasswordOptions): number`
- `describeStrength(bits: number): string`

**Required behaviours:**
1. Generated length matches `length` exactly.
2. Only characters from the selected sets appear.
3. `excludeAmbiguous` removes `0O1lI` (and any other pair the implementation names) from the pool.
4. `requireEachSet` guarantees at least one character from EVERY selected set — assert over many generations, not one.
5. With no set selected and no custom characters, generation is rejected with a message rather than returning empty strings.
6. `length` outside 8–128 is rejected.
7. `entropyBits` = `length * log2(poolSize)`, verified against a hand-computed case.
8. Entropy reflects `excludeAmbiguous` shrinking the pool.
9. `describeStrength` returns distinct plain-language statements across the range, and every one is a real sentence, not a bare adjective.
10. `count` up to 100 works; above 100 is rejected.
11. **Randomness comes from `crypto.getRandomValues`** — assert by stubbing `globalThis.crypto.getRandomValues` and confirming it was called.
12. **Modulo bias is avoided:** rejection-sample rather than `value % poolSize`. Assert the implementation rejects out-of-range draws by stubbing a sequence that would bias.

`handlesSecrets: true`. Meta: icon `KeyRound`, group `security`, aliases `["password","passphrase","random","generate"]`.

- [ ] **Steps:** TDD cycle, register, verify, commit.

---

### Task 6: Hash Generator

Spec §7.9. MD5, SHA-1, SHA-256, SHA-384, SHA-512, RIPEMD-160 via `hash-wasm`; HMAC with a key; text or file input; hex or base64 output; a compare field reporting match or mismatch.

**Files:** Create `lib/tools/hash.ts`, `components/tools/Hash.tsx`, `lib/tools/hash-sample.ts`; Test `tests/tools/hash.test.ts`

**Interfaces produced:**
- `type HashAlgorithm = "md5" | "sha1" | "sha256" | "sha384" | "sha512" | "ripemd160"`
- `const HASH_ALGORITHMS: { value: HashAlgorithm; label: string }[]`
- `interface HashOptions { algorithm: HashAlgorithm; encoding: "hex" | "base64"; hmacKey: string }`
- `hashText(text: string, options: HashOptions): Promise<ToolResult<string>>`
- `hashBytes(bytes: Uint8Array, options: HashOptions): Promise<ToolResult<string>>`
- `digestsMatch(a: string, b: string): boolean` — case-insensitive, whitespace-tolerant.

**Required behaviours (use published test vectors — do not invent expected digests):**
1. `md5("abc")` = `900150983cd24fb0d6963f7d28e17f72`
2. `sha1("abc")` = `a9993e364706816aba3e25717850c26c9cd0d89d`
3. `sha256("abc")` = `ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad`
4. `sha512("abc")` starts `ddaf35a193617aba`
5. `ripemd160("abc")` = `8eb208f7e05d987a9b044a8e98c6b087f15a0bfc`
6. Empty input hashes to each algorithm's known empty digest (`md5("")` = `d41d8cd98f00b204e9800998ecf8427e`).
7. Base64 encoding of a digest decodes back to the same bytes as its hex form.
8. HMAC-SHA256 with key `key` over `The quick brown fox jumps over the lazy dog` = `f7bc83f430538424b13298e6aa6fb143ef4d59a14946175997479dbc2d1a3cd8`
9. UTF-8 input is hashed as UTF-8 bytes — `hashText("café")` equals `hashBytes(new TextEncoder().encode("café"))`.
10. `digestsMatch` ignores case and surrounding whitespace, and rejects a genuine mismatch.

**File input must stream in chunks** so a large file does not exhaust memory — use `hash-wasm`'s incremental `createXXX()` API with `update()` per chunk, not one `arrayBuffer()` read.

`handlesSecrets: true`. Meta: icon `Hash`, group `security`, aliases `["md5","sha","sha256","checksum","digest","hmac"]`.

- [ ] **Steps:** `npm i hash-wasm`, TDD cycle, register, verify, commit.

---

### Task 7: JWT Debugger

Spec §7.8. Decode without verifying; humanise `exp`/`iat`/`nbf`; real verification via WebCrypto. **Verification state is stated explicitly — "signature valid", "signature invalid", or "not verified" — and never implied by decoding succeeding.** That sentence is the whole tool.

**Files:** Create `lib/tools/jwt.ts`, `components/tools/Jwt.tsx`, `lib/tools/jwt-sample.ts`; Test `tests/tools/jwt.test.ts`

**Interfaces produced:**
- `interface JwtParts { header: Record<string, unknown>; payload: Record<string, unknown>; signature: string; signingInput: string }`
- `type VerifyState = "valid" | "invalid" | "not-verified"`
- `interface ClaimTime { claim: string; at: Date; relative: string; state: "ok" | "expired" | "not-yet-valid" }`
- `decodeJwt(token: string): ToolResult<JwtParts>`
- `describeTimeClaims(payload: Record<string, unknown>, now?: number): ClaimTime[]`
- `verifyJwt(token: string, key: string): Promise<ToolResult<VerifyState>>`

**Required behaviours:**
1. Decodes a well-formed HS256 token into header, payload, and signature.
2. Decodes a token whose payload contains multi-byte UTF-8 (base64url, then UTF-8 — not `atob`).
3. Rejects a token without three dot-separated segments.
4. Rejects a token whose header or payload is not valid base64url JSON, with a message naming which part failed.
5. **Decoding a token with a garbage signature still succeeds** — decoding is not verification, and the tool must show the claims.
6. `exp` in the past yields `state: "expired"`; in the future, `"ok"`.
7. `nbf` in the future yields `"not-yet-valid"`.
8. `iat` is rendered but never makes a token invalid on its own.
9. A payload with no time claims yields an empty array, not a fabricated row.
10. `verifyJwt` returns `"valid"` for a correct HS256 secret and `"invalid"` for a wrong one — generate the token in the test with WebCrypto so no secret is committed.
11. `verifyJwt` with an empty key returns `"not-verified"`, never `"invalid"` — "we did not check" and "it failed" are different answers.
12. An unsupported `alg` returns `"not-verified"` with a message naming the algorithm.
13. `alg: "none"` is ALWAYS `"not-verified"` — never `"valid"`. This is a known attack; the tool must not endorse it.

`handlesSecrets: true`. Meta: icon `KeySquare`, group `security`, aliases `["jwt","token","jsonwebtoken","bearer","claims"]`.

- [ ] **Steps:** TDD cycle, register, verify, commit.

---

### Task 8: IP Calculator

Spec §7.11. IPv4 and IPv6. `/31` and `/32` special-cased rather than reporting negative host counts.

**Files:** Create `lib/tools/ip.ts`, `components/tools/IpCalculator.tsx`, `lib/tools/ip-sample.ts`; Test `tests/tools/ip.test.ts`

**Interfaces produced:**
- `interface Ipv4Report { network; broadcast; firstHost; lastHost; usableHosts; netmask; wildcard; prefix; scope }`
- `calculateIpv4(input: string): ToolResult<Ipv4Report>` — accepts `a.b.c.d/n` or `a.b.c.d n.n.n.n`
- `splitSubnets(input: string, newPrefix: number): ToolResult<{ network: string; broadcast: string }[]>`
- `analyseIpv6(input: string): ToolResult<{ expanded; compressed; prefix; firstAddress; lastAddress; addressCount: string }>`

**Required behaviours:**
1. `192.168.1.10/24` → network `192.168.1.0`, broadcast `192.168.1.255`, first `192.168.1.1`, last `192.168.1.254`, usable `254`, netmask `255.255.255.0`, wildcard `0.0.0.255`.
2. Dotted-mask form `192.168.1.10 255.255.255.0` gives the identical report.
3. **`/32` → usable hosts `1`, first = last = the address itself.** Not `-1`.
4. **`/31` → usable hosts `2` (RFC 3021 point-to-point), no broadcast.** Not `0`.
5. `/0` is accepted and reports the whole space.
6. Scope detection: `10.x`/`172.16–31.x`/`192.168.x` private, `127.x` loopback, `169.254.x` link-local, `224–239.x` multicast, otherwise public.
7. Invalid octet (`256.1.1.1`), invalid prefix (`/33`), and malformed input are each rejected with a message.
8. `splitSubnets("10.0.0.0/24", 26)` returns four subnets with correct boundaries.
9. Splitting to a prefix shorter than or equal to the original is rejected.
10. IPv6 `2001:db8::1` expands to `2001:0db8:0000:0000:0000:0000:0000:0001` and compresses back.
11. IPv6 `::` and `::1` round-trip correctly — the all-zeros and loopback edge cases.
12. IPv6 address count for a `/64` is `18446744073709551616` — returned as a STRING, because it exceeds `Number.MAX_SAFE_INTEGER`.

Use `BigInt` for IPv6 arithmetic. Meta: icon `Network`, group `network`, aliases `["ip","subnet","cidr","netmask","ipv6"]`, `handlesSecrets: false`.

- [ ] **Steps:** TDD cycle, register, verify, commit.

---

### Task 9: cURL Converter

Spec §7.12. Parse a `curl` command into a request model, then emit six languages. **Unsupported flags are listed explicitly above the output instead of being dropped silently.**

**Files:** Create `lib/tools/curl.ts`, `components/tools/CurlConvert.tsx`, `lib/tools/curl-sample.ts`; Test `tests/tools/curl.test.ts`

**Interfaces produced:**
- `interface RequestModel { method; url; headers: [string,string][]; body: string | null; bodyKind: "raw"|"form"|"urlencoded"|null; auth: { user; password } | null; insecure: boolean; followRedirects: boolean; compressed: boolean; cookies: [string,string][] }`
- `interface CurlParse { request: RequestModel; unsupported: string[] }`
- `parseCurl(command: string): ToolResult<CurlParse>`
- `type CurlTarget = "fetch" | "axios" | "python" | "csharp" | "go" | "powershell"`
- `emitRequest(model: RequestModel, target: CurlTarget): string`

**Required behaviours:**
1. Bare `curl https://x.test` → method `GET`, that URL, no body.
2. `-X POST` sets the method; `-d` without `-X` implies `POST` (curl's own behaviour).
3. `-H 'A: b'` and `-H "A: b"` both parse; a header with a colon in its VALUE (`-H 'X: a:b'`) splits only on the first colon.
4. `--data`, `--data-raw`, and `-d` all set a raw body; `--data-urlencode` sets `bodyKind: "urlencoded"`.
5. `-F a=b` sets `bodyKind: "form"`.
6. `-u user:pass` populates `auth`; a password containing `:` is preserved.
7. Line continuations (`\` + newline) are joined before parsing.
8. Single and double quoting both work, including a quoted string containing the other quote character.
9. `--compressed`, `-k`, `-L`, `--cookie` set their flags.
10. **An unrecognised flag lands in `unsupported`, and parsing still succeeds** — the user gets their conversion plus an honest list of what was ignored.
11. A command not starting with `curl` is rejected.
12. Each of the six targets emits the method, URL, every header, and the body.
13. Emitters escape quotes in header values and bodies correctly for their language.

Meta: icon `TerminalSquare`, group `network`, aliases `["curl","http","request","convert","fetch"]`, `handlesSecrets: false`.

- [ ] **Steps:** TDD cycle, register, verify, commit.

---

### Task 10: HTTP Inspector

Spec §7.13. Parse a pasted raw HTTP request or response, detect which it is, pretty-print JSON or form bodies, decode `Authorization`, split cookies, parse `Content-Type` parameters, report header count and body size.

**Files:** Create `lib/tools/http-inspect.ts`, `components/tools/HttpInspector.tsx`, `lib/tools/http-inspect-sample.ts`; Test `tests/tools/http-inspect.test.ts`

**Interfaces produced:**
- `interface HttpMessage { kind: "request" | "response"; startLine: string; method?: string; target?: string; version: string; status?: number; reason?: string; headers: [string,string][]; body: string; bodyBytes: number }`
- `interface HttpAnalysis { message: HttpMessage; contentType: { type: string; params: [string,string][] } | null; prettyBody: string | null; authorization: { scheme: string; detail: string } | null; cookies: [string,string][]; setCookies: string[] }`
- `inspectHttp(text: string): ToolResult<HttpAnalysis>`

**Required behaviours:**
1. Detects a request from its start line (`GET /path HTTP/1.1`) and a response from `HTTP/1.1 200 OK`.
2. Parses headers into pairs, splitting on the first colon and trimming.
3. Handles both CRLF and LF line endings — pasted text loses CRLF constantly.
4. Separates the body at the first blank line; a message with no body yields `""` and `bodyBytes: 0`.
5. `bodyBytes` counts UTF-8 BYTES, not characters — assert with a multi-byte body.
6. A JSON body is pretty-printed into `prettyBody`; an invalid JSON body leaves `prettyBody` null rather than erroring the whole parse.
7. A form-urlencoded body is rendered as decoded key/value lines.
8. `Content-Type: application/json; charset=utf-8` parses into type plus one param.
9. `Authorization: Basic dXNlcjpwYXNz` decodes to `user:pass`.
10. `Authorization: Bearer <jwt>` reports a JWT summary (alg and any `sub`), not the raw token.
11. `Cookie: a=1; b=2` splits into two pairs; multiple `Set-Cookie` headers are all retained.
12. Header names are matched case-insensitively (`content-type` and `Content-Type` both work).
13. Malformed input with no recognisable start line is rejected with a message.

Meta: icon `FileSearch`, group `network`, aliases `["http","request","response","headers","inspect"]`, `handlesSecrets: false`.

---

### Task 11: Cron Parser

Spec §7.15. 5-field, 6-field (with seconds), and macros. Humanise via `cronstrue`, next 10 runs via `cron-parser` in a chosen timezone, plus a per-field breakdown. Invalid expressions report which field failed and why.

**Files:** Create `lib/tools/cron.ts`, `components/tools/Cron.tsx`, `lib/tools/cron-sample.ts`; Test `tests/tools/cron.test.ts`

**Interfaces produced:**
- `interface CronField { name: string; value: string; describes: string }`
- `interface CronReport { description: string; fields: CronField[]; nextRuns: Date[]; hasSeconds: boolean }`
- `parseCron(expression: string, timeZone: string, from?: Date): ToolResult<CronReport>`
- `const CRON_MACROS: Record<string, string>`

**Required behaviours:**
1. `0 9 * * 1-5` is described in words and yields five weekday fields.
2. A 6-field expression sets `hasSeconds: true` and yields six fields.
3. `@daily` and the other macros expand and are described.
4. Next runs are computed in the given timezone — the same expression in `UTC` and `Asia/Tokyo` yields different instants.
5. Exactly 10 next runs are returned, strictly increasing.
6. `from` makes the computation deterministic — pass a fixed date in tests, never rely on "now".
7. An invalid field (`99 * * * *`) is rejected with a message naming the field.
8. Wrong field count (three fields) is rejected.
9. `*/15 * * * *` yields runs 15 minutes apart.
10. A DST-crossing expression still produces strictly increasing instants.

Meta: icon `CalendarClock`, group `network`, aliases `["cron","crontab","schedule","job"]`, `handlesSecrets: false`.

---

### Task 12: Settings page

Spec §5.5. Theme (system / light / dark), rail default state, clear all stored tool inputs, clear favourites and recents. Everything acts on `localStorage` only.

**Files:** Create `app/settings/page.tsx`; Modify `lib/storage.ts` if a "clear by prefix" helper is missing.

**Required behaviours:**
- A static `/settings` route, which takes precedence over `[slug]` — this is why `[slug]`'s not-found comment says what it says.
- Every destructive action confirms before acting and reports what it cleared.
- Clearing tool inputs removes only `devtools:tool:*` keys, leaving theme, favourites, recents, and rail state intact — test the prefix helper in `tests/storage.test.ts`.
- The page renders correctly when site data is blocked.

---

### Task 13: Responsive and accessibility audit

Build order step 6. Not a feature — a pass over what now exists.

- [ ] Every tool page below 1024px: panes stack, no horizontal page scroll, the rail is a drawer.
- [ ] Every interactive control reachable by keyboard, with a visible focus ring.
- [ ] Every coloured state also carries a glyph or a word (greyscale screenshot check), in both themes.
- [ ] Every `input`, `select`, and `textarea` has an accessible name.
- [ ] Both themes pass contrast on body text, muted text, and every status colour.
- [ ] The whole site works in a private window with site data blocked.

## Definition of done for Plan 3

- [ ] `npm test` passes; `npm run typecheck` clean; `npm run build` prerenders all sixteen tool routes plus `/` and `/settings`.
- [ ] `tests/registry.test.ts` passes with exactly sixteen tools and exactly three `handlesSecrets: true` (`hash`, `jwt`, `password`).
- [ ] The no-network and Pure-Logic greps still return nothing.
- [ ] All three rail groups render, each with its tools.
- [ ] ⌘K finds every tool by name and by at least one alias.
