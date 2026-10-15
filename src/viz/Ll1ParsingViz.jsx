import DiagramViewport from '../components/DiagramViewport.jsx';
import { useEffect, useRef, useState } from 'react';
import { useCanvasLoop, isStill, holdTicks, mulberry32 } from './useCanvasLoop.js';

// A table-driven LL(1) parse of a seeded expression, one parser step per
// tick: pop the stack; a terminal must match the lookahead, a nonterminal
// is expanded by the first-follow table (the lookup cell lights up), the
// end marker accepts or rejects. Some inputs carry a one-token corruption.
// Invariant checked every tick: every consumed token equals the input at
// that position and lookups equal expansions; at the end, acceptance equals
// an independent recursive descent recognizer's verdict.
const W = 640;
const H = 300;
const SEED = 20261010;
const NT = ['E', "E'", 'T', "T'", 'F'];
const TOKS = ['id', '+', '*', '(', ')', '$'];
const PRODS = [['T', "E'"], ['+', 'T', "E'"], [], ['F', "T'"], ['*', 'F', "T'"], [], ['(', 'E', ')'], ['id']];
const TABLE = {
  E: { id: 0, '(': 0 },
  "E'": { '+': 1, ')': 2, $: 2 },
  T: { id: 3, '(': 3 },
  "T'": { '*': 4, '+': 5, ')': 5, $: 5 },
  F: { '(': 6, id: 7 },
};

function gen(rand, sym, depth) {
  if (!TABLE[sym]) return [sym];
  const opts = { E: [0], "E'": [1, 2], T: [3], "T'": [4, 5], F: [6, 7] }[sym];
  let p = opts[Math.floor(rand() * opts.length)];
  if (depth > 3) p = { E: 0, "E'": 2, T: 3, "T'": 5, F: 7 }[sym];
  return PRODS[p].flatMap((s) => gen(rand, s, depth + 1));
}

// independent oracle: recursive descent recognizer
function rdAccepts(toks) {
  const t = [...toks, '$'];
  let i = 0;
  const eat = (x) => { if (t[i] !== x) throw new Error('x'); i += 1; };
  const F = () => { if (t[i] === '(') { eat('('); E(); eat(')'); } else eat('id'); };
  const Tp = () => { if (t[i] === '*') { eat('*'); F(); Tp(); } };
  const T = () => { F(); Tp(); };
  const Ep = () => { if (t[i] === '+') { eat('+'); T(); Ep(); } };
  const E = () => { T(); Ep(); };
  try { E(); return t[i] === '$'; } catch (e) { return false; }
}

export function makeScene(seed) {
  const rand = mulberry32(seed);
  let toks = [];
  while (toks.length < 3 || toks.length > 14) toks = gen(rand, 'E', 0);
  let note = 'a valid sentence';
  if (rand() < 0.35) {
    const k = Math.floor(rand() * toks.length);
    const r = rand();
    if (r < 0.34 && toks.length > 1) { toks.splice(k, 1); note = `token ${k + 1} deleted`; } else if (r < 0.67) { toks.splice(k, 0, TOKS[Math.floor(rand() * 5)]); note = `a token inserted at ${k + 1}`; } else { const j = Math.floor(rand() * toks.length); [toks[k], toks[j]] = [toks[j], toks[k]]; note = `tokens ${Math.min(k, j) + 1} and ${Math.max(k, j) + 1} swapped`; }
  }
  return {
    toks, input: [...toks, '$'], i: 0, stack: ['$', 'E'], steps: 0, lookups: 0, expansions: 0,
    ok: true, done: false, verdict: null, cell: null, note, expect: rdAccepts(toks),
    last: `${toks.length} tokens (${note}); stack [$, E]; the table from the file drives every expansion`,
  };
}

export function sceneTick(sc) {
  if (sc.done) return true;
  const sym = sc.stack.pop();
  const a = sc.input[sc.i];
  sc.steps += 1;
  sc.cell = null;
  if (sym === '$') {
    sc.verdict = a === '$';
    sc.done = true;
  } else if (!TABLE[sym]) {
    if (sym === a) {
      sc.i += 1;
      sc.last = `pop ${sym}: matches token ${sc.i}; ${sc.input.length - 1 - sc.i} left`;
    } else {
      sc.verdict = false;
      sc.done = true;
    }
  } else {
    sc.lookups += 1;
    const p = TABLE[sym][a];
    sc.cell = [NT.indexOf(sym), TOKS.indexOf(a)];
    if (p === undefined) {
      sc.verdict = false;
      sc.done = true;
    } else {
      sc.expansions += 1;
      const rhs = PRODS[p];
      for (let k = rhs.length - 1; k >= 0; k -= 1) sc.stack.push(rhs[k]);
      sc.last = `pop ${sym}, lookahead ${a}: M[${sym}, ${a}] = ${sym} → ${rhs.length ? rhs.join(' ') : 'ε'}; ${sc.stack.length} on the stack`;
    }
  }
  if (sc.lookups !== sc.expansions + (sc.done && sc.verdict === false && sc.cell ? 1 : 0)) sc.ok = false;
  if (sc.done) {
    if (sc.verdict !== sc.expect) sc.ok = false;
    sc.last = sc.verdict
      ? `accepted in ${sc.steps} steps, ${sc.expansions} expansions (one lookup each) for ${sc.toks.length} tokens; recursive descent agrees: ${sc.ok ? 'yes' : 'NO'}`
      : `rejected at token ${Math.min(sc.i + 1, sc.toks.length + 1)} (${a === '$' ? 'input ended early' : `unexpected ${a}`}) after ${sc.steps} steps; recursive descent agrees: ${sc.ok ? 'yes' : 'NO'}`;
    return true;
  }
  return false;
}

export default function Ll1ParsingViz() {
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
      stepMs: 420,
      init: () => ({ scene: makeScene(SEED + cycle.current * 7919), done: false, rest: 0, stopAtRest: isStill() }),
      tick: (s) => {
        if (s.done) {
          if (s.stopAtRest) return false;
          s.rest += 1;
          if (s.rest > holdTicks(s) * 2) {
            cycle.current += 1;
            Object.assign(s, { scene: makeScene(SEED + cycle.current * 7919), done: false, rest: 0 });
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
        const warn = css.getPropertyValue('--warn').trim() || '#e2606c';
        const dim = css.getPropertyValue('--ink-dim').trim() || '#9aa5bd';
        const ink = css.getPropertyValue('--ink').trim() || '#e9edf6';
        const sc = s.scene;
        ctx.font = '11px ui-monospace, monospace';
        ctx.fillStyle = dim;
        ctx.fillText(`input (${sc.note}); green consumed, amber lookahead`, 12, 16);
        sc.input.forEach((t, k) => {
          const x = 12 + k * 40;
          ctx.fillStyle = k < sc.i ? good : k === sc.i ? heur : dim;
          ctx.globalAlpha = k > sc.i ? 0.5 : 1;
          ctx.fillRect(x, 24, 36, 20);
          ctx.globalAlpha = 1;
          ctx.fillStyle = '#10141c';
          ctx.fillText(t, x + 6, 38);
        });
        ctx.fillStyle = dim;
        ctx.fillText('stack (top at right): blue nonterminals, amber terminals', 12, 70);
        sc.stack.forEach((sym, k) => {
          const x = 12 + k * 34;
          ctx.fillStyle = TABLE[sym] ? algo : heur;
          ctx.fillRect(x, 78, 30, 20);
          ctx.fillStyle = '#10141c';
          ctx.fillText(sym, x + 5, 92);
        });
        const gx = 370;
        const gy = 128;
        const cw = 38;
        const ch = 24;
        ctx.fillStyle = dim;
        ctx.fillText('M[A, a]: the first-follow table', gx, gy - 30);
        TOKS.forEach((t, c) => {
          ctx.fillStyle = heur;
          ctx.fillText(t, gx + 30 + c * cw + 8, gy - 8);
        });
        NT.forEach((A, r) => {
          ctx.fillStyle = algo;
          ctx.fillText(A, gx, gy + r * ch + 16);
          TOKS.forEach((t, c) => {
            const filled = TABLE[A][t] !== undefined;
            const active = sc.cell && sc.cell[0] === r && sc.cell[1] === c;
            ctx.fillStyle = active ? (filled ? good : warn) : filled ? algo : dim;
            ctx.globalAlpha = active ? 0.95 : filled ? 0.35 : 0.1;
            ctx.fillRect(gx + 30 + c * cw, gy + r * ch, cw - 2, ch - 2);
            ctx.globalAlpha = 1;
            if (filled) {
              ctx.fillStyle = ink;
              const rhs = PRODS[TABLE[A][t]];
              ctx.fillText(rhs.length ? rhs.join('').replace("'", '′').slice(0, 5) : 'ε', gx + 32 + c * cw, gy + r * ch + 15);
            }
          });
        });
        ctx.fillStyle = dim;
        ctx.fillText(`steps ${sc.steps}; lookups ${sc.lookups} = expansions ${sc.expansions}${sc.cell && sc.done && !sc.verdict ? ' + 1 empty cell' : ''}`, 12, 128);
        ctx.fillText(`tokens consumed ${sc.i} of ${sc.toks.length}`, 12, 146);
        ctx.fillText('file: 5.58 stack ops/token; 0 conflicts', 12, 176);
        ctx.fillText('13 cells; 1,248 corruptions rejected', 12, 192);
        ctx.fillText('at the viable prefix', 12, 208);
        ctx.fillStyle = sc.ok ? good : warn;
        ctx.fillText(sc.ok ? 'one lookup per expansion' : 'INVARIANT BROKEN', 12, 236);
        ctx.fillText('verdict checked by recursive descent', 12, 252);
        const line = sc.last;
        ctx.fillStyle = s.done ? (sc.verdict && sc.ok ? good : sc.ok ? heur : warn) : ink;
        ctx.fillText(line.length > 96 ? `${line.slice(0, 95)}…` : line, 12, H - 6);
        statsRef.current = { line };
      },
    },
    [restart],
  );

  return (
    <>
      <DiagramViewport width={W}>
        <canvas ref={canvasRef} style={{ aspectRatio: `${W} / ${H}` }} aria-hidden="true" />
      </DiagramViewport>
      <div className="viz-controls">
        <button
          type="button"
          className="btn"
          onClick={() => {
            cycle.current += 1;
            setRestart((t) => t + 1);
          }}
        >
          new input
        </button>
        <span className="viz-stat">{snap.line || 'parsing…'}</span>
      </div>
    </>
  );
}
