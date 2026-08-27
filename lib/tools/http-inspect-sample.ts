export const HTTP_INSPECT_SAMPLE = {
  input: [
    "POST /v1/orders HTTP/1.1",
    "Host: api.example.com",
    "Content-Type: application/json; charset=utf-8",
    "Authorization: Basic YWRhOmxvdmVsYWNl",
    "Cookie: session=abc123; theme=dark",
    "Accept: application/json",
    "",
    '{"sku":"A-1","quantity":2,"gift":false}',
  ].join("\n"),
};
