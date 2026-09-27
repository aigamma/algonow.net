import { useEffect, useRef, useState } from 'react';
import { useCanvasLoop, isStill, holdTicks } from './useCanvasLoop.js';

// A short training text laid out as tokens (characters at first, with
// a word-end mark). Each tick finds the most frequent adjacent pair
// (amber), merges it everywhere, and adds one token to the vocabulary.
// The counters track tokens per word on the training text and on a
// held-out sentence encoded with the same merges, so the compression
// and the generalization gap are both visible. Bytes in the code;
// characters here, for the eye.
const W = 640;
const H = 300;
const TRAIN = 'the clerk kept the ledger and the ledger kept the town in the loop and the loop turned the mill and the mill turned the grain';
const HELD = 'the miller and the clerk turned the pages of the ledger';
const MERGES = 40;
const END = '▁';

function tokenize(text) {
  return text.split(' ').map((w) => [...(w + END)]);
}

function pairCounts(words) {
  const counts = new Map();
  for (const w of words) for (let i = 0; i < w.length - 1; i++) {
    const key = `${w[i]}\u0000${w[i + 1]}`;
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return counts;
}

function applyMerge(words, a, b) {
  for (const w of words) {
    let i = 0;
    while (i < w.length - 1) {
      if (w[i] === a && w[i + 1] === b) w.splice(i, 2, a + b);
      else i += 1;
    }
  }
}

export function makeScene() {
  const train = tokenize(TRAIN);
  const held = tokenize(HELD);
  const vocab = new Set();
  for (const w of train) for (const t of w) vocab.add(t);
  return { train, held, vocab, merges: [], last: null, done: false, base: vocab.size, history: [] };
}

export function tokensPerWord(words) {
  return words.reduce((s, w) => s + w.length, 0) / words.length;
}

export function sceneTick(sc) {
  if (sc.done) return true;
  const counts = pairCounts(sc.train);
  let best = null;
  let bestCount = 1;
  for (const [key, c] of counts) if (c > bestCount || (c === bestCount && best !== null && key < best)) {
    if (c > bestCount || c === bestCount) {
      best = key;
      bestCount = c;
    }
  }
  if (best === null || sc.merges.length >= MERGES) {
    sc.done = true;
    return true;
  }
  const [a, b] = best.split('\u0000');
  applyMerge(sc.train, a, b);
  applyMerge(sc.held, a, b);
  sc.merges.push([a, b]);
  sc.vocab.add(a + b);
  sc.last = { a, b, count: bestCount };
  sc.history.push([tokensPerWord(sc.train), tokensPerWord(sc.held)]);
  return false;
}

export function roundTrip(words, text) {
  return words.map((w) => w.join('').replace(END, '')).join(' ') === text;
}

export default function BpeViz() {
  const canvasRef = useRef(null);
  const cycle = useRef(0);
  const statsRef = useRef({ line: '' });
  const [restart, setRestart] = useState(0);
  const [snap, setSnap] = useState({ line: '' });

  useEffect(() => {
    const id = setInterval(() => setSnap({ ...statsRef.current }), 400);
    return () => clearInterval(id);
  }, []);

  useCanvasLoop(
    canvasRef,
    {
      width: W,
      height: H,
      stepMs: 700,
      init: () => ({ scene: makeScene(), done: false, rest: 0, stopAtRest: isStill() }),
      tick: (s) => {
        if (s.done) {
          if (s.stopAtRest) return false;
          s.rest += 1;
          if (s.rest > holdTicks(s)) {
            cycle.current += 1;
            Object.assign(s, { scene: makeScene(), done: false, rest: 0 });
          }
          return true;
        }
        if (sceneTick(s.scene)) s.done = true;
        return true;
      },
      draw: (ctx, s) => {
        ctx.clearRect(0, 0, W, H);
        const css = getComputedStyle(document.documentElement);
        const algo = css.getPropertyValue('--algo').trim() || '#5da2ff';
        const heur = css.getPropertyValue('--heur').trim() || '#f0b94b';
        const good = css.getPropertyValue('--path').trim() || '#62d98a';
        const dim = css.getPropertyValue('--ink-dim').trim() || '#9aa5bd';
        const ink = css.getPropertyValue('--ink').trim() || '#e9edf6';
        const sc = s.scene;
        ctx.font = '11px ui-monospace, monospace';
        ctx.fillStyle = dim;
        ctx.fillText(`merge ${sc.merges.length} of ${MERGES}: vocabulary ${sc.vocab.size} (${sc.base} characters + ${sc.merges.length} merges); one most-frequent pair merged per tick`, 12, 18);
        // tokens of the training text, wrapped
        let x = 12;
        let y = 44;
        ctx.font = '12px ui-monospace, monospace';
        const lastTok = sc.last ? sc.last.a + sc.last.b : null;
        for (const w of sc.train) {
          const width = w.reduce((a, t) => a + ctx.measureText(t).width + 8, 0) + 6;
          if (x + width > W - 12) {
            x = 12;
            y += 24;
          }
          for (const t of w) {
            const tw = ctx.measureText(t).width + 8;
            ctx.fillStyle = t === lastTok ? `${heur}55` : `${algo}33`;
            ctx.fillRect(x, y - 13, tw - 2, 18);
            ctx.fillStyle = t === lastTok ? heur : ink;
            ctx.fillText(t, x + 3, y);
            x += tw;
          }
          x += 6;
        }
        ctx.font = '11px ui-monospace, monospace';
        const ty = Math.max(y + 30, 200);
        ctx.fillStyle = heur;
        ctx.fillText(sc.last ? `merged "${sc.last.a}" + "${sc.last.b}" (${sc.last.count} times) into "${sc.last.a + sc.last.b}"` : 'starting from single characters', 12, ty);
        ctx.fillStyle = algo;
        ctx.fillText(`training text: ${tokensPerWord(sc.train).toFixed(2)} tokens per word`, 12, ty + 18);
        ctx.fillStyle = dim;
        ctx.fillText(`held-out sentence, same merges: ${tokensPerWord(sc.held).toFixed(2)} tokens per word`, 12, ty + 36);
        // held-out tokens
        let hx = 12;
        const hy = ty + 60;
        ctx.font = '11px ui-monospace, monospace';
        for (const w of sc.held) {
          for (const t of w) {
            const tw = ctx.measureText(t).width + 6;
            if (hx + tw > W - 12) break;
            ctx.fillStyle = `${dim}33`;
            ctx.fillRect(hx, hy - 11, tw - 2, 15);
            ctx.fillStyle = ink;
            ctx.fillText(t, hx + 2, hy);
            hx += tw;
          }
          hx += 5;
        }
        let line;
        if (s.done) {
          const [tr, ho] = sc.history[sc.history.length - 1];
          line = `${sc.merges.length} merges: ${tr.toFixed(2)} tokens per word on the training text, ${ho.toFixed(2)} held out; every word still decodes exactly`;
          ctx.fillStyle = good;
        } else {
          line = 'the vocabulary is the corpus’s own most common fragments, and nothing else';
          ctx.fillStyle = ink;
        }
        ctx.fillText(line, 12, H - 8);
        statsRef.current = { line };
      },
    },
    [restart],
  );

  return (
    <>
      <canvas ref={canvasRef} style={{ aspectRatio: `${W} / ${H}` }} aria-hidden="true" />
      <div className="viz-controls">
        <button
          type="button"
          className="btn"
          onClick={() => {
            cycle.current += 1;
            setRestart((t) => t + 1);
          }}
        >
          replay
        </button>
        <span className="viz-stat">{snap.line || 'merging…'}</span>
      </div>
    </>
  );
}
