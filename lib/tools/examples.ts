/**
 * Worked examples for every tool, most useful first. The first entry doubles
 * as the tool's default sample.
 *
 * These live together rather than beside each transform because they are
 * content, not logic: writing them in one place makes it obvious when a tool
 * has only a trivial example, or when two tools are teaching the same thing.
 *
 * A deliberate pattern: several tools include an example that FAILS, because
 * the error path is the half people cannot guess and the half they hit first.
 */
import type { ToolExample } from "@/lib/registry/types";
import { DEFAULT_COMPARE_OPTIONS } from "./json-compare";
import { DEFAULT_FORMAT_OPTIONS } from "./json-format";
import { DEFAULT_BASE64_OPTIONS } from "./base64";
import { DEFAULT_SQL_OPTIONS } from "./sql-format";

const j = (value: unknown) => JSON.stringify(value, null, 2);

export const JSON_COMPARE_EXAMPLES: ToolExample[] = [
  {
    name: "Config drift",
    blurb: "Two deploy configs that disagree — a changed value, a type change, and a whole added block.",
    state: {
      left: j({
        service: "checkout", version: "2.1.0", replicas: 3, port: "8080",
        features: ["cart", "coupons"],
        limits: { cpu: "500m", memory: "512Mi" }, deprecated: true,
      }),
      right: j({
        service: "checkout", version: "2.2.0", replicas: 5, port: 8080,
        features: ["cart", "coupons", "gift-cards"],
        limits: { cpu: "500m", memory: "1Gi" },
        probes: { liveness: "/healthz", readiness: "/ready" },
      }),
      options: DEFAULT_COMPARE_OPTIONS,
      view: "structural",
    },
  },
  {
    name: "Same data, different shape",
    blurb: "Identical values with reordered keys and different formatting — proves the diff is structural.",
    state: {
      left: '{\n  "b": 2,\n  "a": 1,\n  "nested": { "y": true, "x": false }\n}',
      right: '{"a":1,"b":2,"nested":{"x":false,"y":true}}',
      options: DEFAULT_COMPARE_OPTIONS,
      view: "structural",
    },
  },
  {
    name: "Reordered array",
    blurb: "The same records in a different order. Switch array matching to By value to see them match.",
    state: {
      left: j([{ id: 1, name: "ada" }, { id: 2, name: "grace" }]),
      right: j([{ id: 2, name: "grace" }, { id: 1, name: "ada" }]),
      options: { ...DEFAULT_COMPARE_OPTIONS, arrayMatching: "value" },
      view: "structural",
    },
  },
  {
    name: "Broken JSON",
    blurb: "A missing brace, so you can see how parse errors report their line and column.",
    state: {
      left: '{\n  "a": 1,\n  "b": [1, 2\n}',
      right: j({ a: 1, b: [1, 2] }),
      options: DEFAULT_COMPARE_OPTIONS,
      view: "structural",
    },
  },
];

export const JSON_FORMAT_EXAMPLES: ToolExample[] = [
  {
    name: "Minified API response",
    blurb: "One long line of JSON. Beautify it, then try sorting the keys.",
    state: {
      input: '{"service":"checkout","replicas":3,"limits":{"memory":"512Mi","cpu":"500m"},"features":["cart","coupons"],"enabled":true,"retries":null}',
      options: DEFAULT_FORMAT_OPTIONS,
      view: "raw",
    },
  },
  {
    name: "Deeply nested",
    blurb: "Several levels down — best seen in the Tree view, where you can collapse branches.",
    state: {
      input: j({
        org: {
          name: "acme",
          teams: [
            { name: "platform", members: [{ name: "ada", roles: ["admin", "dev"] }] },
            { name: "data", members: [{ name: "grace", roles: ["dev"] }] },
          ],
        },
      }),
      options: DEFAULT_FORMAT_OPTIONS,
      view: "tree",
    },
  },
  {
    name: "Unsorted keys",
    blurb: "Keys in arbitrary order at every level. Set Sort keys to A → Z.",
    state: {
      input: j({ zulu: 1, alpha: { yankee: 2, bravo: 3 }, mike: [{ zebra: 4, apple: 5 }] }),
      options: { ...DEFAULT_FORMAT_OPTIONS, sort: "asc" },
      view: "raw",
    },
  },
  {
    name: "Invalid JSON",
    blurb: "A trailing comma and a single-quoted key — two things JSON does not allow.",
    state: {
      input: "{\n  'name': \"ada\",\n  \"roles\": [\"admin\",],\n}",
      options: DEFAULT_FORMAT_OPTIONS,
      view: "raw",
    },
  },
];

export const JSON_TO_CODE_EXAMPLES: ToolExample[] = [
  {
    name: "API user record",
    blurb: "Nested objects, an array of records, and a null — the four cases type inference has to get right.",
    state: {
      input: j({
        id: 42, display_name: "Ada Lovelace", active: true, score: 99.5, bio: null,
        tags: ["engineer", "mathematician"],
        address: { city: "London", postcode: "NW1" },
        sessions: [
          { id: 1, device: "laptop" },
          { id: 2, device: "phone", referrer: "search" },
        ],
      }),
      rootName: "User", language: "typescript",
      optionalStyle: "optional", arrayUnification: "union",
    },
  },
  {
    name: "Inconsistent records",
    blurb: "An array whose objects disagree on which keys exist. Compare Unify all against First only.",
    state: {
      input: j([
        { id: 1, email: "a@x.test" },
        { id: 2, email: "b@x.test", verified: true },
        { id: 3, email: null, verified: false, note: "pending" },
      ]),
      rootName: "Account", language: "typescript",
      optionalStyle: "optional", arrayUnification: "union",
    },
  },
  {
    name: "Awkward key names",
    blurb: "Keys that are not valid identifiers, so each language emits its serialisation attribute.",
    state: {
      input: j({ "user-id": 1, "first name": "ada", "2fa_enabled": true }),
      rootName: "Row", language: "csharp",
      optionalStyle: "optional", arrayUnification: "union",
    },
  },
];

export const BASE64_EXAMPLES: ToolExample[] = [
  {
    name: "Multi-byte text",
    blurb: "Accents and emoji — the case where btoa throws and this tool does not.",
    state: {
      input: "Encode me — including café, 🙂, and other multi-byte text.",
      mode: "encode", options: DEFAULT_BASE64_OPTIONS, mime: "text/plain",
    },
  },
  {
    name: "Decode a JWT payload",
    blurb: "A base64url segment with no padding, decoded back to JSON.",
    state: {
      input: "eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkFkYSBMb3ZlbGFjZSJ9",
      mode: "decode", options: { urlSafe: true, padding: false }, mime: "application/json",
    },
  },
  {
    name: "Binary that is not text",
    blurb: "Decodes to bytes that are not valid UTF-8, so the hex view and download appear.",
    state: {
      input: "/w+AAP8=", mode: "decode",
      options: DEFAULT_BASE64_OPTIONS, mime: "application/octet-stream",
    },
  },
];

export const EPOCH_EXAMPLES: ToolExample[] = [
  {
    name: "Seconds",
    blurb: "A ten-digit timestamp. The unit is detected from its magnitude.",
    state: { input: "1700000000", direction: "from-epoch", unit: "auto", zone: "UTC" },
  },
  {
    name: "Milliseconds",
    blurb: "The same instant with three more digits — detection should land on the same date.",
    state: { input: "1700000000000", direction: "from-epoch", unit: "auto", zone: "UTC" },
  },
  {
    name: "Before 1970",
    blurb: "A negative timestamp, which a lot of converters get wrong.",
    state: { input: "-2208988800", direction: "from-epoch", unit: "auto", zone: "UTC" },
  },
  {
    name: "Date to epoch",
    blurb: "Go the other way, from an ISO 8601 string.",
    state: { input: "2026-01-01T09:30:00Z", direction: "to-epoch", unit: "auto", zone: "Asia/Tokyo" },
  },
];

export const REGEX_EXAMPLES: ToolExample[] = [
  {
    name: "Named capture groups",
    blurb: "Pulls the user and host out of email addresses, with a named replacement.",
    state: {
      pattern: "(?<user>[\\w.+-]+)@(?<host>[\\w-]+\\.[\\w.-]+)",
      flags: "g",
      text: "Contact ada@example.com or grace+dev@navy.mil.uk — but not bad@@example.",
      replacement: "$<user> at $<host>",
    },
  },
  {
    name: "Log line parsing",
    blurb: "Numbered groups over structured log lines, with a reordering replacement.",
    state: {
      pattern: "^(\\S+) (\\w+) \\[(\\d{3})\\] (.+)$",
      flags: "gm",
      text: [
        "2026-01-01T10:00:00Z GET [200] /api/orders",
        "2026-01-01T10:00:04Z POST [500] /api/orders",
        "2026-01-01T10:00:09Z GET [404] /api/missing",
      ].join("\n"),
      replacement: "$3 $2 $4",
    },
  },
  {
    name: "Catastrophic backtracking",
    blurb: "Nested quantifiers. Loads the warning without pasting input long enough to hang.",
    state: { pattern: "(a+)+$", flags: "", text: "aaaaaaaaaaaaaaaaaaaa!", replacement: "" },
  },
];

export const YAML_JSON_EXAMPLES: ToolExample[] = [
  {
    name: "YAML with comments",
    blurb: "Converting drops the comments, and the tool says so before you copy the result.",
    state: {
      input: [
        "# deployment settings",
        "service: checkout",
        "replicas: 3",
        "limits:",
        "  cpu: 500m      # burstable",
        "  memory: 512Mi",
        "features:",
        "  - cart",
        "  - coupons",
      ].join("\n"),
      direction: "yaml-to-json", indent: 2, flowStyle: false,
    },
  },
  {
    name: "JSON to YAML",
    blurb: "The other direction. Try Flow style to inline the collections.",
    state: {
      input: j({ service: "checkout", ports: [8080, 8443], env: { LOG_LEVEL: "info" } }),
      direction: "json-to-yaml", indent: 2, flowStyle: false,
    },
  },
  {
    name: "Anchors and aliases",
    blurb: "YAML can reference itself; JSON cannot. The warning fires before anything is lost.",
    state: {
      input: [
        "defaults: &defaults",
        "  retries: 3",
        "  timeout: 30",
        "staging:",
        "  <<: *defaults",
        "  url: https://staging.test",
      ].join("\n"),
      direction: "yaml-to-json", indent: 2, flowStyle: false,
    },
  },
];

export const SQL_FORMAT_EXAMPLES: ToolExample[] = [
  {
    name: "Unformatted join",
    blurb: "One long line with a join, a filter and an order — the everyday case.",
    state: {
      input: "select o.id, o.total, c.email from orders o join customers c on c.id = o.customer_id where o.total > 100 and o.status in ('paid','shipped') order by o.created_at desc limit 50",
      options: DEFAULT_SQL_OPTIONS,
    },
  },
  {
    name: "CTE with a window function",
    blurb: "Nested and stacked clauses, where indentation earns its keep.",
    state: {
      input: "with ranked as (select customer_id, total, row_number() over (partition by customer_id order by total desc) as rn from orders) select * from ranked where rn = 1",
      options: { ...DEFAULT_SQL_OPTIONS, dialect: "postgresql" },
    },
  },
  {
    name: "Leading commas",
    blurb: "The same query with commas at the head of each line, which sql-formatter cannot do on its own.",
    state: {
      input: "select id, first_name, last_name, email, created_at from users where active = true",
      options: { ...DEFAULT_SQL_OPTIONS, commaPosition: "before" },
    },
  },
];

export const GUID_EXAMPLES: ToolExample[] = [
  {
    name: "Ten random v4",
    blurb: "The everyday case — 122 bits of randomness each, from crypto.getRandomValues.",
    state: { version: "v4", count: 10, uppercase: false, braces: false, hyphens: true, namespace: "6ba7b810-9dad-11d1-80b4-00c04fd430c8", name: "" },
  },
  {
    name: "Sortable v7",
    blurb: "Timestamp-prefixed, so a batch sorts in the order it was generated — good as a database key.",
    state: { version: "v7", count: 10, uppercase: false, braces: false, hyphens: true, namespace: "6ba7b810-9dad-11d1-80b4-00c04fd430c8", name: "" },
  },
  {
    name: "Deterministic v5",
    blurb: "A hash of a namespace and a name, so the same input always gives the same UUID.",
    state: { version: "v5", count: 1, uppercase: false, braces: false, hyphens: true, namespace: "6ba7b810-9dad-11d1-80b4-00c04fd430c8", name: "example.com" },
  },
  {
    name: "Registry format",
    blurb: "Uppercase, braced, hyphenated — the shape Windows and .NET expect.",
    state: { version: "v4", count: 5, uppercase: true, braces: true, hyphens: true, namespace: "6ba7b810-9dad-11d1-80b4-00c04fd430c8", name: "" },
  },
];

export const PASSWORD_EXAMPLES: ToolExample[] = [
  {
    name: "Strong default",
    blurb: "24 characters from every set — comfortably past any offline brute force.",
    state: { length: 24, lower: true, upper: true, digits: true, symbols: true, custom: "", excludeAmbiguous: false, requireEachSet: true, count: 5 },
  },
  {
    name: "Read it aloud",
    blurb: "No symbols and no look-alikes, for a password someone has to type or dictate.",
    state: { length: 20, lower: true, upper: true, digits: true, symbols: false, custom: "", excludeAmbiguous: true, requireEachSet: true, count: 5 },
  },
  {
    name: "Maximum entropy",
    blurb: "128 characters from the full pool. Watch the entropy figure move as you shorten it.",
    state: { length: 128, lower: true, upper: true, digits: true, symbols: true, custom: "", excludeAmbiguous: false, requireEachSet: true, count: 1 },
  },
];

export const HASH_EXAMPLES: ToolExample[] = [
  {
    name: "Published test vector",
    blurb: "The classic pangram. Check the SHA-256 against any other implementation.",
    state: { input: "The quick brown fox jumps over the lazy dog", algorithm: "sha256", encoding: "hex", hmacKey: "", expected: "" },
  },
  {
    name: "HMAC with a key",
    blurb: "The same text keyed — an RFC 4231 style vector, which you can verify elsewhere.",
    state: { input: "The quick brown fox jumps over the lazy dog", algorithm: "sha256", encoding: "hex", hmacKey: "key", expected: "f7bc83f430538424b13298e6aa6fb143ef4d59a14946175997479dbc2d1a3cd8" },
  },
  {
    name: "Verify a checksum",
    blurb: "A digest already pasted into Compare, so you can see a match reported.",
    state: { input: "abc", algorithm: "md5", encoding: "hex", hmacKey: "", expected: "900150983cd24fb0d6963f7d28e17f72" },
  },
];

export const JWT_EXAMPLES: ToolExample[] = [
  {
    name: "Signed with 'secret'",
    blurb: "A demo token whose secret is the word secret — type it in to watch verification pass.",
    state: {
      token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkFkYSBMb3ZlbGFjZSIsImlhdCI6MTUxNjIzOTAyMiwiZXhwIjoxNTE2MjQyNjIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c",
      key: "",
    },
  },
  {
    name: "Expired token",
    blurb: "A past exp, so the claims table reports it expired rather than merely showing a date.",
    state: {
      token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhZGEiLCJpYXQiOjE1MTYyMzkwMjIsImV4cCI6MTUxNjI0MjYyMn0.7vJb0MvHXR3xVKZ1v9nZk9K5s0Xy2Q8Zx3wJ4nH5aQc",
      key: "",
    },
  },
  {
    name: "alg: none",
    blurb: "The classic forgery vector. This tool will never report it valid, whatever key you supply.",
    state: {
      token: "eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJzdWIiOiJhZG1pbiIsInJvbGUiOiJyb290In0.",
      key: "",
    },
  },
];

export const IP_EXAMPLES: ToolExample[] = [
  {
    name: "Private /24",
    blurb: "The most common home and office block, split into four /26 subnets.",
    state: { input: "192.168.1.10/24", family: "v4", splitPrefix: 26 },
  },
  {
    name: "Point-to-point /31",
    blurb: "RFC 3021. Two usable hosts and no broadcast — where most calculators report zero.",
    state: { input: "10.0.0.2/31", family: "v4", splitPrefix: 32 },
  },
  {
    name: "Dotted netmask",
    blurb: "Address plus mask instead of a prefix. The report should be identical to /16.",
    state: { input: "172.16.5.4 255.255.0.0", family: "v4", splitPrefix: 24 },
  },
  {
    name: "IPv6 /64",
    blurb: "Expansion, compression, and an address count too large for a JavaScript number.",
    state: { input: "2001:db8::1/64", family: "v6", splitPrefix: 26 },
  },
];

export const CURL_EXAMPLES: ToolExample[] = [
  {
    name: "POST with JSON",
    blurb: "Headers, a body and a bearer token, across line continuations.",
    state: {
      input: [
        "curl -X POST https://api.example.com/v1/orders \\",
        "  -H 'Content-Type: application/json' \\",
        "  -H 'Authorization: Bearer abc123' \\",
        "  --compressed \\",
        `  -d '{"sku":"A-1","quantity":2}'`,
      ].join("\n"),
      target: "fetch",
    },
  },
  {
    name: "Basic auth and cookies",
    blurb: "A -u credential and a cookie jar, both folded into headers in the output.",
    state: {
      input: "curl -u ada:lovelace --cookie 'session=abc; theme=dark' -L https://api.example.com/me",
      target: "python",
    },
  },
  {
    name: "Unsupported flags",
    blurb: "Includes flags this converter does not model, so you can see them listed rather than dropped.",
    state: {
      input: "curl --http3 --resolve api.example.com:443:1.2.3.4 -X GET https://api.example.com/health",
      target: "go",
    },
  },
];

export const HTTP_EXAMPLES: ToolExample[] = [
  {
    name: "Request with a JSON body",
    blurb: "Basic auth, cookies and a JSON payload — every panel populated at once.",
    state: {
      input: [
        "POST /v1/orders HTTP/1.1",
        "Host: api.example.com",
        "Content-Type: application/json; charset=utf-8",
        "Authorization: Basic YWRhOmxvdmVsYWNl",
        "Cookie: session=abc123; theme=dark",
        "Accept: application/json",
        "",
        '{"sku":"A-1","quantity":2,"gift":false}',
      ].join("\n"),
    },
  },
  {
    name: "Response with Set-Cookie",
    blurb: "A status line rather than a request line, and two Set-Cookie headers kept separate.",
    state: {
      input: [
        "HTTP/1.1 201 Created",
        "Content-Type: application/json",
        "Set-Cookie: session=xyz; HttpOnly; Secure; SameSite=Lax",
        "Set-Cookie: theme=dark; Path=/",
        "Location: /v1/orders/1042",
        "",
        '{"id":1042,"status":"created"}',
      ].join("\n"),
    },
  },
  {
    name: "Form-encoded body",
    blurb: "A urlencoded payload, rendered as decoded key and value lines.",
    state: {
      input: [
        "POST /login HTTP/1.1",
        "Host: example.com",
        "Content-Type: application/x-www-form-urlencoded",
        "",
        "username=ada&password=hunter+2&redirect=%2Fdashboard",
      ].join("\n"),
    },
  },
];

export const CRON_EXAMPLES: ToolExample[] = [
  {
    name: "Weekday mornings",
    blurb: "09:00 Monday to Friday — the schedule most jobs actually want.",
    state: { expression: "0 9 * * 1-5", zone: "UTC" },
  },
  {
    name: "Every fifteen minutes",
    blurb: "A step value. The next ten runs should sit exactly fifteen minutes apart.",
    state: { expression: "*/15 * * * *", zone: "UTC" },
  },
  {
    name: "With seconds",
    blurb: "Six fields instead of five, where the first is seconds.",
    state: { expression: "30 */5 * * * *", zone: "Europe/London" },
  },
  {
    name: "Across a DST change",
    blurb: "A New York schedule near the spring-forward date, where naive parsers repeat or skip a run.",
    state: { expression: "30 2 * * *", zone: "America/New_York" },
  },
];

export const SORTING_EXAMPLES: ToolExample[] = [
  {
    name: "Random shuffle",
    blurb: "The ordinary case. Try the same array under each algorithm and compare the counts.",
    state: { values: [5, 3, 8, 1, 9, 2, 7, 4], algorithm: "bubble", speed: 60 },
  },
  {
    name: "Already sorted",
    blurb: "Bubble and insertion finish in one pass; selection still does all the work anyway.",
    state: { values: [1, 2, 3, 4, 5, 6, 7, 8], algorithm: "bubble", speed: 60 },
  },
  {
    name: "Reversed — the worst case",
    blurb: "Every pair is out of order, which is where the quadratic sorts fall apart.",
    state: { values: [8, 7, 6, 5, 4, 3, 2, 1], algorithm: "insertion", speed: 70 },
  },
  {
    name: "Quicksort's bad pivot",
    blurb: "Sorted input with a last-element pivot degrades quicksort to O(n squared).",
    state: { values: [1, 2, 3, 4, 5, 6, 7, 8], algorithm: "quick", speed: 70 },
  },
];

export const BST_EXAMPLES: ToolExample[] = [
  {
    name: "Balanced tree",
    blurb: "Inserted middle-out, so every level fills before the next — lookup is logarithmic.",
    state: { values: [50, 30, 70, 20, 40, 60, 80], order: "in" },
  },
  {
    name: "Degenerate tree",
    blurb: "The same values inserted in sorted order. The tree becomes a linked list and lookup becomes linear.",
    state: { values: [20, 30, 40, 50, 60, 70, 80], order: "in" },
  },
  {
    name: "Traversal orders",
    blurb: "A small tree for comparing in-order, pre-order, post-order and level-order side by side.",
    state: { values: [8, 3, 10, 1, 6, 14, 4, 7, 13], order: "pre" },
  },
];
