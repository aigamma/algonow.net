import DiagramViewport from '../components/DiagramViewport.jsx';
import { useEffect, useRef, useState } from 'react';
import { useCanvasLoop, isStill, holdTicks, mulberry32 } from './useCanvasLoop.js';

// The shunting yard on a seeded random expression, one token per tick:
// the input tape with the read head, the operator stack growing upward,
// and the output queue growing to the right. A number goes to the output
// at once; an operator pops everything that binds at least as tightly
// (strictly, for right-associative **) before it is pushed; parentheses
// are walls. At the end the postfix is evaluated by a one-stack machine
// and compared with an independent recursive evaluator of the infix: the
// invariant checked is that the two agree and the output is a permutation
// of the input without parentheses.
const W = 640;
const H = 300;
const SEED = 20261010;
const PREC = { '+': [2, 'left'], '-': [2, 'left'], '*': [3, 'left'], '/': [3, 'left'], '**': [5, 'right'] };

function genExpr(rand, depth) {
  const r = rand();
  if (depth <= 0 || r < 0.35) return [String(1 + Math.floor(rand() * 9))];
  if (r < 0.5) return ['(', ...genExpr(rand, depth - 1), ')'];
  const ops = ['+', '-', '*', '/', '**'];
  const op = ops[Math.floor(rand() * ops.length)];
  const left = genExpr(rand, depth - 1);
  const right = op === '**' ? [String(1 + Math.floor(rand() * 2))] : genExpr(rand, depth - 1);
  return [...left, op, ...right];
}

// an independent referee: recursive descent over the same token list
function evalInfix(tokens) {
  let i = 0;
  const peek = () => tokens[i];
  const expr = () => {
    let v = term();
    while (peek() === '+' || peek() === '-') {
      const op = tokens[i++];
      const w = term();
      v = op === '+' ? v + w : v - w;
    }
    return v;
  };
  const term = () => {
    let v = power();
    while (peek() === '*' || peek() === '/') {
      const op = tokens[i++];
      const w = power();
      v = op === '*' ? v * w : v / w;
    }
    return v;
  };
  const power = () => {
    const base = atom();
    if (peek() === '**') {
      i += 1;
      return base ** power();
    }
    return base;
  };
  const atom = () => {
    const t = tokens[i++];
    if (t === '(') {
      const v = expr();
      i += 1;
      return v;
    }
    return Number(t);
  };
  return expr();
}

function evalPostfix(out) {
  const st = [];
  for (const t of out) {
    if (/^\d/.test(t)) st.push(Number(t));
    else {
      const b = st.pop();
      const a = st.pop();
      if (a === undefined || b === undefined) return NaN;
      st.push(t === '+' ? a + b : t === '-' ? a - b : t === '*' ? a * b : t === '/' ? a / b : a ** b);
    }
  }
  return st.length === 1 ? st[0] : NaN;
}

export function makeScene(seed) {
  const rand = mulberry32(seed);
  let tokens = genExpr(rand, 4);
  while (tokens.length < 7 || tokens.length > 17) tokens = genExpr(rand, 4);
  return { tokens, i: 0, stack: [], out: [], popped: 0, last: `expression: ${tokens.join(' ')}; reading left to right, one token per tick`, done: false, ok: true, result: null, expect: evalInfix(tokens) };
}

export function sceneTick(sc) {
  if (sc.done) return true;
  if (sc.i >= sc.tokens.length) {
    while (sc.stack.length) {
      sc.out.push(sc.stack.pop());
      sc.popped += 1;
    }
    sc.result = evalPostfix(sc.out);
    const inputItems = sc.tokens.filter((t) => t !== '(' && t !== ')').slice().sort().join(' ');
    const outItems = sc.out.slice().sort().join(' ');
    sc.ok = inputItems === outItems && Math.abs(sc.result - sc.expect) < 1e-9 * Math.max(1, Math.abs(sc.expect));
    sc.done = true;
    sc.last = `end: stack drained; postfix ${sc.out.join(' ')} evaluates to ${fmt(sc.result)}; the infix referee says ${fmt(sc.expect)}; ${sc.popped} pops for ${sc.tokens.length} tokens`;
    return true;
  }
  const t = sc.tokens[sc.i];
  sc.i += 1;
  if (/^\d/.test(t)) {
    sc.out.push(t);
    sc.last = `${t}: a number goes straight to the output`;
  } else if (t === '(') {
    sc.stack.push(t);
    sc.last = '(: a wall on the stack';
  } else if (t === ')') {
    let n = 0;
    while (sc.stack.length && sc.stack[sc.stack.length - 1] !== '(') {
      sc.out.push(sc.stack.pop());
      sc.popped += 1;
      n += 1;
    }
    sc.stack.pop();
    sc.last = `): ${n} operator${n === 1 ? '' : 's'} popped to the output, the wall removed`;
  } else {
    const [p, assoc] = PREC[t];
    let n = 0;
    while (sc.stack.length) {
      const top = sc.stack[sc.stack.length - 1];
      if (top === '(') break;
      const [tp] = PREC[top];
      if (tp > p || (tp === p && assoc === 'left')) {
        sc.out.push(sc.stack.pop());
        sc.popped += 1;
        n += 1;
      } else break;
    }
    sc.stack.push(t);
    sc.last = n === 0 ? `${t}: nothing on the stack binds as tightly; pushed` : `${t}: popped ${n} operator${n === 1 ? '' : 's'} that bind at least as tightly, then pushed`;
  }
  return false;
}

function fmt(v) {
  return Number.isInteger(v) ? String(v) : v.toFixed(4);
}

export default function ShuntingYardViz() {
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
      stepMs: 800,
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
        ctx.fillText('one token per tick: blue numbers to output; amber operators wait on the stack', 12, 18);
        // input tape
        const cw = Math.min(36, Math.floor(600 / Math.max(sc.tokens.length, 1)));
        ctx.fillText('input', 12, 44);
        sc.tokens.forEach((t, k) => {
          const x = 60 + k * cw;
          const read = k < sc.i;
          const isNum = /^\d/.test(t);
          ctx.fillStyle = read ? `${dim}33` : isNum ? algo : t === '(' || t === ')' ? `${dim}99` : heur;
          ctx.fillRect(x, 32, cw - 4, 20);
          ctx.fillStyle = read ? dim : '#0b0d12';
          ctx.fillText(t, x + 4, 46);
          if (k === sc.i - 1 && !s.done) {
            ctx.fillStyle = ink;
            ctx.fillText('^', x + 4, 64);
          }
        });
        // operator stack
        ctx.fillStyle = dim;
        ctx.fillText('stack (top ↑)', 12, 92);
        sc.stack.forEach((t, k) => {
          const y = 230 - k * 22;
          ctx.fillStyle = t === '(' ? `${dim}66` : `${heur}cc`;
          ctx.fillRect(20, y, 60, 18);
          ctx.fillStyle = '#0b0d12';
          ctx.fillText(t, 26, y + 13);
        });
        ctx.strokeStyle = `${dim}66`;
        ctx.strokeRect(16, 96, 68, 156);
        // output queue
        ctx.fillStyle = dim;
        ctx.fillText('output (postfix)', 120, 92);
        sc.out.forEach((t, k) => {
          const x = 120 + (k % 14) * 36;
          const y = 100 + Math.floor(k / 14) * 24;
          ctx.fillStyle = /^\d/.test(t) ? algo : heur;
          ctx.fillRect(x, y, 32, 18);
          ctx.fillStyle = '#0b0d12';
          ctx.fillText(t, x + 6, y + 13);
        });
        ctx.fillStyle = dim;
        ctx.fillText(`${sc.popped} pops so far for ${sc.i} tokens read; the file: at most 1.50 stack operations per token`, 120, 200);
        if (s.done) {
          ctx.fillStyle = sc.ok ? good : warn;
          ctx.fillText(sc.ok ? `postfix value ${fmt(sc.result)} agrees with the infix referee` : 'MISMATCH WITH THE REFEREE', 120, 222);
        } else {
          ctx.fillStyle = dim;
          ctx.fillText('postfix runs on one stack; checked against a recursive evaluator', 120, 222);
        }
        let line;
        if (s.done) {
          line = sc.last;
          ctx.fillStyle = sc.ok ? good : warn;
        } else {
          line = sc.last;
          ctx.fillStyle = ink;
        }
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
          new expression
        </button>
        <span className="viz-stat">{snap.line || 'shunting…'}</span>
      </div>
    </>
  );
}
