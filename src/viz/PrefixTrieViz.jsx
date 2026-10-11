import { useEffect, useRef, useState } from 'react';
import { useCanvasLoop, isStill, holdTicks, mulberry32 } from './useCanvasLoop.js';

// An eight-bit forwarding table (so the whole trie fits on screen) with a
// default route and nested prefixes. One destination per tick walks the
// unibit trie: the path lights blue, the last prefix passed lights green and
// is the answer. Every answer is checked against a scan of the whole table
// (the longest covering prefix wins), and the step count never exceeds 8.
const W = 640;
const H = 300;
const SEED = 20261010;
const BITS = 8;
const LOOKUPS = 48;

function brute(table, a) {
  let bl = -1;
  let bh = null;
  for (const p of table) {
    if (p.len > bl && (p.len === 0 || (a >> (BITS - p.len)) === (p.v >> (BITS - p.len)))) {
      bl = p.len;
      bh = p.hop;
    }
  }
  return bh;
}

export function makeScene(seed) {
  const rand = mulberry32(seed);
  const n = 10 + Math.floor(rand() * 6);
  const table = [{ v: 0, len: 0, hop: 0 }];
  const seen = new Set(['0/0']);
  const add = (v, len) => {
    const key = `${v}/${len}`;
    if (seen.has(key)) return false;
    seen.add(key);
    table.push({ v, len, hop: table.length });
    return true;
  };
  while (table.length < n) {
    const len = 1 + Math.floor(rand() * BITS);
    const v = Math.floor(rand() * 256) & (0xff << (BITS - len)) & 0xff;
    if (!add(v, len)) continue;
    if (len < 7 && rand() < 0.45 && table.length < n) {
      const len2 = Math.min(BITS, len + 1 + Math.floor(rand() * 3));
      add((v | (Math.floor(rand() * 256) >> len)) & (0xff << (BITS - len2)) & 0xff, len2);
    }
  }
  const root = { c: [null, null], hop: 0, depth: 0, v: 0 };
  const nodes = [root];
  for (const p of table) {
    let node = root;
    for (let i = 0; i < p.len; i += 1) {
      const b = (p.v >> (BITS - 1 - i)) & 1;
      if (!node.c[b]) {
        node.c[b] = { c: [null, null], hop: null, depth: i + 1, v: p.v >> (BITS - 1 - i) };
        nodes.push(node.c[b]);
      }
      node = node.c[b];
    }
    if (p.len) node.hop = p.hop;
  }
  return {
    rand, table, root, nodes, i: 0, path: [], matched: root, addr: 0, best: 0, steps: 0, totalSteps: 0, ok: true, done: false,
    last: `${table.length} prefixes (default route included), ${nodes.length} trie nodes; one destination per tick`,
  };
}

export function sceneTick(sc) {
  if (sc.done) return true;
  const a = Math.floor(sc.rand() * 256);
  let node = sc.root;
  let best = sc.root.hop;
  let matched = sc.root;
  let steps = 0;
  const path = [node];
  for (let i = 0; i < BITS; i += 1) {
    const nxt = node.c[(a >> (BITS - 1 - i)) & 1];
    if (!nxt) break;
    steps += 1;
    node = nxt;
    path.push(node);
    if (node.hop !== null) {
      best = node.hop;
      matched = node;
    }
  }
  const truth = brute(sc.table, a);
  if (best !== truth || steps > BITS) sc.ok = false;
  Object.assign(sc, { addr: a, path, matched, best, steps });
  sc.totalSteps += steps;
  sc.i += 1;
  if (sc.i >= LOOKUPS) {
    sc.done = true;
    sc.last = `done: ${LOOKUPS} lookups, mean ${(sc.totalSteps / LOOKUPS).toFixed(2)} steps over ${sc.nodes.length} nodes against ${sc.table.length} comparisons per scan; every answer equal to the scan: ${sc.ok ? 'yes' : 'NO'}`;
    return true;
  }
  sc.last = `lookup ${sc.i}: ${a.toString(2).padStart(BITS, '0')} takes ${steps} steps to next hop ${best} (/${matched.depth}); scan agrees: ${best === truth ? 'yes' : 'NO'}`;
  return false;
}

export function summarize(sc) {
  return { ok: sc.ok, prefixes: sc.table.length, nodes: sc.nodes.length, meanSteps: sc.totalSteps / Math.max(1, sc.i) };
}

export default function PrefixTrieViz() {
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
        const X = (node) => 20 + ((node.v + 0.5) / 2 ** node.depth) * 600;
        const Y = (node) => 44 + node.depth * 26;
        const onPath = new Set(sc.path);
        ctx.font = '11px ui-monospace, monospace';
        ctx.fillStyle = dim;
        ctx.fillText('amber nodes hold a prefix (next hop); the blue path is this destination, bit by bit; green is the longest prefix passed', 12, 18);
        ctx.lineWidth = 1;
        for (const node of sc.nodes) {
          for (const child of node.c) {
            if (!child) continue;
            ctx.strokeStyle = onPath.has(node) && onPath.has(child) ? algo : `${dim}66`;
            ctx.lineWidth = onPath.has(child) ? 2 : 1;
            ctx.beginPath();
            ctx.moveTo(X(node), Y(node));
            ctx.lineTo(X(child), Y(child));
            ctx.stroke();
          }
        }
        for (const node of sc.nodes) {
          const r = node.hop !== null ? 4.5 : 2.5;
          ctx.fillStyle = node === sc.matched ? good : node.hop !== null ? heur : onPath.has(node) ? algo : dim;
          ctx.beginPath();
          ctx.arc(X(node), Y(node), node === sc.matched ? 6 : r, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = dim;
        for (let d = 0; d <= BITS; d += 1) ctx.fillText(`/${d}`, 2, 44 + d * 26 + 4);
        const bits = sc.addr.toString(2).padStart(BITS, '0');
        for (let i = 0; i < BITS; i += 1) {
          ctx.fillStyle = i < sc.steps ? algo : dim;
          ctx.fillText(bits[i], 560 + i * 9, 36);
        }
        ctx.fillStyle = ink;
        ctx.fillText(`next hop ${sc.best}, ${sc.steps} steps`, 530, 52);
        ctx.fillStyle = sc.ok ? good : warn;
        ctx.fillText(sc.ok ? `invariant: every answer equals the table scan; steps <= ${BITS}` : 'INVARIANT BROKEN', 12, 268);
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
          new table
        </button>
        <span className="viz-stat">{snap.line || 'walking…'}</span>
      </div>
    </>
  );
}
