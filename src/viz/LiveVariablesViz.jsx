import { useEffect, useRef, useState } from 'react';
import { useCanvasLoop, isStill, holdTicks, mulberry32 } from './useCanvasLoop.js';

// A seeded structured program of 6 to 12 blocks over four variables, drawn
// in postorder from the exit up; the backward worklist runs one visit per
// tick. Invariant: every IN set stays inside the per-variable reachability
// oracle and never shrinks; at the end the sets equal the oracle.
const W = 640;
const H = 300;
const SEED = 20261011;
const NV = 4;
const NAMES = ['a', 'b', 'c', 'd'];

function buildProgram(rand) {
  const blocks = []; // each block: { reads: [...], writes: [...] } as ordered statements
  const succ = [];
  const cond = [];
  const nb = () => { blocks.push([]); succ.push([]); cond.push(-1); return blocks.length - 1; };
  const pick = () => Math.floor(rand() * NV);
  const stmt = () => (rand() < 0.65 ? { r: [pick(), pick()], w: pick() } : { r: [pick()], w: -1 });
  const fill = (b) => { const k = 1 + Math.floor(rand() * 2); for (let i = 0; i < k; i += 1) blocks[b].push(stmt()); };
  const frag = (depth) => {
    let first = -1; let last = -1;
    const n = 1 + Math.floor(rand() * 2);
    for (let i = 0; i < n; i += 1) {
      let f; let l;
      const r = rand();
      if (depth >= 2 || r < 0.4) { f = nb(); fill(f); l = f; }
      else if (r < 0.7) {
        f = nb(); cond[f] = pick();
        const [a0, a1] = frag(depth + 1); const [b0, b1] = frag(depth + 1);
        l = nb(); succ[f] = [a0, b0]; succ[a1].push(l); succ[b1].push(l);
      } else {
        f = nb(); cond[f] = pick();
        const [b0, b1] = frag(depth + 1);
        l = nb(); succ[f] = [b0, l]; succ[b1].push(f);
      }
      if (last >= 0) succ[last].push(f);
      if (first < 0) first = f;
      last = l;
    }
    return [first, last];
  };
  const entry = nb();
  blocks[entry] = [{ r: [], w: 0 }, { r: [], w: 1 }, { r: [], w: 2 }, { r: [], w: 3 }];
  const [f, l] = frag(0);
  succ[entry].push(f);
  const ex = nb(); blocks[ex] = [{ r: [pick()], w: -1 }]; succ[l].push(ex);
  return { blocks, succ, cond };
}

function useDef(p) {
  return p.blocks.map((blk, b) => {
    let use = 0; let def = 0;
    for (const s of blk) {
      for (const v of s.r) if (!(def & (1 << v))) use |= 1 << v;
      if (s.w >= 0 && !(use & (1 << s.w))) def |= 1 << s.w;
    }
    if (p.cond[b] >= 0 && !(def & (1 << p.cond[b]))) use |= 1 << p.cond[b];
    return [use, def];
  });
}

function postorder(p) {
  const seen = new Set(); const order = [];
  const dfs = (b) => { seen.add(b); for (const s of p.succ[b]) if (!seen.has(s)) dfs(s); order.push(b); };
  dfs(0);
  return order;
}

function oracle(p, ud) {
  const n = p.blocks.length; const IN = new Array(n).fill(0);
  for (let v = 0; v < NV; v += 1) {
    for (let b = 0; b < n; b += 1) {
      const seen = new Set([b]); const stack = [b]; let live = false;
      while (stack.length && !live) {
        const x = stack.pop();
        if (ud[x][0] & (1 << v)) live = true;
        else if (!(ud[x][1] & (1 << v))) for (const s of p.succ[x]) if (!seen.has(s)) { seen.add(s); stack.push(s); }
      }
      if (live) IN[b] |= 1 << v;
    }
  }
  return IN;
}

export function makeScene(seed) {
  const rand = mulberry32(seed);
  const p = buildProgram(rand);
  const ud = useDef(p);
  const po = postorder(p);
  const n = p.blocks.length;
  const preds = Array.from({ length: n }, () => []);
  p.succ.forEach((ss, b) => ss.forEach((s) => preds[s].push(b)));
  return {
    p, ud, po, preds, n, oracle: oracle(p, ud), IN: new Array(n).fill(0), OUT: new Array(n).fill(0),
    queue: [...po], queued: new Set(po), visits: 0, requeues: 0, cur: -1, done: false, ok: true,
    last: `${n} blocks in postorder; the exit first, the entry last`,
  };
}

export function sceneTick(sc) {
  if (sc.done) return true;
  if (!sc.queue.length) {
    sc.done = true;
    for (let b = 0; b < sc.n; b += 1) if (sc.IN[b] !== sc.oracle[b]) sc.ok = false;
    sc.cur = -1;
    sc.last = `done: ${sc.visits} visits for ${sc.n} blocks (${(sc.visits / sc.n).toFixed(2)} per block), ${sc.requeues} requeues; equal to the reachability oracle: ${sc.ok ? 'yes' : 'NO'}`;
    return true;
  }
  const b = sc.queue.shift(); sc.queued.delete(b); sc.cur = b; sc.visits += 1;
  let out = 0;
  for (const s of sc.p.succ[b]) out |= sc.IN[s];
  const nin = sc.ud[b][0] | (out & ~sc.ud[b][1]);
  if ((nin & sc.IN[b]) !== sc.IN[b]) sc.ok = false; // shrank
  if ((nin & ~sc.oracle[b]) !== 0) sc.ok = false; // above the oracle
  sc.OUT[b] = out;
  const grew = nin !== sc.IN[b];
  sc.IN[b] = nin;
  let pushed = 0;
  if (grew) for (const q of sc.preds[b]) if (!sc.queued.has(q)) { sc.queue.push(q); sc.queued.add(q); pushed += 1; sc.requeues += 1; }
  const names = (m) => NAMES.filter((_, i) => m & (1 << i)).join('') || '{}';
  sc.last = `visit ${sc.visits}: block ${b} OUT ${names(out)} IN ${names(nin)}${grew ? `, grew: ${pushed} predecessor${pushed === 1 ? '' : 's'} queued` : ', unchanged'}`;
  return false;
}

export default function LiveVariablesViz() {
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
        ctx.fillText('backward worklist in postorder: one block per tick; blue = IN set so far, dim = the oracle it must reach', 12, 18);
        const rowH = Math.min(22, Math.floor(230 / sc.n));
        const pos = {};
        sc.po.forEach((b, i) => { pos[b] = 36 + i * rowH; });
        const x0 = 110;
        for (const b of sc.po) {
          const y = pos[b];
          ctx.fillStyle = b === sc.cur ? heur : dim;
          ctx.fillText(`B${b}${sc.p.cond[b] >= 0 ? ' ?' : ''}`, 20, y + 9);
          for (let v = 0; v < NV; v += 1) {
            const inSet = sc.IN[b] & (1 << v);
            const orc = sc.oracle[b] & (1 << v);
            const cx = x0 + v * 24;
            ctx.strokeStyle = orc ? `${dim}99` : `${dim}33`;
            ctx.strokeRect(cx, y, 18, rowH - 6);
            if (inSet) { ctx.fillStyle = orc ? algo : warn; ctx.fillRect(cx + 1, y + 1, 16, rowH - 8); }
            ctx.fillStyle = inSet ? '#0b1020' : `${dim}88`;
            ctx.fillText(NAMES[v], cx + 5, y + rowH / 2 + 2);
          }
          ctx.fillStyle = `${dim}aa`;
          ctx.fillText(`use ${NAMES.filter((_, i) => sc.ud[b][0] & (1 << i)).join('') || '-'}  def ${NAMES.filter((_, i) => sc.ud[b][1] & (1 << i)).join('') || '-'}  to ${sc.p.succ[b].map((q) => `B${q}`).join(',') || 'exit'}`, x0 + 110, y + rowH / 2 + 2);
        }
        ctx.fillStyle = dim;
        ctx.fillText(`visits ${sc.visits}, requeues ${sc.requeues}; queue ${sc.queue.length}`, 400, 36);
        ctx.fillText('the file: 1.40 visits per block over 300 programs; a single sweep missed 5,287 facts', 400, 52);
        ctx.fillStyle = sc.ok ? good : warn;
        ctx.fillText(sc.ok ? 'invariant: sets only grow and stay inside the oracle' : 'INVARIANT BROKEN', 400, 72);
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
