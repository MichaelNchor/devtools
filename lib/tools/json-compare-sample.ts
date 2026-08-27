export const SAMPLE_LEFT = JSON.stringify(
  {
    service: "checkout",
    version: "2.1.0",
    replicas: 3,
    port: "8080",
    features: ["cart", "coupons"],
    limits: { cpu: "500m", memory: "512Mi" },
    deprecated: true,
  },
  null,
  2,
);

export const SAMPLE_RIGHT = JSON.stringify(
  {
    service: "checkout",
    version: "2.2.0",
    replicas: 5,
    port: 8080,
    features: ["cart", "coupons", "gift-cards"],
    limits: { cpu: "500m", memory: "1Gi" },
    probes: { liveness: "/healthz", readiness: "/ready" },
  },
  null,
  2,
);
