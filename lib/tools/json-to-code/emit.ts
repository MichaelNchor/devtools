import type { TypeField, TypeModel, TypeNode } from "./infer";

export type TargetLanguage =
  | "typescript" | "csharp" | "go" | "java"
  | "python-dataclass" | "python-pydantic" | "kotlin";

export const LANGUAGES: { value: TargetLanguage; label: string }[] = [
  { value: "typescript", label: "TypeScript" },
  { value: "csharp", label: "C#" },
  { value: "go", label: "Go" },
  { value: "java", label: "Java" },
  { value: "python-dataclass", label: "Python (dataclass)" },
  { value: "python-pydantic", label: "Python (Pydantic)" },
  { value: "kotlin", label: "Kotlin" },
];

export interface EmitOptions {
  language: TargetLanguage;
  /** How a sometimes-absent field is expressed. */
  optionalStyle: "optional" | "nullable";
}

const IDENTIFIER = /^[A-Za-z_][A-Za-z0-9_]*$/;

function words(key: string): string[] {
  return key
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean);
}

function pascal(key: string): string {
  const out = words(key).map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join("");
  return IDENTIFIER.test(out) ? out : `Field${out}`;
}

function camel(key: string): string {
  const p = pascal(key);
  return p.charAt(0).toLowerCase() + p.slice(1);
}

function snake(key: string): string {
  const out = words(key).map((w) => w.toLowerCase()).join("_");
  return IDENTIFIER.test(out) ? out : `field_${out}`;
}

/** Per-language primitive names, plus the type used where unions are absent. */
const PRIMITIVES: Record<TargetLanguage, Record<string, string>> = {
  typescript: { string: "string", number: "number", boolean: "boolean", null: "null", any: "unknown", mixed: "unknown" },
  csharp: { string: "string", number: "double", boolean: "bool", null: "object", any: "object", mixed: "object" },
  go: { string: "string", number: "float64", boolean: "bool", null: "interface{}", any: "interface{}", mixed: "interface{}" },
  java: { string: "String", number: "Double", boolean: "Boolean", null: "Object", any: "Object", mixed: "Object" },
  "python-dataclass": { string: "str", number: "float", boolean: "bool", null: "None", any: "Any", mixed: "Any" },
  "python-pydantic": { string: "str", number: "float", boolean: "bool", null: "None", any: "Any", mixed: "Any" },
  kotlin: { string: "String", number: "Double", boolean: "Boolean", null: "Any?", any: "Any", mixed: "Any" },
};

function listType(language: TargetLanguage, element: string): string {
  switch (language) {
    case "typescript": return element.includes("|") ? `(${element})[]` : `${element}[]`;
    case "go": return `[]${element}`;
    case "python-dataclass": return `list[${element}]`;
    case "python-pydantic": return `List[${element}]`;
    default: return `List<${element}>`;
  }
}

function renderType(node: TypeNode, language: TargetLanguage): string {
  const prims = PRIMITIVES[language];
  switch (node.kind) {
    case "primitive": return prims[node.name] ?? prims.any!;
    case "object": return node.ref;
    case "array": return listType(language, renderType(node.element, language));
    case "union":
      // Only TypeScript has real unions; everything else degrades to its
      // permissive type rather than inventing one.
      return language === "typescript"
        ? node.options.map((o) => renderType(o, language)).join(" | ")
        : prims.mixed!;
  }
}

/** The member name in the target language, and whether it changed. */
function memberName(key: string, language: TargetLanguage): string {
  switch (language) {
    case "csharp": case "go": return pascal(key);
    case "java": case "kotlin": return camel(key);
    case "python-dataclass": case "python-pydantic": return snake(key);
    case "typescript": return key;
  }
}

function optionalSuffix(field: TypeField, options: EmitOptions): boolean {
  return field.optional || field.nullable;
}

function emitTypeScript(models: TypeModel[], options: EmitOptions): string {
  return models.map((model) => {
    const lines = model.fields.map((field) => {
      const key = IDENTIFIER.test(field.key) ? field.key : JSON.stringify(field.key);
      const type = renderType(field.type, "typescript");
      const soft = optionalSuffix(field, options);
      if (soft && options.optionalStyle === "optional") return `  ${key}?: ${type};`;
      if (soft) return `  ${key}: ${type} | null;`;
      return `  ${key}: ${type};`;
    });
    return `export interface ${model.name} {\n${lines.join("\n")}\n}`;
  }).join("\n\n") + "\n";
}

function emitCSharp(models: TypeModel[], options: EmitOptions): string {
  return models.map((model) => {
    const lines = model.fields.flatMap((field) => {
      const name = memberName(field.key, "csharp");
      const type = renderType(field.type, "csharp");
      const nullable = optionalSuffix(field, options) ? "?" : "";
      const out: string[] = [];
      if (name !== field.key) out.push(`    [JsonPropertyName("${field.key}")]`);
      out.push(`    public ${type}${nullable} ${name} { get; set; }`);
      return out;
    });
    return `public class ${model.name}\n{\n${lines.join("\n")}\n}`;
  }).join("\n\n") + "\n";
}

function emitGo(models: TypeModel[]): string {
  return models.map((model) => {
    const lines = model.fields.map((field) => {
      const name = memberName(field.key, "go");
      const type = renderType(field.type, "go");
      return `\t${name} ${type} \`json:"${field.key}"\``;
    });
    return `type ${model.name} struct {\n${lines.join("\n")}\n}`;
  }).join("\n\n") + "\n";
}

function emitJava(models: TypeModel[]): string {
  return models.map((model) => {
    const lines = model.fields.flatMap((field) => {
      const name = memberName(field.key, "java");
      const type = renderType(field.type, "java");
      const out: string[] = [];
      if (name !== field.key) out.push(`    @JsonProperty("${field.key}")`);
      out.push(`    public ${type} ${name};`);
      return out;
    });
    return `public class ${model.name} {\n${lines.join("\n")}\n}`;
  }).join("\n\n") + "\n";
}

function emitPython(models: TypeModel[], options: EmitOptions, pydantic: boolean): string {
  const language: TargetLanguage = pydantic ? "python-pydantic" : "python-dataclass";
  return models.map((model) => {
    const lines = model.fields.map((field) => {
      const name = memberName(field.key, language);
      const type = renderType(field.type, language);
      const soft = optionalSuffix(field, options);
      const rendered = soft ? `Optional[${type}]` : type;
      if (pydantic && name !== field.key) {
        return `    ${name}: ${rendered} = Field(${soft ? "None, " : ""}alias="${field.key}")`;
      }
      return `    ${name}: ${rendered}${soft ? " = None" : ""}`;
    });
    const header = pydantic
      ? `class ${model.name}(BaseModel):`
      : `@dataclass\nclass ${model.name}:`;
    return `${header}\n${lines.join("\n")}`;
  }).join("\n\n\n") + "\n";
}

function emitKotlin(models: TypeModel[], options: EmitOptions): string {
  return models.map((model) => {
    const lines = model.fields.flatMap((field) => {
      const name = memberName(field.key, "kotlin");
      const type = renderType(field.type, "kotlin");
      const soft = optionalSuffix(field, options);
      const out: string[] = [];
      if (name !== field.key) out.push(`    @SerialName("${field.key}")`);
      out.push(`    val ${name}: ${type}${soft ? "? = null" : ""},`);
      return out;
    });
    return `data class ${model.name}(\n${lines.join("\n")}\n)`;
  }).join("\n\n") + "\n";
}

export function emitCode(models: TypeModel[], options: EmitOptions): string {
  switch (options.language) {
    case "typescript": return emitTypeScript(models, options);
    case "csharp": return emitCSharp(models, options);
    case "go": return emitGo(models);
    case "java": return emitJava(models);
    case "python-dataclass": return emitPython(models, options, false);
    case "python-pydantic": return emitPython(models, options, true);
    case "kotlin": return emitKotlin(models, options);
  }
}
