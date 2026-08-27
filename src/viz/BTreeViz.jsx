import { useEffect, useRef, useState } from 'react';
import { useCanvasLoop, isStill, holdTicks, mulberry32 } from './useCanvasLoop.js';

// A 2-3-4 tree (t = 2) built key by key, then read. Act one: sixteen
// inserts; full nodes split around their median on the way down, and
// when the ROOT splits the whole tree gains a level at the top: the
// banner calls it out, because that is why every leaf shares a depth.
// Act two: three lookups walk root-to-leaf with a live page counter:
// the whole index answers in `height` pages.
const W = 640;
const H = 300;
const SEED = 20260827;
const T = 2;
const INSERT_TICKS = 15;
const LOOKUP_LEVEL_TICKS = 9;
const LOOKUP_HOLD = 18;
const END_HOLD = 60;

function makeTree() {
  return { keys: [], kids: [] };
}

function insert(root, key) {
  if (root.keys.length === 2 * T - 1) {
    const old = root;
    root = { keys: [], kids: [old] };
    splitChild(root, 0);
  }
  let node = root;
  for (;;) {
    let i = node.keys.findIndex((k) => key < k);
    if (i === -1) i = node.keys.length;
    if (node.keys.includes(key)) return root;
    if (!node.kids.length) {
      node.keys.splice(i, 0, key);
      return root;
    }
    if (node.kids[i].keys.length === 2 * T - 1) {
      splitChild(node, i);
      if (key > node.keys[i]) i += 1;
      else if (key === node.keys[i]) return root;
    }
    node = node.kids[i];
  }
}

function splitChild(parent, i) {
  const child = parent.kids[i];
  const right = { keys: child.keys.slice(T), kids: child.kids.slice(T) };
  const mid = child.keys[T - 1];
  child.keys = child.keys.slice(0, T - 1);
  child.kids = child.kids.slice(0, T);
  parent.keys.splice(i, 0, mid);
  parent.kids.splice(i + 1, 0, right);
}

function layout(root) {
  const nodes = [];
  let cursor = 30;
  const KW = 26;
  const measure = (node, depth) => {
    const w = node.keys.length * KW + 10;
    let x;
    if (!node.kids.length) {
      x = cursor;
      cursor += w + 14;
    } else {
      const xs = node.kids.map((k) => measure(k, depth + 1));
      const lo = xs[0].x;
      const hi = xs[xs.length - 1].x + xs[xs.length - 1].w;
      x = (lo + hi) / 2 - w / 2;
    }
    const rec = { keys: node.keys.slice(), depth, x, w, kids: node.kids.length };
    nodes.push(rec);
    return rec;
  };
  const height = (function h(n) {
    return n.kids.length ? 1 + h(n.kids[0]) : 1;
  })(root);
  measure(root, 0);
  const total = cursor;
  const scale = Math.min(1, (W - 40) / total);
  nodes.forEach((n) => {
    n.x = 20 + n.x * scale;
    n.w = n.w * scale;
  });
  return { nodes, height };
}

function searchPath(root, key) {
  const path = [];
  let node = root;
  for (;;) {
    path.push(node);
    if (node.keys.includes(key) || !node.kids.length) return path;
    let i = node.keys.findIndex((k) => key < k);
    if (i === -1) i = node.keys.length;
    node = node.kids[i];
  }
}

function makeScene(seed) {
  const rand = mulberry32(seed);
  const pool = Array.from({ length: 40 }, (_, i) => i + 10);
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  const keys = pool.slice(0, 16);
  const snaps = [];
  let root = makeTree();
  let prevHeight = 1;
  keys.forEach((k) => {
    root = insert(root, k);
    const lay = layout(root);
    snaps.push({ key: k, ...lay, rootSplit: lay.height > prevHeight });
    prevHeight = lay.height;
  });
  const lookups = [keys[3], keys[9], keys[14]].map((k) => {
    const path = searchPath(root, k);
    // Match path nodes to layout records by (depth, first key).
    const lay = snaps[snaps.length - 1];
    const recs = path.map((n, d) =>
      lay.nodes.find((r) => r.depth === d && r.keys[0] === n.keys[0] && r.keys.length === n.keys.length),
    );
    return { key: k, recs };
  });
  return { snaps, lookups };
}

export default function BTreeViz() {
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
      stepMs: 45,
      init: () => ({
        scene: makeScene(SEED + cycle.current * 7919),
        tick: 0,
        rest: 0,
        stopAtRest: isStill(),
      }),
      tick: (s) => {
        const act1 = s.scene.snaps.length * INSERT_TICKS;
        const perLookup = (lk) => lk.recs.length * LOOKUP_LEVEL_TICKS + LOOKUP_HOLD;
        const total = act1 + s.scene.lookups.reduce((t, lk) => t + perLookup(lk), 0) + END_HOLD;
        if (s.tick >= total) {
          if (s.stopAtRest) return false;
          s.rest += 1;
          if (s.rest > holdTicks(s)) {
            cycle.current += 1;
            Object.assign(s, {
              scene: makeScene(SEED + cycle.current * 7919),
              tick: 0,
              rest: 0,
            });
          }
          return true;
        }
        s.tick += 1;
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

        const act1 = sc.snaps.length * INSERT_TICKS;
        let line = '';
        let lay;
        let hiRecs = [];
        let hiLevels = 0;
        let label = '';

        if (s.tick < act1) {
          const step = Math.min(Math.floor(s.tick / INSERT_TICKS), sc.snaps.length - 1);
          lay = sc.snaps[step];
          label = `act 1 · insert ${lay.key}${lay.rootSplit ? ' · THE ROOT SPLIT: height is now ' + lay.height : ''}`;
          line = `${step + 1}/16 keys · height ${lay.height} · every leaf at depth ${lay.height}`;
        } else {
          lay = sc.snaps[sc.snaps.length - 1];
          let t = s.tick - act1;
          let li = 0;
          for (; li < sc.lookups.length; li++) {
            const span = sc.lookups[li].recs.length * LOOKUP_LEVEL_TICKS + LOOKUP_HOLD;
            if (t < span) break;
            t -= span;
          }
          if (li >= sc.lookups.length) {
            label = 'the ledger shelf: 3 pages answer anything';
            line = `height ${lay.height}: a lookup costs ${lay.height} page reads`;
          } else {
            const lk = sc.lookups[li];
            hiLevels = Math.min(Math.floor(t / LOOKUP_LEVEL_TICKS) + 1, lk.recs.length);
            hiRecs = lk.recs.slice(0, hiLevels).filter(Boolean);
            label = `act 2 · lookup ${lk.key}`;
            line = `pages read: ${hiLevels} of ${lk.recs.length}`;
            if (t >= lk.recs.length * LOOKUP_LEVEL_TICKS) {
              line = `found ${lk.key} in ${lk.recs.length} page reads`;
            }
          }
        }

        // Draw nodes.
        lay.nodes.forEach((n) => {
          const y = 56 + n.depth * 62;
          const isHi = hiRecs.includes(n);
          ctx.fillStyle = isHi ? `${good}22` : 'rgba(93,162,255,0.08)';
          ctx.strokeStyle = isHi ? good : algo;
          ctx.lineWidth = isHi ? 2.2 : 1.2;
          ctx.fillRect(n.x, y, n.w, 26);
          ctx.strokeRect(n.x + 0.5, y + 0.5, n.w - 1, 25);
          ctx.fillStyle = ink;
          ctx.font = '12px ui-monospace, monospace';
          ctx.textAlign = 'center';
          n.keys.forEach((k, i) => {
            ctx.fillText(String(k), n.x + ((i + 0.5) * n.w) / n.keys.length, y + 17);
          });
          ctx.textAlign = 'start';
        });
        // Edges (approximate: parent to child by depth adjacency and x-range).
        lay.nodes.forEach((p) => {
          if (!p.kids) return;
          const y1 = 56 + p.depth * 62 + 26;
          lay.nodes
            .filter((c) => c.depth === p.depth + 1 && c.x + c.w / 2 >= p.x - 40 && c.x + c.w / 2 <= p.x + p.w + 40)
            .forEach((c) => {
              ctx.strokeStyle = '#2a3450';
              ctx.beginPath();
              ctx.moveTo(p.x + p.w / 2, y1);
              ctx.lineTo(c.x + c.w / 2, 56 + c.depth * 62);
              ctx.stroke();
            });
        });

        ctx.fillStyle = dim;
        ctx.font = '11px ui-monospace, monospace';
        ctx.fillText(label, 14, 20);
        ctx.fillStyle = s.tick < act1 ? ink : good;
        ctx.font = '12px ui-monospace, monospace';
        ctx.fillText(line, 14, H - 12);

        statsRef.current = { line: `${label} · ${line}` };
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
          new keys
        </button>
        <span className="viz-stat">
          {snap.line || 'ruling the first ledger…'}
        </span>
      </div>
    </>
  );
}
