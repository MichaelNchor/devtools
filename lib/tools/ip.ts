import { err, ok, type ToolResult } from "@/lib/types";

export type Ipv4Scope = "private" | "loopback" | "link-local" | "multicast" | "public";

export interface Ipv4Report {
  address: string;
  network: string;
  /** null for /31 and /32, which have no broadcast address. */
  broadcast: string | null;
  firstHost: string;
  lastHost: string;
  usableHosts: number;
  netmask: string;
  wildcard: string;
  prefix: number;
  scope: Ipv4Scope;
}

const MAX_SUBNET_ROWS = 1024;

function parseOctets(text: string): number[] | null {
  const parts = text.split(".");
  if (parts.length !== 4) return null;
  const octets: number[] = [];
  for (const part of parts) {
    if (!/^\d{1,3}$/.test(part)) return null;
    const value = Number(part);
    if (value > 255) return null;
    octets.push(value);
  }
  return octets;
}

/** Unsigned 32-bit; >>> 0 because JS bitwise ops produce signed integers. */
function toInt(octets: number[]): number {
  return ((octets[0]! << 24) | (octets[1]! << 16) | (octets[2]! << 8) | octets[3]!) >>> 0;
}

function toDotted(value: number): string {
  return [24, 16, 8, 0].map((shift) => (value >>> shift) & 255).join(".");
}

function maskFor(prefix: number): number {
  // A /0 mask cannot be written as -1 << 32; that shift is a no-op in JS.
  return prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
}

function prefixFromMask(mask: number): number | null {
  const ones = mask.toString(2).padStart(32, "0");
  // A netmask must be contiguous ones then contiguous zeros.
  if (!/^1*0*$/.test(ones)) return null;
  return (ones.match(/1/g) ?? []).length;
}

function scopeOf(octets: number[]): Ipv4Scope {
  const [a, b] = octets as [number, number];
  if (a === 127) return "loopback";
  if (a === 169 && b === 254) return "link-local";
  if (a >= 224 && a <= 239) return "multicast";
  if (a === 10) return "private";
  if (a === 172 && b >= 16 && b <= 31) return "private";
  if (a === 192 && b === 168) return "private";
  return "public";
}

export function calculateIpv4(input: string): ToolResult<Ipv4Report> {
  const trimmed = input.trim();
  if (!trimmed) return err("Enter an address, such as 192.168.1.10/24.");

  const [addressPart, maskPart] = trimmed.includes("/")
    ? trimmed.split("/", 2) as [string, string]
    : trimmed.split(/\s+/, 2) as [string, string | undefined];

  const octets = parseOctets(addressPart.trim());
  if (!octets) return err(`"${addressPart.trim()}" is not a valid IPv4 address.`);

  let prefix: number;
  if (maskPart === undefined || maskPart.trim() === "") {
    prefix = 32;
  } else if (/^\d{1,2}$/.test(maskPart.trim())) {
    prefix = Number(maskPart.trim());
    if (prefix > 32) return err("A prefix length must be between 0 and 32.");
  } else {
    const maskOctets = parseOctets(maskPart.trim());
    if (!maskOctets) return err(`"${maskPart.trim()}" is not a valid netmask or prefix.`);
    const derived = prefixFromMask(toInt(maskOctets));
    if (derived === null) return err("A netmask must be contiguous ones followed by zeros.");
    prefix = derived;
  }

  const address = toInt(octets);
  const mask = maskFor(prefix);
  const network = (address & mask) >>> 0;
  const broadcast = (network | (~mask >>> 0)) >>> 0;
  const size = prefix === 0 ? 4294967296 : 2 ** (32 - prefix);

  // /32 is one host and /31 is an RFC 3021 point-to-point pair. Applying the
  // usual "size minus network minus broadcast" gives 0 and -1, which is the
  // classic bug this special case exists to avoid.
  const single = prefix === 32;
  const pointToPoint = prefix === 31;

  return ok({
    address: toDotted(address),
    network: toDotted(network),
    broadcast: single || pointToPoint ? null : toDotted(broadcast),
    firstHost: toDotted(single || pointToPoint ? network : (network + 1) >>> 0),
    lastHost: toDotted(single ? network : pointToPoint ? broadcast : (broadcast - 1) >>> 0),
    usableHosts: single ? 1 : pointToPoint ? 2 : size - 2,
    netmask: toDotted(mask),
    wildcard: toDotted(~mask >>> 0),
    prefix,
    scope: scopeOf(octets),
  });
}

export function splitSubnets(
  input: string,
  newPrefix: number,
): ToolResult<{ network: string; broadcast: string }[]> {
  const base = calculateIpv4(input);
  if (!base.ok) return base;
  if (!Number.isInteger(newPrefix) || newPrefix < 0 || newPrefix > 32) {
    return err("A prefix length must be between 0 and 32.");
  }
  if (newPrefix <= base.value.prefix) {
    return err(`The new prefix must be longer than /${base.value.prefix} to split it.`);
  }

  const count = 2 ** (newPrefix - base.value.prefix);
  if (count > MAX_SUBNET_ROWS) {
    return err(`That split produces ${count.toLocaleString()} subnets — more than this table will show.`);
  }

  const start = toInt(parseOctets(base.value.network)!);
  const step = 2 ** (32 - newPrefix);
  const out: { network: string; broadcast: string }[] = [];
  for (let i = 0; i < count; i += 1) {
    const network = (start + i * step) >>> 0;
    out.push({ network: toDotted(network), broadcast: toDotted((network + step - 1) >>> 0) });
  }
  return ok(out);
}

// ---------- IPv6 ----------

function parseIpv6(text: string): bigint | null {
  if (text.includes(":::")) return null;
  const halves = text.split("::");
  if (halves.length > 2) return null;

  const expand = (part: string): string[] => (part === "" ? [] : part.split(":"));
  const head = expand(halves[0] ?? "");
  const tail = halves.length === 2 ? expand(halves[1] ?? "") : [];

  const groups = halves.length === 2
    ? [...head, ...Array(8 - head.length - tail.length).fill("0"), ...tail]
    : head;

  if (groups.length !== 8) return null;

  let value = 0n;
  for (const group of groups) {
    if (!/^[0-9a-fA-F]{1,4}$/.test(group)) return null;
    value = (value << 16n) | BigInt(parseInt(group, 16));
  }
  return value;
}

function expandIpv6(value: bigint): string {
  const groups: string[] = [];
  for (let i = 7; i >= 0; i -= 1) {
    groups.push((((value >> BigInt(i * 16)) & 0xffffn).toString(16)).padStart(4, "0"));
  }
  return groups.join(":");
}

function compressIpv6(value: bigint): string {
  const groups = expandIpv6(value).split(":").map((g) => g.replace(/^0+(?=.)/, ""));
  // Collapse the LONGEST run of zero groups, which is what RFC 5952 requires.
  let bestStart = -1;
  let bestLength = 0;
  let start = -1;
  let length = 0;
  for (let i = 0; i <= groups.length; i += 1) {
    if (i < groups.length && groups[i] === "0") {
      if (start === -1) start = i;
      length += 1;
    } else {
      if (length > bestLength) { bestLength = length; bestStart = start; }
      start = -1;
      length = 0;
    }
  }
  if (bestLength < 2) return groups.join(":");
  const head = groups.slice(0, bestStart).join(":");
  const tail = groups.slice(bestStart + bestLength).join(":");
  return `${head}::${tail}`;
}

export function analyseIpv6(input: string): ToolResult<{
  expanded: string; compressed: string; prefix: number;
  firstAddress: string; lastAddress: string; addressCount: string;
}> {
  const trimmed = input.trim();
  if (!trimmed) return err("Enter an IPv6 address, such as 2001:db8::1/64.");

  const [addressPart, prefixPart] = trimmed.split("/", 2) as [string, string | undefined];
  const value = parseIpv6(addressPart.trim());
  if (value === null) return err(`"${addressPart.trim()}" is not a valid IPv6 address.`);

  let prefix = 128;
  if (prefixPart !== undefined) {
    if (!/^\d{1,3}$/.test(prefixPart) || Number(prefixPart) > 128) {
      return err("An IPv6 prefix length must be between 0 and 128.");
    }
    prefix = Number(prefixPart);
  }

  const hostBits = BigInt(128 - prefix);
  const mask = hostBits === 128n ? 0n : ((1n << 128n) - 1n) ^ ((1n << hostBits) - 1n);
  const first = value & mask;
  const last = first | ((1n << hostBits) - 1n);

  return ok({
    expanded: expandIpv6(value),
    compressed: compressIpv6(value),
    prefix,
    firstAddress: compressIpv6(first),
    lastAddress: compressIpv6(last),
    // A string, because a /64 holds 2^64 addresses — far past Number's
    // safe-integer range, where a numeric answer would silently be wrong.
    addressCount: (1n << hostBits).toString(),
  });
}
