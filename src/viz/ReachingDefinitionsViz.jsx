import { useEffect, useRef, useState } from 'react';
import { useCanvasLoop, isStill, holdTicks, mulberry32 } from './useCanvasLoop.js';

// A seeded structured program of 7 to 14 blocks in reverse postorder, forward
// edges below, back edges above; the worklist solver runs one visit per tick.
// Invariant: every set stays below the per-definition oracle and never
// shrinks; at the end the sets equal the oracle.
const W = 640;
const H = 300;
const SEED = 20261010;
const NVARS = 4;

function buildProgram(rand) {
  const blocks = [];
  const succ = [];
  let loopDepth = 0;
  let nest = 0;
  const nb = () => {
    blocks.push([]);
    succ.push([]);
    return blocks.length - 1;
  };
  const pick = () => Math.floor(rand() * NVARS);
  const fill = (b) => {
    const k = 1 + Math.floor(rand() * 2);
    for (let i = 0; i < k; i += 1) blocks[b].push(pick());
  };
  const entry = nb();
  for (let v = 0; v < NVARS; v += 1) blocks[entry].push(v);
  const gen = (cur0, depth) => {
    let cur = cur0;
    const n = 1 + Math.floor(rand() * 2);
    for (let i = 0; i < n; i += 1) {
      const r = rand();
      if (depth <= 0 || r < 0.35) {
        const b = nb();
        fill(b);
        succ[cur].push(b);
        cur = b;
      } else if (r < 0.65) {
        const test = nb();
        fill(test);
        succ[cur].push(test);
        const t = nb();
        fill(t);
        const e = nb();
        fill(e);
        succ[test].push(t, e);
        const et = gen(t, depth - 1);
        const ee = gen(e, depth - 1);
        const join = nb();
        fill(join);
        succ[et].push(join);
        succ[ee].push(join);
        cur = join;
      } else {
        const head = nb();
        succ[cur].push(head);
        const body = nb();
        fill(body);
        const exit = nb();
        fill(exit);
        succ[head].push(body, exit);
        nest += 1;
        loopDepth = Math.max(loopDepth, nest);
        const eb = gen(body, depth - 1);
        nest -= 1;
        succ[eb].push(head);
        cur = exit;
      }
    }
    return cur;
  };
  const last = gen(entry, 2);
  const tail = nb();
  blocks[tail].push(0);
  succ[last].push(tail);
  return { blocks, succ, loopDepth };
}

function pickProgram(rand) {
  let fallback = null;
  for (let a = 0; a < 200; a += 1) {
    const p = buildProgram(rand);
    if (p.blocks.length <= 14 && p.blocks.length >= 7 && p.loopDepth >= 1) return p;
    if (p.blocks.length <= 14 && (!fallback || p.loopDepth > fallback.loopDepth)) fallback = p;
  }
  return fallback;
}

function genKill(p) {
  // definitions numbered in block order; blocks[b] lists the variable of each
  const defs = [];
  const byVar = Array.from({ length: NVARS }, () => []);
  p.blocks.forEach((vars, b) => {
    vars.forEach((v, i) => {
      byVar[v].push(defs.length);
      defs.push({ b, i, v });
    });
  });
  const gen = [];
  const kill = [];
  let id = 0;
  p.blocks.forEach((vars) => {
    const last = new Map();
    vars.forEach((v) => {
      last.set(v, id);
      id += 1;
    });
    const g = new Set(last.values());
    const k = new Set();
    for (const v of last.keys()) for (const d of byVar[v]) if (!g.has(d)) k.add(d);
    gen.push(g);
    kill.push(k);
  });
  return { defs, gen, kill };
}

function reversePostorder(p) {
  const seen = new Set();
  const order = [];
  const dfs = (b) => {
    seen.add(b);
    for (const s of p.succ[b]) if (!seen.has(s)) dfs(s);
    order.push(b);
  };
  dfs(0);
  return order.reverse();
}

function oracle(p, defs) {
  // per-definition forward search, independent of the set equations
  const n = p.blocks.length;
  const IN = Array.from({ length: n }, () => new Set());
  const OUT = Array.from({ length: n }, () => new Set());
  defs.forEach((d, id) => {
    const vars = p.blocks[d.b];
    for (let j = d.i + 1; j < vars.length; j += 1) if (vars[j] === d.v) return;
    OUT[d.b].add(id);
    const queue = [...p.succ[d.b]];
    const seen = new Set();
    while (queue.length) {
      const s = queue.shift();
      if (seen.has(s)) continue;
      seen.add(s);
      IN[s].add(id);
      if (p.blocks[s].includes(d.v)) continue;
      OUT[s].add(id);
      queue.push(...p.succ[s]);
    }
  });
  return { IN, OUT };
}

function subset(a, b) {
  for (const x of a) if (!b.has(x)) return false;
  return true;
}

function transfer(sc, b) {
  const nin = new Set();
  for (const q of sc.pred[b]) {
    for (const d of sc.OUT[q]) nin.add(d);
    sc.setOps += 1;
  }
  const nout = new Set(sc.gen[b]);
  for (const d of nin) if (!sc.kill[b].has(d)) nout.add(d);
  sc.setOps += 2;
  return { nin, nout };
}

export function makeScene(seed) {
  const rand = mulberry32(seed);
  const p = pickProgram(rand);
  const n = p.blocks.length;
  const { defs, gen, kill } = genKill(p);
  const rpo = reversePostorder(p);
  const rank = new Array(n).fill(0);
  rpo.forEach((b, i) => {
    rank[b] = i;
  });
  const pred = Array.from({ length: n }, () => []);
  p.succ.forEach((ss, b) => ss.forEach((s) => pred[s].push(b)));
  const fin = oracle(p, defs);
  const totalFacts = fin.IN.reduce((acc, s) => acc + s.size, 0);
  // the single sweep, for the closing comparison
  const sIN = Array.from({ length: n }, () => new Set());
  const sOUT = Array.from({ length: n }, () => new Set());
  for (const b of rpo) {
    for (const q of pred[b]) for (const d of sOUT[q]) sIN[b].add(d);
    for (const d of gen[b]) sOUT[b].add(d);
    for (const d of sIN[b]) if (!kill[b].has(d)) sOUT[b].add(d);
  }
  const missSingle = fin.IN.reduce((acc, s, b) => acc + (s.size - sIN[b].size), 0);
  return {
    p,
    n,
    gen,
    kill,
    rank,
    pred,
    IN: Array.from({ length: n }, () => new Set()),
    OUT: Array.from({ length: n }, () => new Set()),
    queue: [...rpo],
    queued: new Set(rpo),
    finIN: fin.IN,
    finOUT: fin.OUT,
    totalFacts,
    missSingle,
    visits: 0,
    setOps: 0,
    current: -1,
    done: false,
    ok: true,
    last: `${n} blocks, ${defs.length} definitions, loop depth ${p.loopDepth}; worklist seeded in reverse postorder`,
  };
}

export function sceneTick(sc) {
  if (sc.done) return true;
  if (sc.queue.length === 0) {
    let equal = true;
    for (let b = 0; b < sc.n; b += 1) {
      if (sc.IN[b].size !== sc.finIN[b].size || sc.OUT[b].size !== sc.finOUT[b].size) equal = false;
      if (!subset(sc.IN[b], sc.finIN[b]) || !subset(sc.OUT[b], sc.finOUT[b])) equal = false;
    }
    sc.ok = sc.ok && equal;
    sc.current = -1;
    sc.done = true;
    sc.last = `done: ${sc.visits} visits for ${sc.n} blocks (${(sc.visits / sc.n).toFixed(2)} per block), ${sc.setOps} set ops; equal to the per-definition oracle: ${equal ? 'yes' : 'NO'}; one sweep would miss ${sc.missSingle} of ${sc.totalFacts} facts`;
    return true;
  }
  const b = sc.queue.shift();
  sc.queued.delete(b);
  sc.visits += 1;
  sc.current = b;
  const { nin, nout } = transfer(sc, b);
  const grew = nin.size - sc.IN[b].size;
  if (!subset(sc.IN[b], nin) || !subset(sc.OUT[b], nout) || !subset(nin, sc.finIN[b]) || !subset(nout, sc.finOUT[b])) sc.ok = false;
  const changed = nout.size !== sc.OUT[b].size || !subset(nout, sc.OUT[b]);
  sc.IN[b] = nin;
  sc.OUT[b] = nout;
  let pushed = 0;
  if (changed) {
    for (const s of sc.p.succ[b]) {
      if (!sc.queued.has(s)) {
        sc.queue.push(s);
        sc.queued.add(s);
        pushed += 1;
      }
    }
  }
  sc.last = `visit ${sc.visits}: block ${sc.rank[b]} IN +${grew} (${nin.size}/${sc.finIN[b].size}), OUT ${changed ? 'changed' : 'same'}, ${pushed} queued; worklist ${sc.queue.length}`;
  return false;
}

export default function ReachingDefinitionsViz() {
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
        ctx.fillText(`${sc.n} blocks in reverse postorder, loop depth ${sc.p.loopDepth}; forward edges below, back edges above (amber); fill = share of the final set learned`, 12, 16);
        const y0 = 100;
        const bw = 36;
        const bh = 44;
        const x0 = 20;
        const cx = (b) => x0 + sc.rank[b] * 44 + bw / 2;
        sc.p.succ.forEach((ss, b) => {
          ss.forEach((t) => {
            const forward = sc.rank[t] > sc.rank[b];
            const bulge = 16 + 8 * Math.abs(sc.rank[t] - sc.rank[b]);
            const y = forward ? y0 + bh : y0;
            ctx.beginPath();
            ctx.strokeStyle = forward ? `${algo}aa` : heur;
            ctx.lineWidth = 1.2;
            ctx.moveTo(cx(b), y);
            ctx.quadraticCurveTo((cx(b) + cx(t)) / 2, forward ? y + bulge : y - bulge, cx(t), y);
            ctx.stroke();
          });
        });
        for (let b = 0; b < sc.n; b += 1) {
          const x = x0 + sc.rank[b] * 44;
          const have = sc.IN[b].size;
          const want = sc.finIN[b].size;
          const frac = want === 0 ? 1 : have / want;
          ctx.fillStyle = `${algo}55`;
          ctx.fillRect(x, y0 + bh - frac * bh, bw, frac * bh);
          const complete = have === want && sc.OUT[b].size === sc.finOUT[b].size && sc.visits > 0 && !sc.queued.has(b);
          ctx.strokeStyle = b === sc.current ? heur : complete ? good : dim;
          ctx.lineWidth = b === sc.current ? 2.5 : 1;
          ctx.strokeRect(x, y0, bw, bh);
          ctx.font = '10px ui-monospace, monospace';
          ctx.fillStyle = ink;
          ctx.fillText(`${sc.rank[b]}`, x + 4, y0 + 12);
          ctx.fillStyle = dim;
          ctx.fillText(`${have}/${want}`, x + 3, y0 + bh - 5);
        }
        ctx.font = '11px ui-monospace, monospace';
        ctx.fillStyle = dim;
        ctx.fillText('worklist:', 12, 236);
        sc.queue.forEach((b, i) => {
          const x = 80 + i * 24;
          ctx.fillStyle = i === 0 ? heur : `${dim}88`;
          ctx.fillRect(x, 226, 20, 14);
          ctx.fillStyle = '#10141d';
          ctx.fillText(`${sc.rank[b]}`, x + 5, 237);
        });
        if (sc.queue.length === 0) {
          ctx.fillStyle = good;
          ctx.fillText('empty: fixpoint', 80, 237);
        }
        const learned = sc.IN.reduce((acc, st) => acc + st.size, 0);
        ctx.fillStyle = dim;
        ctx.fillText(`visits ${sc.visits} (${(sc.visits / sc.n).toFixed(2)} per block); set ops ${sc.setOps}; facts ${learned}/${sc.totalFacts}; one sweep would miss ${sc.missSingle}`, 12, 258);
        ctx.fillStyle = sc.ok ? good : warn;
        ctx.fillText(sc.ok ? 'invariant: every set below the per-definition oracle and never shrinking' : 'INVARIANT BROKEN', 12, 274);
        const line = sc.last;
        ctx.fillStyle = s.done ? (sc.ok ? good : warn) : ink;
        ctx.fillText(line.length > 96 ? `${line.slice(0, 95)}…` : line, 12, H - 6);
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
          new program
        </button>
        <span className="viz-stat">{snap.line || 'solving…'}</span>
      </div>
    </>
  );
}
