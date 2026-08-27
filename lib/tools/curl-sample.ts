export const CURL_SAMPLE = {
  input: [
    "curl -X POST https://api.example.com/v1/orders \\",
    "  -H 'Content-Type: application/json' \\",
    "  -H 'Authorization: Bearer abc123' \\",
    "  --compressed \\",
    `  -d '{"sku":"A-1","quantity":2}'`,
  ].join("\n"),
  target: "fetch" as const,
};
