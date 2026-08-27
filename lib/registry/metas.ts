import { Binary, Braces, GitCompare } from "lucide-react";
import type { ToolMeta } from "./types";

/**
 * Metas live apart from the components they describe because `icon` is a
 * component, and the [slug] route is a Server Component. Anything a server
 * module hands a client component as a PROP must be serialisable, and a
 * function is not — so a tool reads its own meta from here by import rather
 * than receiving it across that boundary. Importing an icon on the server is
 * fine; only passing one through props is not.
 */
export const JSON_COMPARE_META: ToolMeta = {
  slug: "json-compare",
  name: "JSON Compare",
  blurb: "Diff two JSON documents structurally, ignoring formatting.",
  group: "data",
  icon: GitCompare,
  aliases: ["diff", "json diff", "compare", "delta"],
  handlesSecrets: false,
};

export const JSON_FORMAT_META: ToolMeta = {
  slug: "json-format",
  name: "JSON Formatter",
  blurb: "Beautify, minify, sort keys, and validate JSON with positional errors.",
  group: "data",
  icon: Braces,
  aliases: ["format", "beautify", "prettify", "minify", "validate", "pretty print"],
  handlesSecrets: false,
};

export const BASE64_META: ToolMeta = {
  slug: "base64",
  name: "Base64",
  blurb: "Encode and decode base64, including URL-safe and binary payloads.",
  group: "data",
  icon: Binary,
  aliases: ["b64", "encode", "decode", "data uri", "atob", "btoa"],
  handlesSecrets: false,
};
