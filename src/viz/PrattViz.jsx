import { useEffect, useRef, useState } from 'react';
import { useCanvasLoop, isStill, holdTicks, mulberry32 } from './useCanvasLoop.js';

// Two acts of one courtroom. Act one: a real expression parsed
// live by the actual Pratt loop: tokens wear binding-power
// badges, each operand goes to the bigger badge, and the tree
// assembles below with the current floor on display. Act two:
// the bills: descent's tower toll (5 and 15 levels) raced
// against ~one call per token, with the flat parser's counted
// wrongness in red.
const W = 640;
const H = 300;
const SEED = 20260829;
const END_HOLD = 70;

const INFIX = { '+': [10, 11], '-': [10, 11], '*': [20, 21], '/': [20, 21], '^': [31, 30] };

export function tokenize(src) {
  const toks = [];
  for (const ch of src.replace(/\s+/g, '')) {
    if (/\d/.test(ch)) toks.push(['num', Number(ch)]);
    else toks.push([ch, null]);
  }
  toks.push(['end', null]);
  return toks;
}

export function prattParse(toks, events, calls) {
  let pos = 0;
  const parse = (minBp) => {
    if (calls) calls.c += 1;
    const [kind, val] = toks[pos];
    pos += 1;
    let left;
    if (kind === 'num') {
      left = ['num', val];
      if (events) events.push({ type: 'nud', tok: String(val) });
    } else if (kind === '-') {
      if (events) events.push({ type: 'nud', tok: 'neg' });
      left = ['neg', parse(25)];
    } else if (kind === '(') {
      left = parse(0);
      pos += 1;
    } else {
      throw new Error(kind);
    }
    for (;;) {
      const op = toks[pos][0];
      if (!(op in INFIX)) break;
      const [lbp, rbp] = INFIX[op];
      if (events) events.push({ type: 'cmp', op, lbp, floor: minBp, win: lbp > minBp });
      if (lbp <= minBp) break;
      pos += 1;
      left = [op, left, parse(rbp)];
      if (events) events.push({ type: 'node', op });
    }
    return left;
  };
  return parse(0);
}

export function descentParse(toks, levels, calls) {
  let pos = 0;
  const parseLevel = (lv) => {
    calls.c += 1;
    if (lv === 0) {
      const [kind, val] = toks[pos];
      pos += 1;
      if (kind === 'num') return ['num', val];
      if (kind === '(') {
        const e = parseLevel(levels.length - 1);
        pos += 1;
        return e;
      }
      if (kind === '-') return ['neg', parseLevel(0)];
      throw new Error(kind);
    }
    let left = parseLevel(lv - 1);
    while (levels[lv].has(toks[pos][0])) {
      const op = toks[pos][0];
      pos += 1;
      left = [op, left, parseLevel(lv - 1)];
    }
    return left;
  };
  return parseLevel(levels.length - 1);
}

export function flatParse(toks) {
  let pos = 0;
  const primary = () => {
    const [kind, val] = toks[pos];
    pos += 1;
    if (kind === 'num') return ['num', val];
    if (kind === '(') {
      const e = expr();
      pos += 1;
      return e;
    }
    if (kind === '-') return ['neg', primary()];
    throw new Error(kind);
  };
  const expr = () => {
    let left = primary();
    while (toks[pos][0] in INFIX) {
      const op = toks[pos][0];
      pos += 1;
      left = [op, left, primary()];
    }
    return left;
  };
  return expr();
}

export function evalTree(t) {
  if (t[0] === 'num') return t[1];
  if (t[0] === 'neg') return -evalTree(t[1]);
  const a = evalTree(t[1]);
  const b = evalTree(t[2]);
  return t[0] === '+' ? a + b : t[0] === '-' ? a - b : t[0] === '*' ? a * b : t[0] === '/' ? a / b : a ** b;
}

export function layoutTree(t) {
  const nodes = [];
  let x = 0;
  const walk = (n, d, parent) => {
    if (n[0] === 'num') {
      nodes.push({ label: String(n[1]), x: x++, y: d, parent });
      return nodes.length - 1;
    }
    if (n[0] === 'neg') {
      const id = nodes.push({ label: '-', x: -1, y: d, parent }) - 1;
      walk(n[1], d + 1, id);
      nodes[id].x = nodes[nodes.length - 1].x;
      return id;
    }
    const id = nodes.push({ label: n[0], x: -1, y: d, parent }) - 1;
    walk(n[1], d + 1, id);
    const mid = x - 0.5;
    walk(n[2], d + 1, id);
    nodes[id].x = mid;
    return id;
  };
  walk(t, 0, null);
  return nodes;
}

export function makeScene(seed) {
  const rand = mulberry32(seed);
  const exprs = ['1+2*3^2-4', '8/2/2+3*3', '2^2^2-9', '7-3-2*2'];
  const src = exprs[Math.floor(rand() * exprs.length)];
  const events = [];
  const tree = prattParse(tokenize(src), events, null);
  const nodes = layoutTree(tree);
  // act 2: the race on a 300-operand chain + flat wrongness on fuzz
  const chain = '1' + Array.from({ length: 300 }, () => (rand() < 0.5 ? '+' : '*') + '1').join('');
  const ctoks = tokenize(chain);
  const cp = { c: 0 };
  const t1 = prattParse(ctoks, null, cp);
  const L5 = [null, new Set(['^']), new Set(), new Set(['*', '/']), new Set(['+', '-'])];
  const c5 = { c: 0 };
  const t2 = descentParse(ctoks, L5, c5);
  const L15 = [null, ...Array.from({ length: 10 }, () => new Set()), new Set(['^']), new Set(), new Set(['*', '/']), new Set(['+', '-'])];
  const c15 = { c: 0 };
  const t3 = descentParse(ctoks, L15, c15);
  let flatWrong = 0;
  const FUZZ = 60;
  for (let i = 0; i < FUZZ; i++) {
    const n = 3 + Math.floor(rand() * 4);
    let s = String(1 + Math.floor(rand() * 8));
    for (let j = 0; j < n; j++) s += ['+', '-', '*'][Math.floor(rand() * 3)] + String(1 + Math.floor(rand() * 8));
    const good = evalTree(prattParse(tokenize(s), null, null));
    const flat = evalTree(flatParse(tokenize(s)));
    if (flat !== good) flatWrong += 1;
  }
  return { src, events, tree, nodes, race: { pratt: cp.c, d5: c5.c, d15: c15.c }, t123: [t1, t2, t3], flatWrong, FUZZ };
}

export default function PrattViz() {
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
      stepMs: 60,
      init: () => ({
        scene: makeScene(SEED + cycle.current * 7919),
        act: 0,
        tick: 0,
        rest: 0,
        stopAtRest: isStill(),
      }),
      tick: (s) => {
        if (s.act >= 2) {
          if (s.stopAtRest) return false;
          s.rest += 1;
          if (s.rest > holdTicks(s)) {
            cycle.current += 1;
            Object.assign(s, {
              scene: makeScene(SEED + cycle.current * 7919),
              act: 0,
              tick: 0,
              rest: 0,
            });
          }
          return true;
        }
        s.tick += 1;
        const len = s.act === 0 ? s.scene.events.length * 14 + END_HOLD : 200 + END_HOLD;
        if (s.tick >= len) {
          s.tick = len;
          s.actRest = (s.actRest || 0) + 1;
          if (s.actRest > holdTicks(s)) {
            s.tick = 0;
            s.act += 1;
            s.actRest = 0;
          }
        }
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

        const done = s.act >= 2;
        const actIdx = done ? 1 : s.act;
        ctx.fillStyle = dim;
        ctx.font = '11px ui-monospace, monospace';

        if (actIdx === 0) {
          const total = sc.events.length * 14;
          const t = done ? total : Math.min(s.tick, total);
          const upto = Math.min(sc.events.length, Math.max(1, Math.floor(t / 14)));
          const ev = sc.events[upto - 1];
          ctx.fillText(`act 1 · parsing '${sc.src}' with one loop and a badge table (+ 10 · * 20 · ^ 31 right)`, 14, 20);
          // expression with badges
          let x = 30;
          for (const ch of sc.src) {
            const isOp = ch in INFIX;
            ctx.fillStyle = isOp ? heur : ink;
            ctx.font = '15px ui-monospace, monospace';
            ctx.fillText(ch, x, 52);
            if (isOp) {
              ctx.fillStyle = dim;
              ctx.font = '9px ui-monospace, monospace';
              ctx.fillText(String(INFIX[ch][0]), x - 2, 66);
            }
            x += 20;
          }
          // current event
          ctx.font = '11px ui-monospace, monospace';
          if (ev.type === 'cmp') {
            ctx.fillStyle = ev.win ? good : warn;
            ctx.fillText(`badge check: '${ev.op}' (${ev.lbp}) vs floor ${ev.floor}: ${ev.win ? 'binds: takes the left tree' : 'yields: return to caller'}`, 30, 90);
          } else if (ev.type === 'node') {
            ctx.fillStyle = algo;
            ctx.fillText(`node built: (${ev.op} left right)`, 30, 90);
          } else {
            ctx.fillStyle = ink;
            ctx.fillText(`nud: '${ev.tok}' starts an operand`, 30, 90);
          }
          // the finished tree (fades in with progress)
          const frac = upto / sc.events.length;
          const nShow = Math.ceil(frac * sc.nodes.length);
          const maxX = Math.max(...sc.nodes.map((n) => n.x));
          const px = (n) => 80 + (n.x / Math.max(maxX, 1)) * 440;
          const py = (n) => 120 + n.y * 38;
          for (let i = 0; i < nShow; i++) {
            const n = sc.nodes[i];
            if (n.parent !== null && n.parent < nShow) {
              const p = sc.nodes[n.parent];
              ctx.strokeStyle = 'rgba(154,165,189,0.4)';
              ctx.beginPath();
              ctx.moveTo(px(p), py(p));
              ctx.lineTo(px(n), py(n));
              ctx.stroke();
            }
          }
          for (let i = 0; i < nShow; i++) {
            const n = sc.nodes[i];
            const isOp = !/\d/.test(n.label);
            ctx.fillStyle = isOp ? heur : algo;
            ctx.beginPath();
            ctx.arc(px(n), py(n), 10, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#0b0e14';
            ctx.font = 'bold 11px ui-monospace, monospace';
            ctx.textAlign = 'center';
            ctx.fillText(n.label, px(n), py(n) + 4);
            ctx.textAlign = 'left';
          }
          let line;
          if (done || upto >= sc.events.length) {
            line = `parsed: value ${evalTree(sc.tree)} · precedence and associativity emerged from badge numbers alone`;
            ctx.fillStyle = good;
          } else {
            line = 'the judge’s one rule: the operand goes to the bigger badge';
            ctx.fillStyle = ink;
          }
          ctx.font = '12px ui-monospace, monospace';
          ctx.fillText(line, 14, H - 12);
          statsRef.current = { line };
        } else {
          const t = done ? 200 : Math.min(s.tick, 200);
          ctx.fillText('act 2 · the tower toll on a 300-operand chain: parser calls (all three trees identical)', 14, 20);
          const frac = Math.min(1, t / 200);
          const maxV = sc.race.d15;
          const bars = [
            ['descent, loose end of 15 levels', sc.race.d15, warn],
            ['descent, 5 levels', sc.race.d5, heur],
            ['pratt, any table size', sc.race.pratt, algo],
          ];
          bars.forEach(([label, total2, color], i) => {
            const val = Math.floor(frac * total2);
            const y = 62 + i * 52;
            ctx.fillStyle = color;
            ctx.font = '12px ui-monospace, monospace';
            ctx.fillText(`${label}: ${val.toLocaleString()}`, 60, y - 8);
            ctx.strokeStyle = color;
            ctx.strokeRect(60, y, 500 * (total2 / maxV), 13);
            ctx.fillStyle = `${color}44`;
            ctx.fillRect(60, y, 500 * (val / maxV), 13);
          });
          ctx.fillStyle = warn;
          ctx.font = '11px ui-monospace, monospace';
          ctx.fillText(`the flat equal-precedence shortcut, fuzzed in this figure: wrong on ${sc.flatWrong} of ${sc.FUZZ} expressions`, 60, 224);
          let line;
          if (done || t >= 200) {
            line = `${(sc.race.d15 / sc.race.pratt).toFixed(1)}x / ${(sc.race.d5 / sc.race.pratt).toFixed(1)}x tower toll vs ~one call per token: the table is data, not depth`;
            ctx.fillStyle = good;
          } else {
            line = 'every operand of the descent parser walks its tower; pratt checks one badge';
            ctx.fillStyle = ink;
          }
          ctx.font = '12px ui-monospace, monospace';
          ctx.fillText(line, 14, H - 12);
          statsRef.current = {
            line: done
              ? 'one loop, two denotations, and a dictionary of small integers: the rust-analyzer idiom'
              : line,
          };
        }
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
          new expression
        </button>
        <span className="viz-stat">
          {snap.line || 'checking badges…'}
        </span>
      </div>
    </>
  );
}
