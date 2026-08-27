import { describe, it, expect } from "vitest";
import { inferTypes } from "@/lib/tools/json-to-code/infer";
import { emitCode, LANGUAGES, type TargetLanguage } from "@/lib/tools/json-to-code/emit";

const models = (value: unknown) => inferTypes(value, { rootName: "Root", arrayUnification: "union" });
const emit = (value: unknown, language: TargetLanguage, optionalStyle: "optional" | "nullable" = "optional") =>
  emitCode(models(value), { language, optionalStyle });

describe("emitCode", () => {
  it("emits a TypeScript interface", () => {
    expect(emit({ id: 1 }, "typescript")).toBe("export interface Root {\n  id: number;\n}\n");
  });

  it("emits a C# class with PascalCase members", () => {
    const out = emit({ user_id: 1 }, "csharp");
    expect(out).toContain("public double UserId { get; set; }");
  });

  it("emits a Go struct with exported fields and json tags", () => {
    const out = emit({ user_id: 1 }, "go");
    expect(out).toContain("UserId float64 `json:\"user_id\"`");
  });

  it("emits Python dataclass members in snake_case", () => {
    expect(emit({ userId: 1 }, "python-dataclass")).toContain("user_id: float");
  });

  it("preserves the original key with a serialisation attribute where names differ", () => {
    expect(emit({ user_id: 1 }, "csharp")).toContain('[JsonPropertyName("user_id")]');
    expect(emit({ user_id: 1 }, "java")).toContain('@JsonProperty("user_id")');
    expect(emit({ userId: 1 }, "python-pydantic")).toContain('alias="userId"');
  });

  it("omits the attribute when the converted name already matches", () => {
    // Every line carrying a redundant attribute is noise. A key that is
    // already PascalCase needs none — but note `id` -> `Id` DOES differ, and
    // C# is case-sensitive by default, so that one keeps its attribute.
    expect(emit({ Name: "x" }, "csharp")).not.toContain("JsonPropertyName");
    expect(emit({ id: 1 }, "csharp")).toContain('[JsonPropertyName("id")]');
  });

  it("emits optional style as ? in TypeScript", () => {
    const out = emitCode(models({ a: [{ x: 1 }, {}] }), { language: "typescript", optionalStyle: "optional" });
    expect(out).toContain("x?: number;");
  });

  it("emits nullable style as a union in TypeScript", () => {
    const out = emitCode(models({ a: [{ x: 1 }, {}] }), { language: "typescript", optionalStyle: "nullable" });
    expect(out).toContain("x: number | null;");
  });

  it("emits each language's list type for an array field", () => {
    expect(emit({ xs: [1] }, "typescript")).toContain("xs: number[];");
    expect(emit({ xs: [1] }, "csharp")).toContain("List<double>");
    expect(emit({ xs: [1] }, "go")).toContain("[]float64");
    expect(emit({ xs: [1] }, "java")).toContain("List<Double>");
    expect(emit({ xs: [1] }, "python-dataclass")).toContain("list[float]");
    expect(emit({ xs: [1] }, "kotlin")).toContain("List<Double>");
  });

  it("emits a real union in TypeScript but a permissive type elsewhere", () => {
    expect(emit({ m: [1, "a"] }, "typescript")).toContain("(number | string)[]");
    expect(emit({ m: [1, "a"] }, "csharp")).toContain("List<object>");
    expect(emit({ m: [1, "a"] }, "go")).toContain("[]interface{}");
  });

  it("references a nested model by name", () => {
    expect(emit({ user: { id: 1 } }, "typescript")).toContain("user: User;");
  });

  it("emits every model, root first", () => {
    const out = emit({ user: { id: 1 } }, "typescript");
    expect(out.indexOf("interface Root")).toBeLessThan(out.indexOf("interface User"));
    expect(out).toContain("interface User");
  });

  it("converts a key that is not a valid identifier and keeps its attribute", () => {
    const out = emit({ "my-key": 1 }, "csharp");
    expect(out).toContain("MyKey");
    expect(out).toContain('[JsonPropertyName("my-key")]');
  });

  it("quotes an awkward key directly in TypeScript, which needs no attribute", () => {
    expect(emit({ "my-key": 1 }, "typescript")).toContain('"my-key": number;');
  });

  it("ends with exactly one trailing newline in every language", () => {
    for (const { value } of LANGUAGES) {
      const out = emit({ id: 1 }, value);
      expect(out.endsWith("\n"), value).toBe(true);
      expect(out.endsWith("\n\n"), value).toBe(false);
    }
  });

  it("offers all seven languages the spec names", () => {
    expect(LANGUAGES.map((l) => l.value).sort()).toEqual([
      "csharp", "go", "java", "kotlin", "python-dataclass", "python-pydantic", "typescript",
    ]);
  });
});
