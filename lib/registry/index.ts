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
import { JSON_COMPARE_SAMPLE } from "@/lib/tools/json-compare-sample";
import { JSON_FORMAT_SAMPLE } from "@/lib/tools/json-format-sample";
import { BASE64_SAMPLE } from "@/lib/tools/base64-sample";
import { EPOCH_SAMPLE } from "@/lib/tools/epoch-sample";
import { REGEX_SAMPLE } from "@/lib/tools/regex-sample";
import { YAML_JSON_SAMPLE } from "@/lib/tools/yaml-json-sample";
import { SQL_FORMAT_SAMPLE } from "@/lib/tools/sql-format-sample";
import { JSON_TO_CODE_SAMPLE } from "@/lib/tools/json-to-code-sample";
import { GUID_SAMPLE } from "@/lib/tools/guid-sample";
import { PASSWORD_SAMPLE } from "@/lib/tools/password-sample";
import { HASH_SAMPLE } from "@/lib/tools/hash-sample";
import { JWT_SAMPLE } from "@/lib/tools/jwt-sample";
import { BASE64_META, EPOCH_META, JSON_COMPARE_META, JSON_FORMAT_META, REGEX_META, GUID_META, HASH_META, JSON_TO_CODE_META, JWT_META, PASSWORD_META, SQL_FORMAT_META, YAML_JSON_META } from "./metas";
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
  { meta: JSON_COMPARE_META, Component: JsonCompare, sample: JSON_COMPARE_SAMPLE },
  { meta: JSON_FORMAT_META, Component: JsonFormat, sample: JSON_FORMAT_SAMPLE },
  { meta: BASE64_META, Component: Base64, sample: BASE64_SAMPLE },
  { meta: EPOCH_META, Component: Epoch, sample: EPOCH_SAMPLE },
  { meta: REGEX_META, Component: RegexTester, sample: REGEX_SAMPLE },
  { meta: YAML_JSON_META, Component: YamlJson, sample: YAML_JSON_SAMPLE },
  { meta: SQL_FORMAT_META, Component: SqlFormat, sample: SQL_FORMAT_SAMPLE },
  { meta: JSON_TO_CODE_META, Component: JsonToCode, sample: JSON_TO_CODE_SAMPLE },
  { meta: GUID_META, Component: Guid, sample: GUID_SAMPLE },
  { meta: PASSWORD_META, Component: Password, sample: PASSWORD_SAMPLE },
  { meta: HASH_META, Component: Hash, sample: HASH_SAMPLE },
  { meta: JWT_META, Component: Jwt, sample: JWT_SAMPLE },
];

export function allMetas(): ToolMeta[] {
  return TOOLS.map((entry) => entry.meta);
}

export function toolBySlug(slug: string): ToolEntry | undefined {
  return TOOLS.find((entry) => entry.meta.slug === slug);
}
