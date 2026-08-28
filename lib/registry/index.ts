import {
  JSON_COMPARE_EXAMPLES,
  JSON_FORMAT_EXAMPLES,
  BASE64_EXAMPLES,
  EPOCH_EXAMPLES,
  REGEX_EXAMPLES,
  YAML_JSON_EXAMPLES,
  SQL_FORMAT_EXAMPLES,
  JSON_TO_CODE_EXAMPLES,
  GUID_EXAMPLES,
  PASSWORD_EXAMPLES,
  HASH_EXAMPLES,
  JWT_EXAMPLES,
  IP_EXAMPLES,
  CURL_EXAMPLES,
  HTTP_EXAMPLES,
  CRON_EXAMPLES,
  SORTING_EXAMPLES,
  BST_EXAMPLES,
  PATHFINDING_EXAMPLES,
  BIG_O_EXAMPLES,
} from "@/lib/tools/examples";
import { JsonCompare } from "@/components/tools/JsonCompare";
import { JsonFormat } from "@/components/tools/JsonFormat";
import { Base64 } from "@/components/tools/Base64";
import { Epoch } from "@/components/tools/Epoch";
import { RegexTester } from "@/components/tools/RegexTester";
import { YamlJson } from "@/components/tools/YamlJson";
import { SqlFormat } from "@/components/tools/SqlFormat";
import { JsonToCode } from "@/components/tools/JsonToCode";
import { Guid } from "@/components/tools/Guid";
import { Password } from "@/components/tools/Password";
import { Hash } from "@/components/tools/Hash";
import { Jwt } from "@/components/tools/Jwt";
import { IpCalculator } from "@/components/tools/IpCalculator";
import { CurlConvert } from "@/components/tools/CurlConvert";
import { HttpInspector } from "@/components/tools/HttpInspector";
import { Cron } from "@/components/tools/Cron";
import { Sorting } from "@/components/tools/Sorting";
import { Bst } from "@/components/tools/Bst";
import { Pathfinding } from "@/components/tools/Pathfinding";
import { BigO } from "@/components/tools/BigO";
import { BASE64_META, BIG_O_META, BST_META, CRON_META, CURL_META, EPOCH_META, JSON_COMPARE_META, JSON_FORMAT_META, REGEX_META, GUID_META, HASH_META, HTTP_META, IP_META, JSON_TO_CODE_META, JWT_META, PASSWORD_META, PATHFINDING_META, SORTING_META, SQL_FORMAT_META, YAML_JSON_META } from "./metas";
import type { ToolEntry, ToolMeta } from "./types";

export * from "./types";
export * from "./metas";
export { searchTools, groupTools } from "./search";

/**
 * The single source of truth. Every tool registers here exactly once and
 * appears in four places: the rail, the ⌘K palette, the dashboard, and the
 * [slug] route. Declaration order is display order within a group.
 *
 * `Component` is the tool's client component itself, never a wrapper closure
 * that passes it props. The [slug] route renders these from the server, and a
 * prop-passing wrapper would try to serialise the meta's icon and fail the
 * build. Each tool imports the meta it needs from ./metas instead.
 */
export const TOOLS: ToolEntry[] = [
  { meta: JSON_COMPARE_META, Component: JsonCompare, examples: JSON_COMPARE_EXAMPLES },
  { meta: JSON_FORMAT_META, Component: JsonFormat, examples: JSON_FORMAT_EXAMPLES },
  { meta: BASE64_META, Component: Base64, examples: BASE64_EXAMPLES },
  { meta: EPOCH_META, Component: Epoch, examples: EPOCH_EXAMPLES },
  { meta: REGEX_META, Component: RegexTester, examples: REGEX_EXAMPLES },
  { meta: YAML_JSON_META, Component: YamlJson, examples: YAML_JSON_EXAMPLES },
  { meta: SQL_FORMAT_META, Component: SqlFormat, examples: SQL_FORMAT_EXAMPLES },
  { meta: JSON_TO_CODE_META, Component: JsonToCode, examples: JSON_TO_CODE_EXAMPLES },
  { meta: GUID_META, Component: Guid, examples: GUID_EXAMPLES },
  { meta: PASSWORD_META, Component: Password, examples: PASSWORD_EXAMPLES },
  { meta: HASH_META, Component: Hash, examples: HASH_EXAMPLES },
  { meta: JWT_META, Component: Jwt, examples: JWT_EXAMPLES },
  { meta: IP_META, Component: IpCalculator, examples: IP_EXAMPLES },
  { meta: CURL_META, Component: CurlConvert, examples: CURL_EXAMPLES },
  { meta: HTTP_META, Component: HttpInspector, examples: HTTP_EXAMPLES },
  { meta: CRON_META, Component: Cron, examples: CRON_EXAMPLES },
  { meta: SORTING_META, Component: Sorting, examples: SORTING_EXAMPLES },
  { meta: BST_META, Component: Bst, examples: BST_EXAMPLES },
  { meta: PATHFINDING_META, Component: Pathfinding, examples: PATHFINDING_EXAMPLES },
  { meta: BIG_O_META, Component: BigO, examples: BIG_O_EXAMPLES },
];

export function allMetas(): ToolMeta[] {
  return TOOLS.map((entry) => entry.meta);
}

export function toolBySlug(slug: string): ToolEntry | undefined {
  return TOOLS.find((entry) => entry.meta.slug === slug);
}
