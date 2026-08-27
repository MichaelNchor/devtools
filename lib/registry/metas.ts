import { ArrowLeftRight, Binary, Braces, Clock, Code2, Database, FileSearch, Fingerprint, GitCompare, Hash, KeyRound, KeySquare, Network, Regex, TerminalSquare } from "lucide-react";
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

export const EPOCH_META: ToolMeta = {
  slug: "epoch",
  name: "Epoch Converter",
  blurb: "Convert Unix timestamps to dates and back, in any time zone.",
  group: "data",
  icon: Clock,
  aliases: ["unix", "timestamp", "time", "date", "epoch time"],
  handlesSecrets: false,
};

export const REGEX_META: ToolMeta = {
  slug: "regex",
  name: "Regex Tester",
  blurb: "Test regular expressions with live matches, groups, and replacements.",
  group: "data",
  icon: Regex,
  aliases: ["regexp", "pattern", "match", "regular expression"],
  handlesSecrets: false,
};

export const YAML_JSON_META: ToolMeta = {
  slug: "yaml-json",
  name: "YAML ↔ JSON",
  blurb: "Convert between YAML and JSON in both directions.",
  group: "data",
  icon: ArrowLeftRight,
  aliases: ["yaml", "yml", "convert", "json to yaml", "yaml to json"],
  handlesSecrets: false,
};

export const SQL_FORMAT_META: ToolMeta = {
  slug: "sql-format",
  name: "SQL Formatter",
  blurb: "Format SQL across six dialects with configurable casing and indent.",
  group: "data",
  icon: Database,
  aliases: ["sql", "query", "beautify sql", "postgres", "mysql"],
  handlesSecrets: false,
};

export const JSON_TO_CODE_META: ToolMeta = {
  slug: "json-to-code",
  name: "JSON → Code",
  blurb: "Infer types from a JSON sample and emit them in seven languages.",
  group: "data",
  icon: Code2,
  aliases: ["types", "interface", "typescript", "codegen", "class", "struct"],
  handlesSecrets: false,
};

export const GUID_META: ToolMeta = {
  slug: "guid",
  name: "GUID Generator",
  blurb: "Generate UUIDs — v4, v7, v1, and namespace-based v5.",
  group: "security",
  icon: Fingerprint,
  aliases: ["uuid", "guid", "id", "identifier", "random id"],
  handlesSecrets: false,
};

export const PASSWORD_META: ToolMeta = {
  slug: "password",
  name: "Password Generator",
  blurb: "Generate strong passwords and see the entropy behind them.",
  group: "security",
  icon: KeyRound,
  aliases: ["password", "passphrase", "random", "generate", "secret"],
  // Generated credentials never touch localStorage and never ride in a URL.
  handlesSecrets: true,
};

export const HASH_META: ToolMeta = {
  slug: "hash",
  name: "Hash Generator",
  blurb: "MD5, SHA and RIPEMD digests of text or a file, with HMAC and compare.",
  group: "security",
  icon: Hash,
  aliases: ["md5", "sha", "sha256", "checksum", "digest", "hmac"],
  // Input may be a secret and an HMAC key certainly is.
  handlesSecrets: true,
};

export const JWT_META: ToolMeta = {
  slug: "jwt",
  name: "JWT Debugger",
  blurb: "Decode a JSON Web Token, humanise its claims, and verify its signature.",
  group: "security",
  icon: KeySquare,
  aliases: ["jwt", "token", "jsonwebtoken", "bearer", "claims"],
  // Tokens and signing secrets must not outlive the tab that pasted them.
  handlesSecrets: true,
};

export const IP_META: ToolMeta = {
  slug: "ip-calculator",
  name: "IP Calculator",
  blurb: "Subnet IPv4 and IPv6 — ranges, masks, host counts, and splits.",
  group: "network",
  icon: Network,
  aliases: ["ip", "subnet", "cidr", "netmask", "ipv6", "vlsm"],
  handlesSecrets: false,
};

export const CURL_META: ToolMeta = {
  slug: "curl-convert",
  name: "cURL Converter",
  blurb: "Turn a curl command into fetch, axios, requests, HttpClient, Go, or PowerShell.",
  group: "network",
  icon: TerminalSquare,
  aliases: ["curl", "http", "request", "convert", "fetch", "axios"],
  handlesSecrets: false,
};

export const HTTP_META: ToolMeta = {
  slug: "http-inspector",
  name: "HTTP Inspector",
  blurb: "Break a raw HTTP request or response into headers, body, and claims.",
  group: "network",
  icon: FileSearch,
  aliases: ["http", "request", "response", "headers", "inspect", "raw"],
  handlesSecrets: false,
};
