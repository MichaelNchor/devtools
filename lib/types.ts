export interface ToolError {
  message: string;
  /** 1-indexed, populated wherever the parser can supply a position. */
  line?: number;
  /** 1-indexed. */
  column?: number;
}

export type ToolResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: ToolError };

export function ok<T>(value: T): ToolResult<T> {
  return { ok: true, value };
}

export function err<T>(message: string, at?: { line?: number; column?: number }): ToolResult<T> {
  // `exactOptionalPropertyTypes` is on, so an absent position must be an
  // absent key rather than an explicit undefined.
  return { ok: false, error: { message, ...(at?.line != null ? { line: at.line } : {}), ...(at?.column != null ? { column: at.column } : {}) } };
}
