import { AlertCircle } from "lucide-react";
import type { ToolError } from "@/lib/types";

export function ErrorNote({ error }: { error: ToolError | null }) {
  if (!error) return null;
  const where = error.line != null
    ? ` (line ${error.line}${error.column != null ? `, column ${error.column}` : ""})`
    : "";

  return (
    <div role="alert" className="flex items-start gap-2 rounded-md bg-rose-tint px-3 py-2">
      <AlertCircle size={14} className="mt-0.5 shrink-0 text-rose" aria-hidden />
      <p className="text-[12.5px] leading-snug text-rose">{error.message}{where}</p>
    </div>
  );
}
