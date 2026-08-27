import { describe, it, expect } from "vitest";
import { inspectHttp } from "@/lib/tools/http-inspect";

const analyse = (text: string) => {
  const r = inspectHttp(text);
  if (!r.ok) throw new Error(r.error.message);
  return r.value;
};

const REQUEST = [
  "POST /v1/orders HTTP/1.1",
  "Host: api.example.com",
  "Content-Type: application/json; charset=utf-8",
  "Authorization: Basic dXNlcjpwYXNz",
  "Cookie: a=1; b=2",
  "",
  '{"sku":"A-1","quantity":2}',
].join("\r\n");

describe("inspectHttp", () => {
  it("detects a request and reads its start line", () => {
    const out = analyse(REQUEST);
    expect(out.message).toMatchObject({
      kind: "request", method: "POST", target: "/v1/orders", version: "HTTP/1.1",
    });
  });

  it("detects a response and reads its status", () => {
    const out = analyse("HTTP/1.1 404 Not Found\r\nServer: nginx\r\n\r\n");
    expect(out.message).toMatchObject({ kind: "response", status: 404, reason: "Not Found" });
  });

  it("parses headers into trimmed pairs", () => {
    expect(analyse(REQUEST).message.headers).toContainEqual(["Host", "api.example.com"]);
  });

  it("handles LF-only line endings, which pasted text usually has", () => {
    const lf = REQUEST.replace(/\r\n/g, "\n");
    expect(analyse(lf).message.headers.length).toBe(analyse(REQUEST).message.headers.length);
    expect(analyse(lf).message.body).toBe(analyse(REQUEST).message.body);
  });

  it("separates the body at the first blank line", () => {
    expect(analyse(REQUEST).message.body).toBe('{"sku":"A-1","quantity":2}');
  });

  it("reports an empty body as empty, not missing", () => {
    const out = analyse("GET / HTTP/1.1\r\nHost: x\r\n\r\n");
    expect(out.message.body).toBe("");
    expect(out.message.bodyBytes).toBe(0);
  });

  it("counts body size in UTF-8 bytes, not characters", () => {
    const out = analyse("POST / HTTP/1.1\r\nHost: x\r\n\r\ncafé");
    expect(out.message.body).toBe("café");
    expect(out.message.bodyBytes).toBe(5);
  });

  it("pretty-prints a JSON body", () => {
    expect(analyse(REQUEST).prettyBody).toBe('{\n  "sku": "A-1",\n  "quantity": 2\n}');
  });

  it("leaves prettyBody null for an invalid JSON body rather than failing the parse", () => {
    const out = analyse("POST / HTTP/1.1\r\nContent-Type: application/json\r\n\r\n{broken");
    expect(out.prettyBody).toBeNull();
    expect(out.message.body).toBe("{broken");
  });

  it("renders a form-urlencoded body as decoded pairs", () => {
    const out = analyse("POST / HTTP/1.1\r\nContent-Type: application/x-www-form-urlencoded\r\n\r\na=1&b=hello+world");
    expect(out.prettyBody).toBe("a = 1\nb = hello world");
  });

  it("parses Content-Type into a type and its parameters", () => {
    expect(analyse(REQUEST).contentType).toEqual({
      type: "application/json", params: [["charset", "utf-8"]],
    });
  });

  it("decodes Basic authorization", () => {
    expect(analyse(REQUEST).authorization).toEqual({ scheme: "Basic", detail: "user:pass" });
  });

  it("summarises a Bearer JWT rather than echoing the raw token", () => {
    const header = Buffer.from(JSON.stringify({ alg: "HS256" })).toString("base64url");
    const payload = Buffer.from(JSON.stringify({ sub: "ada" })).toString("base64url");
    const out = analyse(`GET / HTTP/1.1\r\nAuthorization: Bearer ${header}.${payload}.sig\r\n\r\n`);
    expect(out.authorization!.scheme).toBe("Bearer");
    expect(out.authorization!.detail).toContain("HS256");
    expect(out.authorization!.detail).toContain("ada");
  });

  it("splits Cookie into pairs", () => {
    expect(analyse(REQUEST).cookies).toEqual([["a", "1"], ["b", "2"]]);
  });

  it("retains every Set-Cookie header", () => {
    const out = analyse("HTTP/1.1 200 OK\r\nSet-Cookie: a=1\r\nSet-Cookie: b=2\r\n\r\n");
    expect(out.setCookies).toHaveLength(2);
  });

  it("matches header names case-insensitively", () => {
    const out = analyse("POST / HTTP/1.1\r\ncontent-type: application/json\r\n\r\n{\"a\":1}");
    expect(out.contentType?.type).toBe("application/json");
  });

  it("rejects text with no recognisable start line", () => {
    expect(inspectHttp("just some words\r\n\r\n").ok).toBe(false);
    expect(inspectHttp("").ok).toBe(false);
  });
});
