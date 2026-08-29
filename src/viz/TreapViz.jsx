import { useEffect, useRef, useState } from 'react';
import { useCanvasLoop, isStill, holdTicks, mulberry32 } from './useCanvasLoop.js';

// Two acts of one lottery. Act one: the adversary: sequential
// keys pour into a plain BST (which sags into a chain, its depth
// counter climbing red) and into a treap (whose dice keep it
// bushy, counter steady green): same keys, same order, different
// shapes. Act two: the canonical-shape theorem on screen: the
// same (key, priority) set built in three different arrival
// orders lands on the identical tree, node for node.
const W = 640;
const H = 300;
const SEED = 20260829;
const END_HOLD = 70;
const N1 = 26;

export function insertTreap(root, key, pri) {
  if (root === null) return { key, pri, left: null, right: null };
  if (pri > root.pri) {
    const [l, r] = splitAt(root, key);
    return { key, pri, left: l, right: r };
  }
  if (key < root.key) return { ...root, left: insertTreap(root.left, key, pri) };
  return { ...root, right: insertTreap(root.right, key, pri) };
}

export function splitAt(node, key) {
  if (node === null) return [null, null];
  if (node.key < key) {
    const [l, r] = splitAt(node.right, key);
    return [{ ...node, right: l }, r];
  }
  const [l, r] = splitAt(node.left, key);
  return [l, { ...node, left: r }];
}

export function insertBst(root, key) {
  if (root === null) return { key, left: null, right: null };
  if (key < root.key) return { ...root, left: insertBst(root.left, key) };
  if (key > root.key) return { ...root, right: insertBst(root.right, key) };
  return root;
}

export function layout(root) {
  // x = in-order rank, y = depth; also returns max depth.
  const nodes = [];
  let rank = 0;
  let maxD = 0;
  const walk = (n, d, parent) => {
    if (!n) return;
    walk(n.left, d + 1, n.key);
    nodes.push({ key: n.key, pri: n.pri, x: rank, y: d, parent });
    rank += 1;
    maxD = Math.max(maxD, d);
    walk(n.right, d + 1, n.key);
  };
  walk(root, 0, null);
  return { nodes, maxD };
}

export function auditTreap(node, lo, hi, cap) {
  if (!node) return true;
  if (!(node.key > lo && node.key < hi)) return false;
  if (node.pri !== undefined && node.pri > cap + 1e-12) return false;
  return (
    auditTreap(node.left, lo, node.key, node.pri ?? cap)
    && auditTreap(node.right, node.key, hi, node.pri ?? cap)
  );
}

export function makeScene(seed) {
  const rand = mulberry32(seed);
  // act 1: sequential 1..N1 into both structures, snapshot layouts
  let bst = null;
  let treap = null;
  const snaps = [];
  for (let k = 1; k <= N1; k++) {
    bst = insertBst(bst, k);
    treap = insertTreap(treap, k, rand());
    snaps.push({ bst: layout(bst), treap: layout(treap) });
  }
  // act 2: one (key, pri) set, three arrival orders
  const keys = [];
  while (keys.length < 12) {
    const k = 1 + Math.floor(rand() * 99);
    if (!keys.includes(k)) keys.push(k);
  }
  const pri = new Map(keys.map((k) => [k, rand()]));
  const asc = [...keys].sort((a, b) => a - b);
  const desc = [...asc].reverse();
  const orders = [asc, desc, keys];
  const builds = orders.map((ord) => {
    let t = null;
    const frames = [];
    for (const k of ord) {
      t = insertTreap(t, k, pri.get(k));
      frames.push(layout(t));
    }
    return { frames, final: layout(t), root: t };
  });
  return { snaps, builds, treapRoot: treap, bstRoot: bst };
}

export default function TreapViz() {
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
      stepMs: 55,
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
        const len = s.act === 0 ? N1 * 8 + END_HOLD : 12 * 12 + 60 + END_HOLD;
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

        const drawTree = (lay, x0, wPx, y0, hPx, color, maxRows) => {
          const n = lay.nodes.length;
          const px = (nd) => x0 + ((nd.x + 0.5) / Math.max(n, 1)) * wPx;
          const py = (nd) => y0 + Math.min(nd.y, maxRows) * (hPx / maxRows);
          const byKey = new Map(lay.nodes.map((nd) => [nd.key, nd]));
          ctx.strokeStyle = `${color}66`;
          ctx.lineWidth = 1.1;
          for (const nd of lay.nodes) {
            if (nd.parent !== null) {
              const p = byKey.get(nd.parent);
              ctx.beginPath();
              ctx.moveTo(px(p), py(p));
              ctx.lineTo(px(nd), py(nd));
              ctx.stroke();
            }
          }
          ctx.fillStyle = color;
          for (const nd of lay.nodes) {
            ctx.beginPath();
            ctx.arc(px(nd), py(nd), 3, 0, Math.PI * 2);
            ctx.fill();
          }
        };

        const done = s.act >= 2;
        const actIdx = done ? 1 : s.act;
        ctx.fillStyle = dim;
        ctx.font = '11px ui-monospace, monospace';

        if (actIdx === 0) {
          const t = done ? N1 * 8 : Math.min(s.tick, N1 * 8);
          const idx = Math.min(N1 - 1, Math.floor(t / 8));
          const st = sc.snaps[idx];
          ctx.fillText('act 1 · the adversary: keys arrive in sorted order, 1, 2, 3, … : same input, two shapes', 14, 20);
          ctx.fillStyle = warn;
          ctx.fillText(`plain bst · depth ${st.bst.maxD + 1}`, 40, 44);
          drawTree(st.bst, 30, 270, 56, 190, warn, 24);
          ctx.fillStyle = good;
          ctx.fillText(`treap · depth ${st.treap.maxD + 1} (dice)`, 360, 44);
          drawTree(st.treap, 340, 270, 56, 190, algo, 24);
          let line;
          if (done || t >= N1 * 8) {
            line = `all ${N1} keys in: bst depth ${st.bst.maxD + 1} (a chain), treap depth ${st.treap.maxD + 1}: the dice never saw the arrival order`;
            ctx.fillStyle = good;
          } else {
            line = `inserting key ${idx + 1}: the bst extends its chain; the treap's lottery decides the shape`;
            ctx.fillStyle = ink;
          }
          ctx.font = '12px ui-monospace, monospace';
          ctx.fillText(line, 14, H - 12);
          statsRef.current = { line };
        } else {
          const t = done ? 12 * 12 + 60 : Math.min(s.tick, 12 * 12 + 60);
          ctx.fillText('act 2 · the canonical shape: one (key, priority) set, three arrival orders, one tree', 14, 20);
          const labels = ['ascending', 'descending', 'shuffled'];
          const finalPhase = t > 12 * 12;
          sc.builds.forEach((b, i) => {
            const x0 = 20 + i * 208;
            const step = Math.min(11, Math.floor(t / 12));
            const lay = finalPhase ? b.final : b.frames[step];
            ctx.fillStyle = finalPhase ? good : heur;
            ctx.font = '11px ui-monospace, monospace';
            ctx.fillText(labels[i], x0 + 10, 44);
            drawTree(lay, x0, 190, 58, 160, finalPhase ? good : algo, 8);
          });
          let line;
          if (finalPhase) {
            line = 'identical, node for node: the shape is a function of the set, not of the arrival: the theorem, drawn';
            ctx.fillStyle = good;
          } else {
            line = 'three builds, three different insertion sequences, one lottery: watch them converge';
            ctx.fillStyle = ink;
          }
          ctx.font = '12px ui-monospace, monospace';
          ctx.fillText(line, 14, H - 12);
          statsRef.current = {
            line: done
              ? 'two orders in one tree: keys left-to-right, dice top-to-bottom: the adversary holds neither'
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
          new lottery
        </button>
        <span className="viz-stat">
          {snap.line || 'drawing priorities…'}
        </span>
      </div>
    </>
  );
}
