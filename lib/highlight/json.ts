export type JsonTokenType = "key" | "string" | "number" | "atom" | "punct" | "space";

export interface JsonToken {
  type: JsonTokenType;
  text: string;
}

const WHITESPACE = new Set([" ", "\t", "\n", "\r"]);
const PUNCTUATION = new Set(["{", "}", "[", "]", ":", ","]);

/** Reads one string literal starting at `start` (which must be a quote). */
function readString(text: string, start: number): number {
  let i = start + 1;
  while (i < text.length) {
    const ch = text[i];
    if (ch === "\\") { i += 2; continue; }
    i += 1;
    // An unterminated string runs to end-of-input rather than throwing; this
    // tokeniser highlights documents that are still being typed.
    if (ch === '"') break;
  }
  return i;
}

function readNumber(text: string, start: number): number {
  let i = start;
  if (text[i] === "-" || text[i] === "+") i += 1;
  while (i < text.length && /[0-9.eE]/.test(text[i]!)) {
    // Signs are only part of the number directly after an exponent marker.
    i += 1;
    if ((text[i] === "+" || text[i] === "-") && /[eE]/.test(text[i - 1] ?? "")) i += 1;
  }
  return i;
}

/**
 * Splits JSON text into coloured spans. Total by construction: every input
 * character lands in exactly one token, so joining the texts rebuilds the
 * input. Invalid input is tokenised, never rejected — this runs on keystrokes.
 */
export function tokenizeJson(text: string): JsonToken[] {
  const tokens: JsonToken[] = [];
  let i = 0;

  while (i < text.length) {
    const ch = text[i]!;

    if (WHITESPACE.has(ch)) {
      let j = i;
      while (j < text.length && WHITESPACE.has(text[j]!)) j += 1;
      tokens.push({ type: "space", text: text.slice(i, j) });
      i = j;
      continue;
    }

    if (PUNCTUATION.has(ch)) {
      tokens.push({ type: "punct", text: ch });
      i += 1;
      continue;
    }

    if (ch === '"') {
      const end = readString(text, i);
      // A string is a key when the next thing that is not whitespace is a
      // colon. Looking ahead is what separates {"a":1} from ["a"].
      let ahead = end;
      while (ahead < text.length && WHITESPACE.has(text[ahead]!)) ahead += 1;
      tokens.push({ type: text[ahead] === ":" ? "key" : "string", text: text.slice(i, end) });
      i = end;
      continue;
    }

    if (ch === "-" || (ch >= "0" && ch <= "9")) {
      const end = readNumber(text, i);
      tokens.push({ type: "number", text: text.slice(i, end) });
      i = end;
      continue;
    }

    const atom = ["true", "false", "null"].find((word) => text.startsWith(word, i));
    if (atom !== undefined) {
      tokens.push({ type: "atom", text: atom });
      i += atom.length;
      continue;
    }

    // Anything else is a stray character in a document mid-edit. Emit it as
    // punctuation so it still renders rather than disappearing.
    tokens.push({ type: "punct", text: ch });
    i += 1;
  }

  return tokens;
}
