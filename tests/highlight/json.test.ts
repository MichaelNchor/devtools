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
