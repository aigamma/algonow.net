import { useState } from 'react';
import { pythonLines } from '../lib/pyhl.js';

const CLASS_FOR = {
  kw: 'tok-kw',
  str: 'tok-str',
  com: 'tok-com',
  num: 'tok-num',
  def: 'tok-def',
  self: 'tok-self',
};

export default function CodeBlock({ code, filename }) {
  const [copied, setCopied] = useState(false);
  const lines = pythonLines(code);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // Clipboard unavailable (permissions, http): quietly do nothing.
    }
  };

  return (
    <div className="code-block">
      <div className="code-head">
        <span>{filename}</span>
        <button type="button" className="btn" onClick={copy}>
          {copied ? 'copied' : 'copy'}
        </button>
      </div>
      <p className="code-wrap-note">Numbers mark original lines. Unnumbered rows are continuations.</p>
      <pre>
        <code>
          {lines.map((line, i) => (
            <span className="code-line" data-line={i + 1} key={i} style={{ '--code-indent': `${line.indent + 2}ch` }}>
              {line.tokens.map((tok, j) => tok.t === 'plain'
                ? tok.s
                : <span key={j} className={CLASS_FOR[tok.t]}>{tok.s}</span>)}
            </span>
          ))}
        </code>
      </pre>
    </div>
  );
}
