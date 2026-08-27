import { format } from "sql-formatter";
import { err, ok, type ToolResult } from "@/lib/types";

export type SqlDialect = "sql" | "postgresql" | "mysql" | "tsql" | "sqlite" | "bigquery";

export interface SqlOptions {
  dialect: SqlDialect;
  keywordCase: "upper" | "lower" | "preserve";
  indent: number;
  commaPosition: "after" | "before";
}

export const DEFAULT_SQL_OPTIONS: SqlOptions = {
  dialect: "sql",
  keywordCase: "upper",
  indent: 2,
  commaPosition: "after",
};

/** The dropdown's contents. Every value here must be a language the library knows. */
export const SQL_DIALECTS: { value: SqlDialect; label: string }[] = [
  { value: "sql", label: "Standard SQL" },
  { value: "postgresql", label: "PostgreSQL" },
  { value: "mysql", label: "MySQL" },
  { value: "tsql", label: "T-SQL" },
  { value: "sqlite", label: "SQLite" },
  { value: "bigquery", label: "BigQuery" },
];

/**
 * Moves trailing commas to the head of the following line.
 *
 * sql-formatter REMOVED its `commaPosition` option in v15 — passing it throws
 * "commaPosition config is no more supported". The spec still asks for leading
 * commas, so we do it ourselves afterwards. The comma is placed INTO the
 * previous indentation rather than in front of it, which is what keeps the
 * column names themselves aligned.
 */
function toLeadingCommas(sql: string): string {
  const out: string[] = [];
  let carryComma = false;

  for (const line of sql.split("\n")) {
    const endsWithComma = line.endsWith(",");
    const body = endsWithComma ? line.slice(0, -1) : line;

    if (carryComma) {
      const indent = /^\s*/.exec(body)?.[0] ?? "";
      out.push(`${indent.length >= 2 ? indent.slice(0, -2) : ""}, ${body.trimStart()}`);
    } else {
      out.push(body);
    }
    carryComma = endsWithComma;
  }

  return out.join("\n");
}

export function formatSql(text: string, options: SqlOptions): ToolResult<string> {
  if (!text.trim()) return err("Enter a SQL statement.");
  try {
    const formatted = format(text, {
      language: options.dialect,
      keywordCase: options.keywordCase,
      tabWidth: options.indent,
    });
    return ok(options.commaPosition === "before" ? toLeadingCommas(formatted) : formatted);
  } catch (cause) {
    // The library throws on input it cannot tokenise. Everything reaches the
    // UI as a ToolResult, so a thrown parse error never reaches a boundary.
    return err(cause instanceof Error ? cause.message : "That SQL could not be formatted.");
  }
}
