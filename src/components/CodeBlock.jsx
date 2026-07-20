import { useState } from 'react';
import { tokenizePython } from '../lib/pyhl.js';

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
  const tokens = tokenizePython(code.trimEnd());

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
      <pre>
        <code>
          {tokens.map((tok, i) =>
            tok.t === 'plain' ? (
              tok.s
            ) : (
              <span key={i} className={CLASS_FOR[tok.t]}>{tok.s}</span>
            )
          )}
        </code>
      </pre>
    </div>
  );
}
