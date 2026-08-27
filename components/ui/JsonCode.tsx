import { tokenizeJson, type JsonTokenType } from "@/lib/highlight/json";

const TONE: Record<JsonTokenType, string> = {
  key: "text-[var(--code-key)]",
  string: "text-[var(--code-string)]",
  number: "text-[var(--code-number)]",
  atom: "text-[var(--code-atom)]",
  punct: "text-[var(--code-punct)]",
  space: "",
};

/**
 * Renders highlighted JSON. Not a textarea — this is the read-only output
 * side. Colours come from the --code-* tokens, which resolve per theme, so
 * highlighting can never drift from the palette.
 */
export function JsonCode({ text, className }: { text: string; className?: string }) {
  return (
    <pre className={`w-max min-w-full whitespace-pre font-ui text-[12.5px] leading-[1.6] ${className ?? ""}`}>
      {tokenizeJson(text).map((token, index) => (
        <span key={index} className={TONE[token.type]}>{token.text}</span>
      ))}
    </pre>
  );
}
