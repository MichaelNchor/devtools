export const YAML_JSON_SAMPLE = {
  input: [
    "# deployment settings",
    "service: checkout",
    "replicas: 3",
    "limits:",
    "  cpu: 500m",
    "  memory: 512Mi",
    "features:",
    "  - cart",
    "  - coupons",
  ].join("\n"),
  direction: "yaml-to-json" as const,
};
