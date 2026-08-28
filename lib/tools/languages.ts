/** The languages every code panel offers. C# leads deliberately. */
export type Language = "csharp" | "typescript" | "python" | "java";

export const LANGUAGES: { value: Language; label: string }[] = [
  { value: "csharp", label: "C#" },
  { value: "typescript", label: "TypeScript" },
  { value: "python", label: "Python" },
  { value: "java", label: "Java" },
];

/** A complete set of implementations, so no language can be silently missing. */
export type Implementations = Record<Language, string>;
