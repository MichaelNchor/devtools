import { load, dump, YAMLException } from "js-yaml";
import { parseJson } from "@/lib/json/parse";
import { err, ok, type ToolResult } from "@/lib/types";

export interface YamlOptions {
  indent: number;
  /** Flow style is JSON-like inline collections; block style is the default. */
  flowStyle: boolean;
}

export function yamlToJson(text: string, indent: number): ToolResult<string> {
  if (!text.trim()) return err("Enter some YAML.");
  try {
    const parsed = load(text) as unknown;
    if (parsed === undefined) return err("That YAML document is empty.");
    return ok(JSON.stringify(parsed, null, indent));
  } catch (cause) {
    if (cause instanceof YAMLException) {
      // js-yaml marks are 0-indexed; ToolError is 1-indexed throughout.
      const mark = cause.mark;
      return err(
        cause.reason || cause.message,
        mark ? { line: mark.line + 1, column: mark.column + 1 } : undefined,
      );
    }
    return err(cause instanceof Error ? cause.message : "That YAML could not be parsed.");
  }
}

export function jsonToYaml(text: string, options: YamlOptions): ToolResult<string> {
  const parsed = parseJson(text);
  if (!parsed.ok) return parsed;
  try {
    return ok(dump(parsed.value, {
      indent: options.indent,
      // flowLevel 0 makes even the root inline; -1 disables flow entirely.
      flowLevel: options.flowStyle ? 0 : -1,
      lineWidth: -1,
      noRefs: true,
    }));
  } catch (cause) {
    return err(cause instanceof Error ? cause.message : "That value could not be written as YAML.");
  }
}

/**
 * Detects the two things a YAML→JSON round trip destroys. Quoted strings are
 * skipped so a "#" inside a value is not mistaken for a comment — a warning
 * that fires wrongly is a warning users learn to ignore.
 */
export function hasCommentsOrAnchors(text: string): boolean {
  for (const line of text.split("\n")) {
    let inSingle = false;
    let inDouble = false;
    for (let i = 0; i < line.length; i += 1) {
      const ch = line[i];
      if (ch === "\\") { i += 1; continue; }
      if (ch === "'" && !inDouble) inSingle = !inSingle;
      else if (ch === '"' && !inSingle) inDouble = !inDouble;
      else if (!inSingle && !inDouble) {
        if (ch === "#") return true;
        // &anchor / *alias, but only where a token can start.
        if ((ch === "&" || ch === "*") && /[\w-]/.test(line[i + 1] ?? "")) return true;
      }
    }
  }
  return false;
}
