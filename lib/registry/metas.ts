import { GitCompare } from "lucide-react";
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
