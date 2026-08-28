/**
 * The short explainer that sits under every tool.
 *
 * Each point earns its place by saying something the title does not: a gotcha,
 * a guarantee, or the reason an option exists. Restating the tool's name in a
 * sentence would be worse than showing nothing.
 */
export interface ToolGuide {
  /** One sentence on what the tool is actually doing under the hood. */
  summary: string;
  points: { title: string; body: string }[];
}

export const GUIDES: Record<string, ToolGuide> = {
  "json-compare": {
    summary: "Both documents are parsed into values and compared structurally, so formatting, indentation and key order never register as differences.",
    points: [
      { title: "Structural, not textual", body: "Reformat one side however you like — the diff does not move. Switch to the Text view when you do want line-level noise." },
      { title: "Array matching", body: "By index compares position to position. By value matches equal elements anywhere, so a reordered list reads as unchanged. By key field matches on a shared id." },
      { title: "Tolerance", body: "Set a numeric tolerance to stop floating-point noise like 0.1 + 0.2 from showing up as a difference." },
      { title: "Jump between differences", body: "Press n and p while the diff has focus, or use Prev and Next. Containers are skipped — only real differences are stops." },
    ],
  },
  "json-format": {
    summary: "The document is parsed, optionally rebuilt with sorted keys, and re-serialised — so invalid JSON is rejected rather than passed through.",
    points: [
      { title: "Sorting is recursive", body: "Keys sort at every level, inside arrays too. Array elements are never reordered: their order is data, not presentation." },
      { title: "Errors carry a position", body: "A syntax error reports the line and column of the first token that could not start a valid value." },
      { title: "Tree view", body: "Browse the parsed result, collapse branches, and copy any node's value or its JSON path." },
    ],
  },
  "json-to-code": {
    summary: "A type model is inferred from your sample, then emitted in each language's own conventions.",
    points: [
      { title: "One sample is a guess", body: "Types come from the data you paste. A field that happens to be null in your sample is unknown-and-nullable, not 'the null type'." },
      { title: "Unify all vs First only", body: "Unify all inspects every element of an array, so a key missing from some becomes optional. First only trusts element zero." },
      { title: "Names are converted", body: "Members follow each language's convention, and the original key is preserved with that language's serialisation attribute wherever the two differ." },
    ],
  },
  base64: {
    summary: "Text is encoded through TextEncoder rather than btoa, which throws on any character above U+00FF.",
    points: [
      { title: "UTF-8 is handled properly", body: "Accents and emoji encode and decode correctly in both directions — the case that breaks a one-line btoa implementation." },
      { title: "Both alphabets decode", body: "Paste a URL-safe token without flipping the toggle first. The toggle only controls what is produced." },
      { title: "Not all bytes are text", body: "If decoded bytes are not valid UTF-8 you get a hex view and a download instead of replacement characters." },
    ],
  },
  epoch: {
    summary: "The unit is inferred from the magnitude of the number, and every rendering is derived from a single instant.",
    points: [
      { title: "Auto-detection", body: "Ten digits reads as seconds, thirteen as milliseconds, sixteen as microseconds. Override it when your data disagrees." },
      { title: "Before 1970", body: "Negative timestamps are valid and render correctly, which many converters get wrong." },
      { title: "Zones are real", body: "The zoned row uses the IANA database via Intl, so daylight saving is applied rather than a fixed offset." },
    ],
  },
  regex: {
    summary: "Your pattern is compiled by the browser's own engine, so behaviour matches what your JavaScript will do exactly.",
    points: [
      { title: "Group positions are exact", body: "Capture positions come from the engine's indices, not from searching the match text — so repeated captures are still located correctly." },
      { title: "Backtracking cannot be interrupted", body: "A budget stops a slow run BETWEEN matches, but no JavaScript regex can be aborted mid-match. Nested quantifiers get a warning before you paste a long input." },
      { title: "Replacement syntax", body: "$1 for numbered groups, $<name> for named ones — the same syntax String.replace accepts." },
    ],
  },
  "yaml-json": {
    summary: "YAML is parsed to a value and re-serialised as JSON, or the reverse — which means anything JSON cannot represent is dropped.",
    points: [
      { title: "Comments and anchors are lost", body: "JSON has neither. The warning fires before you copy the result, not after." },
      { title: "Flow versus block", body: "Block style is the readable default. Flow style inlines collections, closer to JSON." },
      { title: "Errors name a line", body: "A YAML syntax error reports where the parser gave up." },
    ],
  },
  "sql-format": {
    summary: "The statement is tokenised per dialect, then printed — so keywords and structure are understood rather than pattern-matched.",
    points: [
      { title: "Dialect matters", body: "Each dialect knows its own keywords and functions. Formatting T-SQL as standard SQL can misread constructs it does not have." },
      { title: "Leading commas", body: "Applied after formatting, because the underlying library dropped that option — the comma moves into the previous line's indentation so columns stay aligned." },
      { title: "Nothing is executed", body: "This only reformats text. No connection, no parsing of your data, no query ever runs." },
    ],
  },
  guid: {
    summary: "v4 and v7 are generated here from crypto.getRandomValues, with the version and variant bits set as the RFC requires.",
    points: [
      { title: "v4 or v7", body: "v4 is 122 random bits. v7 puts a millisecond timestamp first, so a batch sorts in creation order — usually the better database key." },
      { title: "v5 is deterministic", body: "It hashes a namespace and a name, so the same inputs always produce the same UUID. A batch of v5 repeats one value by definition." },
      { title: "Not a secret", body: "A UUID is an identifier, not a credential. Use the Password Generator for anything that needs to be unguessable." },
    ],
  },
  password: {
    summary: "Every character is drawn from crypto.getRandomValues by rejection sampling, never Math.random and never a modulo.",
    points: [
      { title: "Why rejection sampling", body: "Taking byte % 62 would make the first eight characters of the pool measurably more likely. Out-of-range draws are discarded and redrawn instead." },
      { title: "Entropy is computed, not guessed", body: "Bits are length times log2 of the actual pool size, so it falls when you exclude look-alike characters." },
      { title: "Nothing is stored", body: "This tool never writes to storage and has no share link. Generated passwords die with the tab." },
    ],
  },
  hash: {
    summary: "Digests are computed in a WebAssembly implementation in this tab, against published test vectors.",
    points: [
      { title: "Files stream", body: "A file is hashed in chunks through an incremental hasher, so a large file never has to fit in memory." },
      { title: "HMAC needs a key", body: "Enter a key to switch from a plain digest to HMAC. Leave it empty for a normal hash." },
      { title: "MD5 and SHA-1 are here for compatibility", body: "Both are broken for security purposes. Use them to check a legacy checksum, not to protect anything." },
    ],
  },
  jwt: {
    summary: "Decoding and verification are separate operations, and this tool never lets one imply the other.",
    points: [
      { title: "Three states, not two", body: "Signature valid, signature invalid, and not verified are different answers. An empty key gives not verified — never invalid." },
      { title: "alg: none is never valid", body: "An unsigned token cannot be verified by any key. This tool refuses to report it valid, because that is the classic forgery vector." },
      { title: "Claims are read, not trusted", body: "exp, nbf and iat are rendered with their state. A token whose claims look fine can still have a bad signature." },
      { title: "Nothing is stored", body: "Tokens and secrets are never persisted and never shareable by link." },
    ],
  },
  "ip-calculator": {
    summary: "Addresses are converted to integers, masked, and converted back — with the small prefixes special-cased.",
    points: [
      { title: "/31 and /32", body: "A /32 is one host. A /31 is an RFC 3021 point-to-point pair with no broadcast. The usual size-minus-two formula gives 0 and -1, which is simply wrong." },
      { title: "Masks or prefixes", body: "Give an address with /24 or with 255.255.255.0 — both produce the same report. A non-contiguous mask is rejected." },
      { title: "IPv6 uses BigInt", body: "A /64 holds 2^64 addresses, well past what a JavaScript number can hold, so the count is returned as a string." },
    ],
  },
  "curl-convert": {
    summary: "The command is tokenised the way a shell would, then re-emitted in your target language.",
    points: [
      { title: "Nothing is sent", body: "The request is parsed and printed as code. This tool never executes it." },
      { title: "Unsupported flags are listed", body: "Anything this converter does not model appears above the output rather than being dropped silently." },
      { title: "Quoting is handled", body: "Single and double quotes, line continuations, and a quoted string containing the other quote character all parse correctly." },
    ],
  },
  "http-inspector": {
    summary: "The message is split at its first blank line, then the start line and headers are parsed and the body analysed by its content type.",
    points: [
      { title: "Both endings work", body: "Pasted text usually loses its carriage returns, so CRLF and LF are treated identically." },
      { title: "Bytes, not characters", body: "Body size is counted in UTF-8 bytes, which is what Content-Length would report." },
      { title: "Credentials are summarised", body: "Basic auth is decoded, and a Bearer JWT is summarised by algorithm and subject rather than echoed back at you." },
    ],
  },
  cron: {
    summary: "The expression is expanded, described in words, and projected forward in the time zone you choose.",
    points: [
      { title: "Five fields or six", body: "Five is the standard minute-hour-day-month-weekday. Six adds seconds at the front. Macros like @daily expand to the five-field form." },
      { title: "Zones change the answer", body: "The next runs are computed in the selected zone, so daylight saving is applied rather than assumed away." },
      { title: "Errors name the field", body: "An out-of-range value reports which of the five or six positions was wrong and what range it accepts." },
    ],
  },
  sorting: {
    summary: "Each algorithm runs to completion and every read and write is recorded as a frame, so the playback is the real algorithm rather than an animation of one.",
    points: [
      { title: "Comparisons versus writes", body: "Counted separately because they cost differently. Selection sort makes at most n swaps but always does n-squared comparisons — a good trade when writing is expensive." },
      { title: "Best case is not a footnote", body: "Bubble and insertion finish an already-sorted array in one linear pass. Selection sort cannot: it always scans the rest of the list to find the minimum." },
      { title: "Stability", body: "A stable sort keeps equal elements in their original order. It matters the moment you sort by one field having already sorted by another." },
      { title: "Why quicksort still wins", body: "Its worst case is quadratic, but its constant factors and cache behaviour beat merge sort in practice — which is why real implementations randomise the pivot instead of abandoning it." },
    ],
  },
  bst: {
    summary: "Every node holds a value larger than everything in its left subtree and smaller than everything in its right, which is exactly what makes an in-order walk come out sorted.",
    points: [
      { title: "Height is the cost", body: "Lookup, insert and delete all walk from the root down, so each costs one comparison per level. A balanced tree of n nodes is about log2(n) deep." },
      { title: "Sorted input is the trap", body: "Insert in ascending order and every node becomes a right child. The tree is now a linked list and every operation is O(n) — which is why real code uses AVL or red-black trees that rebalance." },
      { title: "Deleting a node with two children", body: "It cannot simply be removed. It is replaced by its in-order successor, the smallest value on its right, because that is the only value that keeps every ordering invariant intact." },
      { title: "Traversals are different tools", body: "In-order sorts, pre-order copies, post-order frees, level-order is breadth-first search. Same shape; the order you visit it decides what you can do with it." },
    ],
  },
  pathfinding: {
    summary: "All three algorithms run the same loop and differ only in which cell they take from the frontier next — which is the entire lesson.",
    points: [
      { title: "The frontier decides everything", body: "Breadth-first takes the oldest cell (a queue), depth-first takes the newest (a stack), A* takes the most promising. Same code, completely different behaviour." },
      { title: "Why BFS is shortest", body: "It explores in rings of equal distance, so the first time it reaches the goal it cannot have taken a longer route. That guarantee costs memory: the whole frontier is held at once." },
      { title: "What A* adds", body: "Cost so far plus an estimate of the cost remaining. Because the estimate never overshoots the true distance, the shortest-path guarantee survives while far fewer cells get explored." },
      { title: "Failure has a cost too", body: "Proving no path exists means exhausting every reachable cell. Seal the goal and watch the search fill the whole grid before it can answer." },
    ],
  },
  "big-o": {
    summary: "Big-O describes how cost grows with input size, not how fast something runs — which is why the constant factors it ignores still decide real performance.",
    points: [
      { title: "Average is not worst", body: "Quicksort and hash tables are both O(n) in the worst case and both are used everywhere, because the bad case is rare or avoidable. A table showing only the average would hide that." },
      { title: "Growth beats constants, eventually", body: "An O(n squared) algorithm with tiny constants can beat O(n log n) on small inputs. That is why real sorts switch to insertion sort under a threshold." },
      { title: "Space is a real budget", body: "Merge sort's guaranteed O(n log n) costs O(n) extra memory. Heapsort gives the same guarantee in O(1) space and loses on cache behaviour instead." },
      { title: "Amortised is not average", body: "A dynamic array append is amortised O(1): most are free and the occasional resize copies everything. Any single call can still be slow." },
    ],
  },
  patterns: {
    summary: "Coding interviews reuse a small number of shapes, so the skill being tested is recognising which one a problem is — not recalling a solution you have seen before.",
    points: [
      { title: "Read the signal, not the title", body: "Two Sum is not a problem to memorise. 'Find the complement' is a hash map; 'sorted, find a pair' is two pointers; 'longest contiguous' is a sliding window." },
      { title: "A hundred understood beats five hundred seen", body: "For each problem be able to say why the approach works, what it costs in time and space, and which edge cases exist. That is what a follow-up question probes." },
      { title: "Complexity is part of the answer", body: "Stating the approach without its cost is half an answer. Interviewers ask for time and space because the trade-off is the actual decision." },
      { title: "DSA is not the whole interview", body: "For a mid-level backend role it is roughly a third. System design, the language itself, and real production experience carry as much weight — more, outside big tech." },
    ],
  },
};
