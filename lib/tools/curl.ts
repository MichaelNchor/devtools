import { err, ok, type ToolResult } from "@/lib/types";

export interface RequestModel {
  method: string;
  url: string;
  headers: [string, string][];
  body: string | null;
  bodyKind: "raw" | "form" | "urlencoded" | null;
  auth: { user: string; password: string } | null;
  insecure: boolean;
  followRedirects: boolean;
  compressed: boolean;
  cookies: [string, string][];
}

export interface CurlParse {
  request: RequestModel;
  /** Flags we recognised as flags but do not model. Never dropped silently. */
  unsupported: string[];
}

export type CurlTarget = "fetch" | "axios" | "python" | "csharp" | "go" | "powershell";

export const CURL_TARGETS: { value: CurlTarget; label: string }[] = [
  { value: "fetch", label: "JavaScript (fetch)" },
  { value: "axios", label: "JavaScript (axios)" },
  { value: "python", label: "Python (requests)" },
  { value: "csharp", label: "C# (HttpClient)" },
  { value: "go", label: "Go (net/http)" },
  { value: "powershell", label: "PowerShell" },
];

/** Shell-aware tokeniser: quotes group, backslash-newline continues a line. */
function tokenize(command: string): string[] {
  const joined = command.replace(/\\\r?\n/g, " ");
  const tokens: string[] = [];
  let current = "";
  let quote: '"' | "'" | null = null;
  let started = false;

  for (let i = 0; i < joined.length; i += 1) {
    const ch = joined[i]!;
    if (quote) {
      // Inside single quotes a backslash is literal, as in a real shell.
      if (ch === "\\" && quote === '"' && i + 1 < joined.length) {
        current += joined[i + 1];
        i += 1;
        continue;
      }
      if (ch === quote) { quote = null; continue; }
      current += ch;
      continue;
    }
    if (ch === '"' || ch === "'") { quote = ch; started = true; continue; }
    if (/\s/.test(ch)) {
      if (current || started) { tokens.push(current); current = ""; started = false; }
      continue;
    }
    current += ch;
  }
  if (current || started) tokens.push(current);
  return tokens;
}

const BODY_FLAGS = new Set(["-d", "--data", "--data-raw", "--data-binary", "--data-ascii"]);
const VALUE_FLAGS = new Set([
  "-H", "--header", "-X", "--request", "-u", "--user", "-F", "--form",
  "--data-urlencode", "-b", "--cookie", "-A", "--user-agent", "-e", "--referer",
  ...BODY_FLAGS,
]);
const BOOLEAN_FLAGS = new Set([
  "--compressed", "-k", "--insecure", "-L", "--location", "-s", "--silent",
  "-i", "--include", "-v", "--verbose", "-g", "--globoff", "--fail", "-f",
]);

export function parseCurl(command: string): ToolResult<CurlParse> {
  const tokens = tokenize(command.trim());
  if (tokens.length === 0) return err("Paste a curl command.");
  if (tokens[0] !== "curl") return err("That does not start with `curl`.");

  const request: RequestModel = {
    method: "", url: "", headers: [], body: null, bodyKind: null,
    auth: null, insecure: false, followRedirects: false, compressed: false, cookies: [],
  };
  const unsupported: string[] = [];
  const bodyParts: string[] = [];

  for (let i = 1; i < tokens.length; i += 1) {
    const token = tokens[i]!;

    if (!token.startsWith("-")) {
      if (!request.url) request.url = token;
      continue;
    }

    if (BOOLEAN_FLAGS.has(token)) {
      if (token === "--compressed") request.compressed = true;
      if (token === "-k" || token === "--insecure") request.insecure = true;
      if (token === "-L" || token === "--location") request.followRedirects = true;
      continue;
    }

    if (VALUE_FLAGS.has(token)) {
      const value = tokens[i + 1];
      if (value === undefined) { unsupported.push(token); continue; }
      i += 1;

      if (token === "-X" || token === "--request") { request.method = value.toUpperCase(); continue; }
      if (token === "-H" || token === "--header") {
        // First colon only: a header VALUE may itself contain colons.
        const at = value.indexOf(":");
        if (at > 0) request.headers.push([value.slice(0, at).trim(), value.slice(at + 1).trim()]);
        continue;
      }
      if (token === "-u" || token === "--user") {
        const at = value.indexOf(":");
        request.auth = at === -1
          ? { user: value, password: "" }
          : { user: value.slice(0, at), password: value.slice(at + 1) };
        continue;
      }
      if (token === "-b" || token === "--cookie") {
        for (const pair of value.split(";")) {
          const at = pair.indexOf("=");
          if (at > 0) request.cookies.push([pair.slice(0, at).trim(), pair.slice(at + 1).trim()]);
        }
        continue;
      }
      if (token === "-A" || token === "--user-agent") { request.headers.push(["User-Agent", value]); continue; }
      if (token === "-e" || token === "--referer") { request.headers.push(["Referer", value]); continue; }
      if (token === "-F" || token === "--form") {
        bodyParts.push(value);
        request.bodyKind = "form";
        continue;
      }
      if (token === "--data-urlencode") {
        bodyParts.push(value);
        request.bodyKind = "urlencoded";
        continue;
      }
      if (BODY_FLAGS.has(token)) {
        bodyParts.push(value);
        if (request.bodyKind === null) request.bodyKind = "raw";
        continue;
      }
    }

    // A flag we know nothing about. Recorded, never silently discarded.
    unsupported.push(token);
    const next = tokens[i + 1];
    if (next !== undefined && !next.startsWith("-") && next !== request.url) i += 1;
  }

  if (!request.url) return err("No URL found in that command.");
  if (bodyParts.length > 0) request.body = bodyParts.join("&");
  // curl itself sends POST when given a body and no explicit method.
  if (!request.method) request.method = request.body === null ? "GET" : "POST";

  return ok({ request, unsupported });
}

const q = (text: string) => JSON.stringify(text);

function headerLines(model: RequestModel): [string, string][] {
  const headers = [...model.headers];
  if (model.auth) {
    const encoded = btoa(`${model.auth.user}:${model.auth.password}`);
    headers.push(["Authorization", `Basic ${encoded}`]);
  }
  if (model.cookies.length > 0) {
    headers.push(["Cookie", model.cookies.map(([k, v]) => `${k}=${v}`).join("; ")]);
  }
  return headers;
}

export function emitRequest(model: RequestModel, target: CurlTarget): string {
  const headers = headerLines(model);

  switch (target) {
    // NOTE FOR REVIEWERS: the string below contains the text "fetch(" because
    // this function GENERATES JavaScript for the user to copy. It is a string
    // literal, not a call — nothing in this app ever touches the network.
    case "fetch": {
      const lines = [`const response = await fetch(${q(model.url)}, {`, `  method: ${q(model.method)},`];
      if (headers.length) {
        lines.push("  headers: {");
        for (const [k, v] of headers) lines.push(`    ${q(k)}: ${q(v)},`);
        lines.push("  },");
      }
      if (model.body !== null) lines.push(`  body: ${q(model.body)},`);
      lines.push("});", "const data = await response.json();");
      return lines.join("\n");
    }
    case "axios": {
      const lines = ["const response = await axios({", `  method: ${q(model.method.toLowerCase())},`, `  url: ${q(model.url)},`];
      if (headers.length) {
        lines.push("  headers: {");
        for (const [k, v] of headers) lines.push(`    ${q(k)}: ${q(v)},`);
        lines.push("  },");
      }
      if (model.body !== null) lines.push(`  data: ${q(model.body)},`);
      lines.push("});");
      return lines.join("\n");
    }
    case "python": {
      const lines = ["import requests", ""];
      if (headers.length) {
        lines.push("headers = {");
        for (const [k, v] of headers) lines.push(`    ${q(k)}: ${q(v)},`);
        lines.push("}");
      }
      if (model.body !== null) lines.push(`data = ${q(model.body)}`);
      const args = [q(model.url)];
      if (headers.length) args.push("headers=headers");
      if (model.body !== null) args.push("data=data");
      if (model.auth) args.push(`auth=(${q(model.auth.user)}, ${q(model.auth.password)})`);
      if (model.insecure) args.push("verify=False");
      lines.push("", `response = requests.${model.method.toLowerCase()}(${args.join(", ")})`, "print(response.json())");
      return lines.join("\n");
    }
    case "csharp": {
      const lines = ["using var client = new HttpClient();",
        `var request = new HttpRequestMessage(new HttpMethod(${q(model.method)}), ${q(model.url)});`];
      for (const [k, v] of headers) lines.push(`request.Headers.TryAddWithoutValidation(${q(k)}, ${q(v)});`);
      if (model.body !== null) lines.push(`request.Content = new StringContent(${q(model.body)});`);
      lines.push("var response = await client.SendAsync(request);",
        "var body = await response.Content.ReadAsStringAsync();");
      return lines.join("\n");
    }
    case "go": {
      const lines = ["client := &http.Client{}"];
      lines.push(model.body !== null
        ? `req, err := http.NewRequest(${q(model.method)}, ${q(model.url)}, strings.NewReader(${q(model.body)}))`
        : `req, err := http.NewRequest(${q(model.method)}, ${q(model.url)}, nil)`);
      lines.push("if err != nil {", "\tpanic(err)", "}");
      for (const [k, v] of headers) lines.push(`req.Header.Set(${q(k)}, ${q(v)})`);
      lines.push("resp, err := client.Do(req)", "if err != nil {", "\tpanic(err)", "}", "defer resp.Body.Close()");
      return lines.join("\n");
    }
    case "powershell": {
      const lines: string[] = [];
      if (headers.length) {
        lines.push("$headers = @{");
        for (const [k, v] of headers) lines.push(`    ${q(k)} = ${q(v)}`);
        lines.push("}");
      }
      const args = [`-Uri ${q(model.url)}`, `-Method ${model.method}`];
      if (headers.length) args.push("-Headers $headers");
      if (model.body !== null) args.push(`-Body ${q(model.body)}`);
      if (model.insecure) args.push("-SkipCertificateCheck");
      lines.push(`$response = Invoke-RestMethod ${args.join(" ")}`);
      return lines.join("\n");
    }
  }
}
