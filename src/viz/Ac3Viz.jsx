import DiagramViewport from '../components/DiagramViewport.jsx';
import { useEffect, useRef, useState } from 'react';
import { useCanvasLoop, isStill, holdTicks, mulberry32 } from './useCanvasLoop.js';

// AC-3 on a seeded random binary constraint network, one arc revision per
// tick. Eight variables sit on a circle, each with four candidate values
// drawn as small squares; constrained pairs are joined by an edge. The
// arc being revised is highlighted, values that lose their last support
// are struck red, and every arc into a shrunken domain is requeued. When
// the queue empties the network is arc consistent (every surviving value
// has a partner in every neighbor), or a domain has been wiped out, in
// which case the instance has no solution and no search was needed. The
// invariant checked at the end is the consistency property itself.
const W = 640;
const H = 300;
const SEED = 20261010;
const N = 8;
const D = 4;

function makeNetwork(rand) {
  const allowed = new Map();
  const neighbors = Array.from({ length: N }, () => []);
  const tightness = 0.35 + rand() * 0.25;
  for (let x = 0; x < N; x += 1) {
    for (let y = x + 1; y < N; y += 1) {
      if (rand() < 0.5) {
        const ok = new Set();
        for (let a = 0; a < D; a += 1) for (let b = 0; b < D; b += 1) if (rand() >= tightness) ok.add(a * D + b);
        allowed.set(`${x},${y}`, ok);
        const rev = new Set();
        for (const p of ok) rev.add((p % D) * D + Math.floor(p / D));
        allowed.set(`${y},${x}`, rev);
        neighbors[x].push(y);
        neighbors[y].push(x);
      }
    }
  }
  return { allowed, neighbors, tightness };
}

const supported = (net, x, vx, y, domY) => {
  const ok = net.allowed.get(`${x},${y}`);
  for (const vy of domY) if (ok.has(vx * D + vy)) return true;
  return false;
};

export function isArcConsistent(net, domains) {
  for (let x = 0; x < N; x += 1) {
    for (const y of net.neighbors[x]) {
      for (const vx of domains[x]) if (!supported(net, x, vx, y, domains[y])) return false;
    }
  }
  return true;
}

export function makeScene(seed) {
  const rand = mulberry32(seed);
  const net = makeNetwork(rand);
  const domains = Array.from({ length: N }, () => new Set([0, 1, 2, 3]));
  const queue = [];
  for (let x = 0; x < N; x += 1) for (const y of net.neighbors[x]) queue.push([x, y]);
  const queued = new Set(queue.map(([x, y]) => `${x},${y}`));
  return { net, domains, queue, queued, current: null, removed: [], revisions: 0, pruned: 0, wiped: null, done: false, ok: true, last: `${queue.length} arcs queued over ${queue.length / 2} constraints; ${N} variables with ${D} values each` };
}

export function sceneTick(sc) {
  if (sc.done) return true;
  if (sc.queue.length === 0) {
    sc.done = true;
    sc.ok = sc.wiped !== null || isArcConsistent(sc.net, sc.domains);
    const left = sc.domains.reduce((s, d) => s + d.size, 0);
    sc.last = sc.wiped !== null
      ? `variable ${sc.wiped} wiped out after ${sc.revisions} revisions: no solution exists, proven without search`
      : `arc consistent after ${sc.revisions} revisions: ${sc.pruned} of ${N * D} values pruned, ${left} remain; every survivor has a partner in every neighbor`;
    return true;
  }
  const [x, y] = sc.queue.shift();
  sc.queued.delete(`${x},${y}`);
  sc.current = [x, y];
  sc.removed = [];
  for (const vx of [...sc.domains[x]]) {
    if (!supported(sc.net, x, vx, y, sc.domains[y])) {
      sc.domains[x].delete(vx);
      sc.removed.push(vx);
      sc.pruned += 1;
    }
  }
  sc.revisions += 1;
  if (sc.domains[x].size === 0) {
    sc.wiped = x;
    sc.queue = [];
    sc.last = `revise (${x}, ${y}): every value of ${x} lost its support; domain wiped out`;
    return false;
  }
  if (sc.removed.length > 0) {
    let added = 0;
    for (const z of sc.net.neighbors[x]) {
      if (z !== y && !sc.queued.has(`${z},${x}`)) {
        sc.queue.push([z, x]);
        sc.queued.add(`${z},${x}`);
        added += 1;
      }
    }
    sc.last = `revise (${x}, ${y}): removed ${sc.removed.map((v) => 'abcd'[v]).join(', ')} from ${x}; requeued ${added} arc${added === 1 ? '' : 's'} into ${x}; queue ${sc.queue.length}`;
  } else {
    sc.last = `revise (${x}, ${y}): every value of ${x} still has a partner in ${y}; nothing changes; queue ${sc.queue.length}`;
  }
  return false;
}

export default function Ac3Viz() {
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
      stepMs: 650,
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
        ctx.fillText('AC-3: amber arc revised, red values pruned; squares: surviving values', 12, 18);
        const cx = 200;
        const cy = 160;
        const r = 100;
        const pos = (i) => [cx + r * Math.cos((i / N) * 2 * Math.PI - Math.PI / 2), cy + r * Math.sin((i / N) * 2 * Math.PI - Math.PI / 2)];
        for (let x = 0; x < N; x += 1) {
          for (const y of sc.net.neighbors[x]) {
            if (y < x) continue;
            const [x1, y1] = pos(x);
            const [x2, y2] = pos(y);
            const cur = sc.current && ((sc.current[0] === x && sc.current[1] === y) || (sc.current[0] === y && sc.current[1] === x));
            ctx.strokeStyle = cur ? heur : `${dim}55`;
            ctx.lineWidth = cur ? 2.5 : 1;
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();
          }
        }
        ctx.lineWidth = 1;
        for (let i = 0; i < N; i += 1) {
          const [x, y] = pos(i);
          const isCur = sc.current && sc.current[0] === i;
          ctx.fillStyle = sc.wiped === i ? warn : `${dim}22`;
          ctx.fillRect(x - 22, y - 12, 44, 24);
          for (let v = 0; v < D; v += 1) {
            const alive = sc.domains[i].has(v);
            const justRemoved = isCur && sc.removed.includes(v);
            ctx.fillStyle = justRemoved ? warn : alive ? algo : `${dim}33`;
            ctx.fillRect(x - 20 + v * 10, y - 8, 8, 16);
          }
          ctx.fillStyle = isCur ? heur : ink;
          ctx.fillText(String(i), x - 3, y - 16);
        }
        const tx = 380;
        ctx.fillStyle = ink;
        ctx.fillText(`revisions ${sc.revisions}`, tx, 60);
        ctx.fillStyle = dim;
        ctx.fillText(`queue ${sc.queue.length} arc${sc.queue.length === 1 ? '' : 's'} waiting`, tx, 78);
        ctx.fillText(`values pruned ${sc.pruned} of ${N * D}`, tx, 96);
        ctx.fillText(`tightness ${(sc.net.tightness * 100).toFixed(0)}% of value pairs forbidden`, tx, 114);
        if (sc.done) {
          ctx.fillStyle = sc.ok ? good : warn;
          ctx.fillText(sc.wiped !== null ? 'wipeout: unsatisfiable, no search' : (sc.ok ? 'arc consistent: every survivor supported' : 'CONSISTENCY CHECK FAILED'), tx, 150);
          ctx.fillStyle = dim;
          ctx.fillText(sc.wiped !== null ? 'plain backtracking would search to prove it' : 'search branches only on survivors', tx, 168);
        } else {
          ctx.fillStyle = dim;
          ctx.fillText('the file: 6 nodes vs 93 (forward checking)', tx, 150);
          ctx.fillText('vs 200,000 unfinished (plain backtracking)', tx, 168);
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
          new network
        </button>
        <span className="viz-stat">{snap.line || 'propagating…'}</span>
      </div>
    </>
  );
}
