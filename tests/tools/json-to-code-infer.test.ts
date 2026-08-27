import { describe, it, expect } from "vitest";
import { inferTypes, type InferOptions, type TypeModel } from "@/lib/tools/json-to-code/infer";

const DEFAULTS: InferOptions = { rootName: "Root", arrayUnification: "union" };
const infer = (value: unknown, patch: Partial<InferOptions> = {}) =>
  inferTypes(value, { ...DEFAULTS, ...patch });
const byName = (models: TypeModel[], name: string) => models.find((m) => m.name === name);

describe("inferTypes", () => {
  it("types each key of a flat object", () => {
    const [root] = infer({ s: "x", n: 1, b: true });
    expect(root!.name).toBe("Root");
    expect(root!.fields.map((f) => [f.key, f.type])).toEqual([
      ["s", { kind: "primitive", name: "string" }],
      ["n", { kind: "primitive", name: "number" }],
      ["b", { kind: "primitive", name: "boolean" }],
    ]);
  });

  it("promotes a nested object to its own PascalCase model", () => {
    const models = infer({ user: { id: 1 } });
    expect(models.map((m) => m.name)).toEqual(["Root", "User"]);
    expect(models[0]!.fields[0]!.type).toEqual({ kind: "object", ref: "User" });
  });

  it("unifies an array of objects into ONE model", () => {
    const models = infer({ users: [{ id: 1 }, { id: 2 }] });
    expect(models.filter((m) => m.name.startsWith("User"))).toHaveLength(1);
  });

  it("keeps an array of objects an ARRAY of that model, not a bare reference", () => {
    // Losing the array wrapper here emits `users: User` instead of `User[]`,
    // which compiles in every target language and is wrong in all of them.
    const [root] = infer({ users: [{ id: 1 }] });
    expect(root!.fields[0]!.type).toEqual({
      kind: "array",
      element: { kind: "object", ref: "User" },
    });
  });

  it("types an always-null field as nullable unknown, not as the null type", () => {
    // `bio: null` is a useless declaration. The sample tells us the key exists
    // and can be null; it tells us nothing about the type when it is not.
    const [root] = infer({ bio: null });
    expect(root!.fields[0]).toMatchObject({
      type: { kind: "primitive", name: "any" },
      nullable: true,
    });
  });

  it("marks a key missing from some elements as optional under union", () => {
    const models = infer({ users: [{ id: 1 }, { id: 2, nick: "z" }] });
    const user = byName(models, "User")!;
    expect(user.fields.find((f) => f.key === "nick")!.optional).toBe(true);
    expect(user.fields.find((f) => f.key === "id")!.optional).toBe(false);
  });

  it("inspects only the first element under first-element unification", () => {
    const models = infer({ users: [{ id: 1 }, { nick: "z" }] }, { arrayUnification: "first" });
    expect(byName(models, "User")!.fields.map((f) => f.key)).toEqual(["id"]);
  });

  it("marks a sometimes-null value nullable rather than any", () => {
    const models = infer({ users: [{ bio: null }, { bio: "hi" }] });
    const bio = byName(models, "User")!.fields[0]!;
    expect(bio.nullable).toBe(true);
    expect(bio.type).toEqual({ kind: "primitive", name: "string" });
  });

  it("unions mixed primitives in an array, deduplicated", () => {
    const [root] = infer({ mixed: [1, "a", 2, "b"] });
    expect(root!.fields[0]!.type).toEqual({
      kind: "array",
      element: { kind: "union", options: [
        { kind: "primitive", name: "number" },
        { kind: "primitive", name: "string" },
      ] },
    });
  });

  it("types an empty array's element as any", () => {
    const [root] = infer({ none: [] });
    expect(root!.fields[0]!.type).toEqual({ kind: "array", element: { kind: "primitive", name: "any" } });
  });

  it("keeps two identically shaped nested objects as separate models", () => {
    // Names come from keys. Deduplicating by shape would give one of them a
    // misleading name, which is worse than a little repetition.
    const models = infer({ home: { city: "a" }, work: { city: "b" } });
    expect(models.map((m) => m.name)).toEqual(["Root", "Home", "Work"]);
  });

  it("disambiguates a duplicate model name rather than overwriting", () => {
    const models = infer({ user: { id: 1 }, other: { user: { name: "x" } } });
    const names = models.map((m) => m.name);
    expect(new Set(names).size).toBe(names.length);
    expect(names).toContain("User2");
  });

  it("names the ELEMENT model when the root is an array of objects", () => {
    const models = infer([{ id: 1 }]);
    expect(models[0]!.name).toBe("Root");
    expect(models[0]!.fields.map((f) => f.key)).toEqual(["id"]);
  });
});
