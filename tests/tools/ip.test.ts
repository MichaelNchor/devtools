import { describe, it, expect } from "vitest";
import { calculateIpv4, splitSubnets, analyseIpv6 } from "@/lib/tools/ip";

const report = (input: string) => {
  const r = calculateIpv4(input);
  if (!r.ok) throw new Error(r.error.message);
  return r.value;
};

describe("calculateIpv4", () => {
  it("computes a /24 completely", () => {
    expect(report("192.168.1.10/24")).toMatchObject({
      network: "192.168.1.0", broadcast: "192.168.1.255",
      firstHost: "192.168.1.1", lastHost: "192.168.1.254",
      usableHosts: 254, netmask: "255.255.255.0", wildcard: "0.0.0.255",
      prefix: 24, scope: "private",
    });
  });

  it("accepts a dotted mask and agrees with the prefix form", () => {
    expect(report("192.168.1.10 255.255.255.0")).toEqual(report("192.168.1.10/24"));
  });

  it("treats /32 as a single host, never as -1", () => {
    const r = report("10.1.2.3/32");
    expect(r.usableHosts).toBe(1);
    expect(r.firstHost).toBe("10.1.2.3");
    expect(r.lastHost).toBe("10.1.2.3");
  });

  it("treats /31 as an RFC 3021 point-to-point pair with no broadcast", () => {
    const r = report("10.1.2.2/31");
    expect(r.usableHosts).toBe(2);
    expect(r.firstHost).toBe("10.1.2.2");
    expect(r.lastHost).toBe("10.1.2.3");
    expect(r.broadcast).toBeNull();
  });

  it("handles /0", () => {
    expect(report("0.0.0.0/0")).toMatchObject({
      network: "0.0.0.0", broadcast: "255.255.255.255", usableHosts: 4294967294,
    });
  });

  it("handles /30, the smallest classic usable subnet", () => {
    expect(report("192.168.1.4/30")).toMatchObject({
      firstHost: "192.168.1.5", lastHost: "192.168.1.6", usableHosts: 2,
    });
  });

  it("classifies scope", () => {
    expect(report("10.0.0.1/8").scope).toBe("private");
    expect(report("172.16.0.1/12").scope).toBe("private");
    expect(report("172.32.0.1/12").scope).toBe("public");
    expect(report("192.168.0.1/16").scope).toBe("private");
    expect(report("127.0.0.1/8").scope).toBe("loopback");
    expect(report("169.254.1.1/16").scope).toBe("link-local");
    expect(report("224.0.0.1/4").scope).toBe("multicast");
    expect(report("8.8.8.8/32").scope).toBe("public");
  });

  it("rejects bad input", () => {
    for (const bad of ["256.1.1.1/24", "1.2.3/24", "1.2.3.4/33", "1.2.3.4/-1", "", "hello"]) {
      expect(calculateIpv4(bad).ok, bad).toBe(false);
    }
  });

  it("rejects a non-contiguous dotted mask", () => {
    // 255.0.255.0 is not a valid netmask; accepting it would give nonsense.
    expect(calculateIpv4("1.2.3.4 255.0.255.0").ok).toBe(false);
  });
});

describe("splitSubnets", () => {
  it("splits a /24 into four /26s with correct boundaries", () => {
    const r = splitSubnets("10.0.0.0/24", 26);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value).toHaveLength(4);
    expect(r.value[0]).toEqual({ network: "10.0.0.0", broadcast: "10.0.0.63" });
    expect(r.value[3]).toEqual({ network: "10.0.0.192", broadcast: "10.0.0.255" });
  });

  it("rejects a new prefix that is not longer than the original", () => {
    expect(splitSubnets("10.0.0.0/24", 24).ok).toBe(false);
    expect(splitSubnets("10.0.0.0/24", 20).ok).toBe(false);
  });

  it("caps an absurd split rather than building millions of rows", () => {
    expect(splitSubnets("10.0.0.0/8", 32).ok).toBe(false);
  });
});

describe("analyseIpv6", () => {
  it("expands and compresses", () => {
    const r = analyseIpv6("2001:db8::1/64");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.expanded).toBe("2001:0db8:0000:0000:0000:0000:0000:0001");
    expect(r.value.compressed).toBe("2001:db8::1");
  });

  it("handles the all-zeros and loopback edge cases", () => {
    const zero = analyseIpv6("::");
    expect(zero.ok && zero.value.expanded).toBe("0000:0000:0000:0000:0000:0000:0000:0000");
    expect(zero.ok && zero.value.compressed).toBe("::");
    const loop = analyseIpv6("::1");
    expect(loop.ok && loop.value.compressed).toBe("::1");
  });

  it("returns the address count as a string, since a /64 exceeds MAX_SAFE_INTEGER", () => {
    const r = analyseIpv6("2001:db8::/64");
    expect(r.ok && r.value.addressCount).toBe("18446744073709551616");
  });

  it("computes the prefix range", () => {
    const r = analyseIpv6("2001:db8::/32");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.firstAddress).toBe("2001:db8::");
    expect(r.value.lastAddress).toBe("2001:db8:ffff:ffff:ffff:ffff:ffff:ffff");
  });

  it("rejects malformed addresses", () => {
    for (const bad of ["", "gggg::", "1::2::3", "2001:db8::/129"]) {
      expect(analyseIpv6(bad).ok, bad).toBe(false);
    }
  });
});
