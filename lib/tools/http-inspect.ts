import { err, ok, type ToolResult } from "@/lib/types";

export interface HttpMessage {
  kind: "request" | "response";
  startLine: string;
  method?: string;
  target?: string;
  version: string;
  status?: number;
  reason?: string;
  headers: [string, string][];
  body: string;
  /** UTF-8 bytes, not characters — what Content-Length would report. */
  bodyBytes: number;
}

export interface HttpAnalysis {
  message: HttpMessage;
  contentType: { type: string; params: [string, string][] } | null;
  /** Pretty-printed body, or null when the body is not a format we render. */
  prettyBody: string | null;
  authorization: { scheme: string; detail: string } | null;
  cookies: [string, string][];
  setCookies: string[];
}

const REQUEST_LINE = /^([A-Z]+)\s+(\S+)\s+(HTTP\/\d(?:\.\d)?)$/;
const RESPONSE_LINE = /^(HTTP\/\d(?:\.\d)?)\s+(\d{3})(?:\s+(.*))?$/;

function headerValue(headers: [string, string][], name: string): string | null {
  const wanted = name.toLowerCase();
  // Case-insensitive: HTTP header names are, and pasted text is inconsistent.
  return headers.find(([key]) => key.toLowerCase() === wanted)?.[1] ?? null;
}

function parseContentType(raw: string | null): HttpAnalysis["contentType"] {
  if (!raw) return null;
  const [type, ...rest] = raw.split(";");
  const params: [string, string][] = [];
  for (const part of rest) {
    const at = part.indexOf("=");
    if (at > 0) params.push([part.slice(0, at).trim(), part.slice(at + 1).trim().replace(/^"|"$/g, "")]);
  }
  return { type: (type ?? "").trim(), params };
}

function decodeBase64(text: string): string | null {
  try {
    const binary = atob(text);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return null;
  }
}

function summariseJwt(token: string): string | null {
  const segments = token.split(".");
  if (segments.length !== 3) return null;
  try {
    const decode = (segment: string) => {
      const padded = segment.replace(/-/g, "+").replace(/_/g, "/")
        .padEnd(segment.length + ((4 - (segment.length % 4)) % 4), "=");
      return JSON.parse(atob(padded)) as Record<string, unknown>;
    };
    const header = decode(segments[0]!);
    const payload = decode(segments[1]!);
    const parts = [`alg ${String(header.alg ?? "?")}`];
    if (payload.sub !== undefined) parts.push(`sub ${String(payload.sub)}`);
    if (payload.exp !== undefined) parts.push(`exp ${new Date(Number(payload.exp) * 1000).toISOString()}`);
    return parts.join(", ");
  } catch {
    return null;
  }
}

function parseAuthorization(raw: string | null): HttpAnalysis["authorization"] {
  if (!raw) return null;
  const at = raw.indexOf(" ");
  if (at === -1) return { scheme: raw, detail: "" };
  const scheme = raw.slice(0, at);
  const credentials = raw.slice(at + 1).trim();

  if (scheme.toLowerCase() === "basic") {
    const decoded = decodeBase64(credentials);
    return { scheme: "Basic", detail: decoded ?? "(not valid base64)" };
  }
  if (scheme.toLowerCase() === "bearer") {
    // Summarised, not echoed: printing the raw token helps nobody read it.
    const summary = summariseJwt(credentials);
    return { scheme: "Bearer", detail: summary ?? "opaque token" };
  }
  return { scheme, detail: credentials };
}

function prettyPrint(body: string, contentType: HttpAnalysis["contentType"]): string | null {
  if (!body.trim()) return null;
  const type = contentType?.type.toLowerCase() ?? "";

  if (type.includes("x-www-form-urlencoded")) {
    return body.split("&").map((pair) => {
      const at = pair.indexOf("=");
      const key = at === -1 ? pair : pair.slice(0, at);
      const value = at === -1 ? "" : pair.slice(at + 1);
      const decode = (text: string) => {
        try { return decodeURIComponent(text.replace(/\+/g, " ")); } catch { return text; }
      };
      return `${decode(key)} = ${decode(value)}`;
    }).join("\n");
  }

  // Try JSON whether or not the header claims it — bodies are often untyped.
  try {
    return JSON.stringify(JSON.parse(body) as unknown, null, 2);
  } catch {
    return null;
  }
}

export function inspectHttp(text: string): ToolResult<HttpAnalysis> {
  const trimmed = text.replace(/^﻿/, "").trimStart();
  if (!trimmed) return err("Paste a raw HTTP request or response.");

  // Normalise CRLF to LF first: pasted text loses carriage returns constantly,
  // and the parser should not care which it got.
  const normalised = trimmed.replace(/\r\n/g, "\n");
  const separator = normalised.indexOf("\n\n");
  const head = separator === -1 ? normalised : normalised.slice(0, separator);
  const body = separator === -1 ? "" : normalised.slice(separator + 2);

  const lines = head.split("\n");
  const startLine = (lines[0] ?? "").trim();

  const asRequest = REQUEST_LINE.exec(startLine);
  const asResponse = RESPONSE_LINE.exec(startLine);
  if (!asRequest && !asResponse) {
    return err("That first line is neither a request line nor a status line.");
  }

  const headers: [string, string][] = [];
  for (const line of lines.slice(1)) {
    if (!line.trim()) continue;
    const at = line.indexOf(":");
    if (at > 0) headers.push([line.slice(0, at).trim(), line.slice(at + 1).trim()]);
  }

  const message: HttpMessage = asRequest
    ? {
      kind: "request", startLine, headers, body,
      method: asRequest[1]!, target: asRequest[2]!, version: asRequest[3]!,
      bodyBytes: new TextEncoder().encode(body).length,
    }
    : {
      kind: "response", startLine, headers, body,
      version: asResponse![1]!, status: Number(asResponse![2]!),
      ...(asResponse![3] !== undefined ? { reason: asResponse![3].trim() } : {}),
      bodyBytes: new TextEncoder().encode(body).length,
    };

  const contentType = parseContentType(headerValue(headers, "content-type"));
  const cookies: [string, string][] = [];
  for (const pair of (headerValue(headers, "cookie") ?? "").split(";")) {
    const at = pair.indexOf("=");
    if (at > 0) cookies.push([pair.slice(0, at).trim(), pair.slice(at + 1).trim()]);
  }

  return ok({
    message,
    contentType,
    prettyBody: prettyPrint(body, contentType),
    authorization: parseAuthorization(headerValue(headers, "authorization")),
    cookies,
    setCookies: headers.filter(([k]) => k.toLowerCase() === "set-cookie").map(([, v]) => v),
  });
}
