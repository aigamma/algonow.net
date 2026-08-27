import { useEffect, useRef, useState } from 'react';
import { useCanvasLoop, isStill, holdTicks, mulberry32 } from './useCanvasLoop.js';

// Two acts. Act one grows a real B+ tree (order 4) key by key:
// separator-only internals hollow blue, chained leaves along the
// bottom with amber next-arrows, splits flashing: then one lookup
// descends, touching exactly the height. Act two is the seek race:
// two page strips serve the same range: the B+ strip jumps thrice
// (the descent) then streams green along consecutive leaf pages;
// the B-tree strip arcs red between scattered pages, the seek
// counters keeping honest score.
const W = 640;
const H = 300;
const SEED = 20260827;
const ORDER = 4;
const N_KEYS = 20;
const KEY_TICKS = 14;
const LOOKUP_TICKS = 60;
const ACT2_HOPS = 14;
const HOP_TICKS = 14;
const END_HOLD = 60;

function buildBPlus(keys) {
  // Minimal insert-only B+ mirroring the verified Python. Called
  // fresh per frame with a prefix of the keys: 20 keys at order 4
  // costs nothing, and every intermediate state is authentic.
  let root = { leaf: true, keys: [], next: null };
  let height = 1;
  const insert = (node, k) => {
    if (node.leaf) {
      let i = 0;
      while (i < node.keys.length && node.keys[i] < k) i++;
      if (node.keys[i] === k) return null;
      node.keys.splice(i, 0, k);
      if (node.keys.length > ORDER) {
        const mid = node.keys.length >> 1;
        const right = { leaf: true, keys: node.keys.slice(mid), next: node.next };
        node.keys = node.keys.slice(0, mid);
        node.next = right;
        return [right.keys[0], right];
      }
      return null;
    }
    let i = 0;
    while (i < node.keys.length && k >= node.keys[i]) i++;
    const sp = insert(node.children[i], k);
    if (!sp) return null;
    node.keys.splice(i, 0, sp[0]);
    node.children.splice(i + 1, 0, sp[1]);
    if (node.keys.length > ORDER) {
      const mid = node.keys.length >> 1;
      const up = node.keys[mid];
      const right = {
        leaf: false,
        keys: node.keys.slice(mid + 1),
        children: node.children.slice(mid + 1),
      };
      node.keys = node.keys.slice(0, mid);
      node.children = node.children.slice(0, mid + 1);
      return [up, right];
    }
    return null;
  };
  keys.forEach((k) => {
    const sp = insert(root, k);
    if (sp) {
      root = { leaf: false, keys: [sp[0]], children: [root, sp[1]] };
      height += 1;
    }
  });
  return { root, height };
}

function layoutTree(root) {
  // Leaves left-to-right; internals centered above.
  const leaves = [];
  const collect = (n) => {
    if (n.leaf) leaves.push(n);
    else n.children.forEach(collect);
  };
  collect(root);
  const pos = new Map();
  leaves.forEach((n, i) => pos.set(n, { x: 50 + (i * 540) / Math.max(leaves.length - 1, 1), y: 200 }));
  const place = (n, depth) => {
    if (n.leaf) return pos.get(n).x;
    const xs = n.children.map((c) => place(c, depth + 1));
    const x = (Math.min(...xs) + Math.max(...xs)) / 2;
    pos.set(n, { x, y: 200 - depth * 0 });
    return x;
  };
  place(root, 0);
  // vertical: assign y by depth from root
  const setY = (n, depth, height) => {
    const p = pos.get(n);
    p.y = 60 + (depth * 140) / Math.max(height - 1, 1);
    if (!n.leaf) n.children.forEach((c) => setY(c, depth + 1, height));
  };
  return { pos, leaves, setY };
}

function makeScene(seed) {
  const rand = mulberry32(seed);
  const keys = [];
  const used = new Set();
  while (keys.length < N_KEYS) {
    const k = 10 + Math.floor(rand() * 89);
    if (!used.has(k)) {
      used.add(k);
      keys.push(k);
    }
  }
  const target = keys[Math.floor(rand() * keys.length)];
  // Act 2 page hops: B+ = [h random descent pages] + sequential leaves;
  // B-tree = scattered pages.
  const scatter = [];
  const perm = Array.from({ length: 30 }, (_, i) => i);
  for (let i = perm.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [perm[i], perm[j]] = [perm[j], perm[i]];
  }
  for (let i = 0; i < ACT2_HOPS; i++) scatter.push(perm[i]);
  const start = 3 + Math.floor(rand() * 6);
  const bplusHops = [26, 22, start];
  for (let i = 1; i < ACT2_HOPS - 2; i++) bplusHops.push(start + i);
  return { keys, built, target, scatter, bplusHops };
}

export default function BPlusViz() {
  const canvasRef = useRef(null);
  const cycle = useRef(0);
  const statsRef = useRef({ line: '' });
  const [restart, setRestart] = useState(0);
  const [snap, setSnap] = useState({ line: '' });

  useEffect(() => {
    const id = setInterval(() => setSnap({ ...statsRef.current }), 400);
    return () => clearInterval(id);
  }, []);

  const ACT1_TOTAL = N_KEYS * KEY_TICKS + LOOKUP_TICKS;
  const ACT2_TOTAL = ACT2_HOPS * HOP_TICKS * 2 + 40;

  useCanvasLoop(
    canvasRef,
    {
      width: W,
      height: H,
      stepMs: 45,
      init: () => ({
        scene: makeScene(SEED + cycle.current * 3163),
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
              scene: makeScene(SEED + cycle.current * 3163),
              act: 0,
              tick: 0,
              rest: 0,
            });
          }
          return true;
        }
        s.tick += 1;
        if (s.tick >= (s.act === 0 ? ACT1_TOTAL : ACT2_TOTAL + END_HOLD)) {
          s.tick = 0;
          s.act += 1;
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

        const sc = s.scene;
        if (s.act === 0) {
          const shown = Math.min(Math.floor(s.tick / KEY_TICKS), N_KEYS);
          const inLookup = s.tick >= N_KEYS * KEY_TICKS;
          const upTo = Math.max(1, shown);
          const { root, height } = buildBPlus(sc.keys.slice(0, upTo));
          const { pos, leaves, setY } = layoutTree(root);
          setY(root, 0, height);

          // Draw edges then nodes.
          const drawNode = (n) => {
            const p = pos.get(n);
            if (!n.leaf) {
              n.children.forEach((c) => {
                const q = pos.get(c);
                ctx.strokeStyle = '#2a3450';
                ctx.beginPath();
                ctx.moveTo(p.x, p.y + 9);
                ctx.lineTo(q.x, q.y - 9);
                ctx.stroke();
                drawNode(c);
              });
            }
            const label = n.keys.join(' ');
            const w = Math.max(30, label.length * 6.4 + 10);
            ctx.fillStyle = n.leaf ? 'rgba(93,162,255,0.12)' : 'none';
            ctx.strokeStyle = n.leaf ? '#40507a' : algo;
            ctx.lineWidth = 1.5;
            if (n.leaf) ctx.fillRect(p.x - w / 2, p.y - 9, w, 18);
            ctx.strokeRect(p.x - w / 2, p.y - 9, w, 18);
            ctx.fillStyle = n.leaf ? dim : algo;
            ctx.font = '10px ui-monospace, monospace';
            ctx.fillText(label, p.x - label.length * 3, p.y + 4);
          };
          drawNode(root);
          // Leaf chain arrows.
          for (let i = 0; i + 1 < leaves.length; i++) {
            const a = pos.get(leaves[i]);
            const b = pos.get(leaves[i + 1]);
            ctx.strokeStyle = heur;
            ctx.lineWidth = 1.6;
            ctx.beginPath();
            ctx.moveTo(a.x + 22, a.y + 14);
            ctx.lineTo(b.x - 22, b.y + 14);
            ctx.stroke();
          }
          ctx.fillStyle = dim;
          ctx.font = '11px ui-monospace, monospace';
          ctx.fillText('act 1 · rows live in leaves, internals route, the amber chain links the leaves', 14, 20);

          let line;
          if (!inLookup) {
            line = `insert ${upTo}/${N_KEYS}: key ${sc.keys[upTo - 1]} · splits copy the leaf key up`;
            ctx.fillStyle = dim;
          } else {
            line = `lookup(${sc.target}): touches exactly ${height} nodes: every lookup, zero variance`;
            ctx.fillStyle = good;
          }
          ctx.font = '12px ui-monospace, monospace';
          ctx.fillText(line, 14, H - 12);
          statsRef.current = { line };
        } else {
          // Act 2: the seek race.
          const done = s.act >= 2;
          const t = done ? ACT2_TOTAL : Math.min(s.tick, ACT2_TOTAL);
          const hopsB = Math.min(Math.floor(t / HOP_TICKS), ACT2_HOPS);
          const hopsT = Math.min(Math.floor((t - 6) / HOP_TICKS), ACT2_HOPS);
          const strip = (y, pages, hops, seqFrom, color) => {
            for (let i = 0; i < 30; i++) {
              ctx.strokeStyle = '#2a3450';
              ctx.strokeRect(30 + i * 19.5, y, 17, 16);
            }
            let seeks = 0;
            let prev = null;
            for (let i = 0; i < hops; i++) {
              const p = pages[i];
              const seq = prev !== null && p === prev + 1;
              if (!seq) seeks += 1;
              ctx.fillStyle = seq ? good : color;
              ctx.fillRect(31 + p * 19.5, y + 1, 15, 14);
              if (prev !== null && !seq) {
                const x1 = 38 + prev * 19.5;
                const x2 = 38 + p * 19.5;
                ctx.strokeStyle = color;
                ctx.lineWidth = 1.2;
                ctx.beginPath();
                ctx.moveTo(x1, y + (y < 140 ? -2 : 18));
                ctx.quadraticCurveTo((x1 + x2) / 2, y + (y < 140 ? -22 : 38), x2, y + (y < 140 ? -2 : 18));
                ctx.stroke();
              }
              prev = p;
            }
            return seeks;
          };
          ctx.fillStyle = dim;
          ctx.font = '11px ui-monospace, monospace';
          ctx.fillText('act 2 · the same range on two layouts: green cells were sequential reads', 14, 20);
          ctx.fillText('B+ leaves in chain order:', 30, 52);
          const s1 = strip(60, sc.bplusHops, hopsB, 2, heur);
          ctx.fillText('B-tree pages in creation order:', 30, 178);
          const s2 = strip(186, sc.scatter, Math.max(hopsT, 0), 99, warn);
          ctx.fillStyle = heur;
          ctx.fillText(`seeks: ${s1}`, 560, 52);
          ctx.fillStyle = warn;
          ctx.fillText(`seeks: ${s2}`, 560, 178);

          let line;
          if (!done && hopsB < ACT2_HOPS) {
            line = 'the descent seeks, the chain streams: watch the green run grow';
            ctx.fillStyle = dim;
          } else {
            line = `${s1} seeks vs ${s2}: the win was never fewer touches: it is touches in a straight line`;
            ctx.fillStyle = good;
          }
          ctx.font = '12px ui-monospace, monospace';
          ctx.fillText(line, 14, H - 12);
          statsRef.current = { line };
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
          new keys
        </button>
        <span className="viz-stat">
          {snap.line || 'the first key arrives…'}
        </span>
      </div>
    </>
  );
}
