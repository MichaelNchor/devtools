export const REGEX_SAMPLE = {
  pattern: "(?<user>[\\w.+-]+)@(?<host>[\\w-]+\\.[\\w.-]+)",
  flags: "g",
  text: "Contact ada@example.com or grace+dev@navy.mil.uk — but not bad@@example.",
  replacement: "$<user> at $<host>",
};
