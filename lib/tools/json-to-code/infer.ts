export type PrimitiveName = "string" | "number" | "boolean" | "null" | "any";

export type TypeNode =
  | { kind: "primitive"; name: PrimitiveName }
  | { kind: "array"; element: TypeNode }
  | { kind: "object"; ref: string }
  | { kind: "union"; options: TypeNode[] };

export interface TypeField {
  key: string;
  type: TypeNode;
  /** Absent from some samples. Distinct from nullable. */
  optional: boolean;
  /** Present but null in some samples. */
  nullable: boolean;
}

export interface TypeModel {
  name: string;
  fields: TypeField[];
}

export interface InferOptions {
  rootName: string;
  /** "union" inspects every element; "first" trusts element zero. */
  arrayUnification: "union" | "first";
}

function pascalCase(key: string): string {
  const parts = key.split(/[^A-Za-z0-9]+/).filter(Boolean);
  const joined = parts.map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join("");
  return /^[A-Za-z]/.test(joined) ? joined : `Type${joined}`;
}

/** Trailing "s" only — enough to turn `users` into `User` without a lexicon. */
function singular(name: string): string {
  return name.length > 1 && name.endsWith("s") && !name.endsWith("ss") ? name.slice(0, -1) : name;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function primitiveOf(value: unknown): PrimitiveName {
  if (value === null) return "null";
  if (typeof value === "string") return "string";
  if (typeof value === "number") return "number";
  if (typeof value === "boolean") return "boolean";
  return "any";
}

function sameNode(a: TypeNode, b: TypeNode): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/** Collapses samples into one node, folding duplicates into a single union. */
function unify(nodes: TypeNode[]): TypeNode {
  const unique: TypeNode[] = [];
  for (const node of nodes) if (!unique.some((u) => sameNode(u, node))) unique.push(node);
  if (unique.length === 0) return { kind: "primitive", name: "any" };
  if (unique.length === 1) return unique[0]!;
  return { kind: "union", options: unique };
}

export function inferTypes(value: unknown, options: InferOptions): TypeModel[] {
  const models: TypeModel[] = [];
  const taken = new Set<string>();

  function claimName(base: string): string {
    const wanted = pascalCase(singular(base)) || "Type";
    if (!taken.has(wanted)) { taken.add(wanted); return wanted; }
    // A second `User` becomes `User2`. Silently overwriting the first would
    // emit one model for two genuinely different shapes.
    let n = 2;
    while (taken.has(`${wanted}${n}`)) n += 1;
    taken.add(`${wanted}${n}`);
    return `${wanted}${n}`;
  }

  /** Builds a model from one or more object samples and returns its name. */
  function modelFrom(samples: Record<string, unknown>[], name: string): string {
    const model: TypeModel = { name, fields: [] };
    // Reserve the slot before recursing so nested models append after this one.
    models.push(model);

    const keys: string[] = [];
    for (const sample of samples) {
      for (const key of Object.keys(sample)) if (!keys.includes(key)) keys.push(key);
    }

    for (const key of keys) {
      const present = samples.filter((s) => Object.prototype.hasOwnProperty.call(s, key));
      const values = present.map((s) => s[key]);
      const nonNull = values.filter((v) => v !== null);

      model.fields.push({
        key,
        // A key that is null in every sample tells us it exists and can be
        // null, and nothing else — so it is nullable-unknown, not "the null
        // type", which would emit a useless declaration.
        type: nonNull.length === 0
          ? { kind: "primitive", name: "any" }
          : unify(nonNull.map((v) => nodeFor(v, key))),
        optional: present.length < samples.length,
        nullable: values.some((v) => v === null),
      });
    }

    return name;
  }

  function nodeFor(value: unknown, key: string): TypeNode {
    if (Array.isArray(value)) {
      const elements = options.arrayUnification === "first" ? value.slice(0, 1) : value;
      const objects = elements.filter(isPlainObject);
      if (objects.length > 0 && objects.length === elements.length) {
        // An ARRAY of that model. Returning the bare reference here would emit
        // `users: User` rather than `User[]` in every target language.
        return { kind: "array", element: { kind: "object", ref: modelFrom(objects, claimName(key)) } };
      }
      if (elements.length === 0) return { kind: "array", element: { kind: "primitive", name: "any" } };
      return { kind: "array", element: unify(elements.map((e) => nodeFor(e, key))) };
    }
    if (isPlainObject(value)) return { kind: "object", ref: modelFrom([value], claimName(key)) };
    return { kind: "primitive", name: primitiveOf(value) };
  }

  // The root is special: an array of objects means the ELEMENT is what the
  // user wants named, not a wrapper around it.
  if (Array.isArray(value)) {
    const objects = value.filter(isPlainObject);
    const samples = options.arrayUnification === "first" ? objects.slice(0, 1) : objects;
    if (samples.length > 0) modelFrom(samples, claimName(options.rootName));
    else modelFrom([], claimName(options.rootName));
  } else if (isPlainObject(value)) {
    modelFrom([value], claimName(options.rootName));
  } else {
    modelFrom([], claimName(options.rootName));
  }

  return models;
}
