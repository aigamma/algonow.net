// Minimal Python tokenizer for display highlighting. A few hundred bytes in
// the bundle instead of a highlighter dependency; good enough for the site's
// own solution files, not a general parser.

const KEYWORDS = new Set([
  'False', 'None', 'True', 'and', 'as', 'assert', 'async', 'await', 'break',
  'class', 'continue', 'def', 'del', 'elif', 'else', 'except', 'finally',
  'for', 'from', 'global', 'if', 'import', 'in', 'is', 'lambda', 'nonlocal',
  'not', 'or', 'pass', 'raise', 'return', 'try', 'while', 'with', 'yield',
]);

const PATTERN = new RegExp(
  [
    '("""[\\s\\S]*?"""|\'\'\'[\\s\\S]*?\'\'\')', // 1 triple string
    '(#[^\\n]*)', // 2 comment
    '("(?:\\\\.|[^"\\\\\\n])*"|\'(?:\\\\.|[^\'\\\\\\n])*\')', // 3 string
    '\\b(def|class)(\\s+)([A-Za-z_]\\w*)', // 4,5,6 definition
    '\\b([A-Za-z_]\\w*)\\b', // 7 word
    '(\\b\\d[\\d_]*(?:\\.[\\d_]+)?(?:[eE][+-]?\\d+)?\\b)', // 8 number
  ].join('|'),
  'g'
);

// Returns [{ t: 'plain'|'kw'|'str'|'com'|'num'|'def'|'self', s: text }, ...]
export function tokenizePython(code) {
  const out = [];
  let last = 0;
  const plain = (end) => {
    if (end > last) out.push({ t: 'plain', s: code.slice(last, end) });
  };
  let m;
  while ((m = PATTERN.exec(code)) !== null) {
    plain(m.index);
    if (m[1]) out.push({ t: 'str', s: m[1] });
    else if (m[2]) out.push({ t: 'com', s: m[2] });
    else if (m[3]) out.push({ t: 'str', s: m[3] });
    else if (m[4]) {
      out.push({ t: 'kw', s: m[4] });
      out.push({ t: 'plain', s: m[5] });
      out.push({ t: 'def', s: m[6] });
    } else if (m[7]) {
      const w = m[7];
      out.push({ t: KEYWORDS.has(w) ? 'kw' : w === 'self' ? 'self' : 'plain', s: w });
    } else if (m[8]) out.push({ t: 'num', s: m[8] });
    last = PATTERN.lastIndex;
  }
  plain(code.length);
  return out;
}
