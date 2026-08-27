import { describe, it, expect } from "vitest";
import { parseCurl, emitRequest, CURL_TARGETS, type RequestModel } from "@/lib/tools/curl";

const parse = (command: string) => {
  const r = parseCurl(command);
  if (!r.ok) throw new Error(r.error.message);
  return r.value;
};
const model = (command: string): RequestModel => parse(command).request;

describe("parseCurl", () => {
  it("reads a bare GET", () => {
    expect(model("curl https://x.test/a")).toMatchObject({
      method: "GET", url: "https://x.test/a", body: null,
    });
  });

  it("honours an explicit -X", () => {
    expect(model("curl -X DELETE https://x.test").method).toBe("DELETE");
  });

  it("implies POST when a body is given without -X, as curl itself does", () => {
    expect(model("curl -d 'a=1' https://x.test").method).toBe("POST");
  });

  it("lets -X win over the implied POST", () => {
    expect(model("curl -X PUT -d 'a=1' https://x.test").method).toBe("PUT");
  });

  it("parses headers in both quoting styles", () => {
    expect(model(`curl -H 'A: b' -H "C: d" https://x.test`).headers)
      .toEqual([["A", "b"], ["C", "d"]]);
  });

  it("splits a header on the FIRST colon only", () => {
    // A Referer or a Host:port value contains colons that are not separators.
    expect(model(`curl -H 'X-Origin: https://a.test:8443/x' https://x.test`).headers)
      .toEqual([["X-Origin", "https://a.test:8443/x"]]);
  });

  it("treats --data, --data-raw and -d alike, and marks --data-urlencode", () => {
    expect(model("curl --data 'a=1' https://x.test").body).toBe("a=1");
    expect(model("curl --data-raw 'a=1' https://x.test").bodyKind).toBe("raw");
    expect(model("curl --data-urlencode 'a=b c' https://x.test").bodyKind).toBe("urlencoded");
  });

  it("marks -F as a form body", () => {
    expect(model("curl -F a=b https://x.test").bodyKind).toBe("form");
  });

  it("parses -u, preserving a colon inside the password", () => {
    expect(model("curl -u 'ada:pa:ss' https://x.test").auth).toEqual({ user: "ada", password: "pa:ss" });
  });

  it("joins line continuations before parsing", () => {
    const command = "curl https://x.test \\\n  -H 'A: b' \\\n  -d 'x=1'";
    expect(model(command)).toMatchObject({ method: "POST", body: "x=1" });
  });

  it("handles a quoted string containing the other quote character", () => {
    expect(model(`curl -d '{"a":"b"}' https://x.test`).body).toBe('{"a":"b"}');
    expect(model(`curl -d "it's fine" https://x.test`).body).toBe("it's fine");
  });

  it("records the boolean flags", () => {
    const m = model("curl --compressed -k -L --cookie 'a=1' https://x.test");
    expect(m).toMatchObject({ compressed: true, insecure: true, followRedirects: true });
    expect(m.cookies).toEqual([["a", "1"]]);
  });

  it("lists an unrecognised flag instead of dropping it silently", () => {
    const out = parse("curl --http3 --resolve a:1:2 https://x.test");
    expect(out.unsupported).toContain("--http3");
    expect(out.unsupported).toContain("--resolve");
    expect(out.request.url).toBe("https://x.test");
  });

  it("rejects a command that is not curl", () => {
    expect(parseCurl("wget https://x.test").ok).toBe(false);
    expect(parseCurl("").ok).toBe(false);
  });

  it("rejects a curl command with no URL", () => {
    expect(parseCurl("curl -X GET").ok).toBe(false);
  });
});

describe("emitRequest", () => {
  const m = model(`curl -X POST -H 'Content-Type: application/json' -d '{"a":1}' https://x.test/v1`);

  it("emits every target with the method, url, header and body", () => {
    for (const target of CURL_TARGETS) {
      const out = emitRequest(m, target.value);
      expect(out, target.value).toContain("https://x.test/v1");
      expect(out.toLowerCase(), target.value).toContain("post");
      expect(out, target.value).toContain("Content-Type");
      expect(out, target.value).toContain("a");
    }
  });

  it("offers the six targets the spec names", () => {
    expect(CURL_TARGETS.map((t) => t.value).sort())
      .toEqual(["axios", "csharp", "fetch", "go", "powershell", "python"]);
  });

  it("escapes a quote inside a body rather than breaking the literal", () => {
    const quoted = model(`curl -d 'say "hi"' https://x.test`);
    const out = emitRequest(quoted, "fetch");
    expect(out).toContain('\\"');
  });

  it("emits basic auth where one was given", () => {
    const authed = model("curl -u ada:secret https://x.test");
    expect(emitRequest(authed, "python")).toContain("ada");
  });
});
