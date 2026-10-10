import { useEffect, useRef, useState } from 'react';
import { useCanvasLoop, isStill, holdTicks, mulberry32 } from './useCanvasLoop.js';

// Two trees fed the same keys, one key per tick: an AVL tree on the
// left and a plain binary search tree on the right. The first keys
// arrive shuffled, the rest in ascending order, which stretches the
// plain tree into a spine while the AVL rule keeps rotating it back to
// a logarithmic height. The node that rotated is ringed red for one
// tick, the heights are counted beside the trees, and the AVL bound
// and the perfect floor are shown for the current size.
const W = 640;
const H = 300;
const SEED = 20261010;
const SHUFFLED = 14;
const ASCENDING = 18;

function makeKeys(rand) {
  const pool = [];
  for (let k = 10; k < 60; k += 1) pool.push(k);
  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  const first = pool.slice(0, SHUFFLED);
  const rest = [];
  for (let k = 60; k < 60 + ASCENDING; k += 1) rest.push(k);
  return first.concat(rest);
}

const h = (n) => (n ? n.height : 0);
const upd = (n) => {
  n.height = 1 + Math.max(h(n.left), h(n.right));
};

function rotR(y, st) {
  const x = y.left;
  y.left = x.right;
  x.right = y;
  upd(y);
  upd(x);
  st.rotations += 1;
  return x;
}

function rotL(x, st) {
  const y = x.right;
  x.right = y.left;
  y.left = x;
  upd(x);
  upd(y);
  st.rotations += 1;
  return y;
}

function avlInsert(node, key, st) {
  if (!node) return { key, left: null, right: null, height: 1 };
  if (key < node.key) node.left = avlInsert(node.left, key, st);
  else if (key > node.key) node.right = avlInsert(node.right, key, st);
  else return node;
  upd(node);
  const b = h(node.left) - h(node.right);
  if (b > 1) {
    if (h(node.left.left) - h(node.left.right) < 0) {
      node.left = rotL(node.left, st);
      st.kind = 'double';
    } else st.kind = 'single';
    st.pivot = node.key;
    return rotR(node, st);
  }
  if (b < -1) {
    if (h(node.right.left) - h(node.right.right) > 0) {
      node.right = rotR(node.right, st);
      st.kind = 'double';
    } else st.kind = 'single';
    st.pivot = node.key;
    return rotL(node, st);
  }
  return node;
}

function bstInsert(node, key) {
  if (!node) return { key, left: null, right: null };
  if (key < node.key) node.left = bstInsert(node.left, key);
  else if (key > node.key) node.right = bstInsert(node.right, key);
  return node;
}

function height(node) {
  return node ? 1 + Math.max(height(node.left), height(node.right)) : 0;
}

export function checkAvl(node) {
  if (!node) return { ok: true, height: 0 };
  const l = checkAvl(node.left);
  const r = checkAvl(node.right);
  const ok = l.ok && r.ok && Math.abs(l.height - r.height) <= 1
    && node.height === 1 + Math.max(l.height, r.height)
    && (!node.left || node.left.key < node.key) && (!node.right || node.right.key > node.key);
  return { ok, height: 1 + Math.max(l.height, r.height) };
}

export function makeScene(seed) {
  const rand = mulberry32(seed);
  return {
    keys: makeKeys(rand),
    i: 0,
    avl: null,
    bst: null,
    single: 0,
    double: 0,
    pivot: null,
    kind: null,
    last: 'two empty trees; the same keys will go into both',
    done: false,
    ok: true,
  };
}

export function sceneTick(sc) {
  if (sc.done) return true;
  if (sc.i >= sc.keys.length) {
    sc.done = true;
    return true;
  }
  const key = sc.keys[sc.i];
  const st = { rotations: 0, pivot: null, kind: null };
  sc.avl = avlInsert(sc.avl, key, st);
  sc.bst = bstInsert(sc.bst, key);
  sc.pivot = st.pivot;
  sc.kind = st.kind;
  if (st.kind === 'single') sc.single += 1;
  if (st.kind === 'double') sc.double += 1;
  sc.ok = checkAvl(sc.avl).ok;
  const phase = sc.i < SHUFFLED ? 'shuffled' : 'ascending';
  sc.last = st.pivot === null
    ? `insert ${key} (${phase}): heights relabeled on the way up, no node out of balance`
    : `insert ${key} (${phase}): ${st.kind} rotation at ${st.pivot}, then the walk up stops`;
  sc.i += 1;
  return false;
}

function layout(root) {
  const pos = new Map();
  let col = 0;
  const walk = (n, d) => {
    if (!n) return;
    walk(n.left, d + 1);
    pos.set(n, { x: col, y: d });
    col += 1;
    walk(n.right, d + 1);
  };
  walk(root, 0);
  return { pos, cols: col };
}

function drawTree(ctx, root, ox, areaW, top, rowH, colors, pivot, labelNodes) {
  const { pos, cols } = layout(root);
  const X = (x) => ox + ((x + 0.5) / Math.max(cols, 1)) * areaW;
  const Y = (y) => top + y * rowH;
  ctx.strokeStyle = `${colors.dim}88`;
  for (const [n, p] of pos) {
    for (const c of [n.left, n.right]) {
      if (!c) continue;
      const q = pos.get(c);
      ctx.beginPath();
      ctx.moveTo(X(p.x), Y(p.y));
      ctx.lineTo(X(q.x), Y(q.y));
      ctx.stroke();
    }
  }
  const radius = rowH > 20 ? 9 : 5;
  for (const [n, p] of pos) {
    ctx.beginPath();
    ctx.arc(X(p.x), Y(p.y), radius, 0, Math.PI * 2);
    ctx.fillStyle = colors.fill;
    ctx.fill();
    if (pivot !== null && n.key === pivot) {
      ctx.strokeStyle = colors.warn;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.lineWidth = 1;
    }
    if (labelNodes) {
      ctx.fillStyle = colors.ink;
      ctx.font = '9px ui-monospace, monospace';
      ctx.fillText(String(n.key), X(p.x) - 5, Y(p.y) + 3);
    }
  }
}

export default function AvlTreeViz() {
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
        const n = sc.i;
        ctx.font = '11px ui-monospace, monospace';
        ctx.fillStyle = dim;
        ctx.fillText(`the same keys into both trees, one per tick: ${SHUFFLED} shuffled, then ${ASCENDING} ascending; red ring: the node that rotated`, 12, 18);
        ctx.fillStyle = heur;
        ctx.fillText('AVL tree (height-balance rule)', 20, 40);
        ctx.fillStyle = dim;
        ctx.fillText('plain binary search tree (no rule)', 350, 40);
        drawTree(ctx, sc.avl, 16, 300, 60, 24, { dim, fill: algo, ink, warn }, sc.pivot, true);
        drawTree(ctx, sc.bst, 346, 290, 60, 11, { dim, fill: `${algo}99`, ink, warn }, null, false);
        const ha = height(sc.avl);
        const hb = height(sc.bst);
        const bound = n > 0 ? 1.4405 * Math.log2(n + 2) - 0.328 : 0;
        const floor = n > 0 ? Math.ceil(Math.log2(n + 1)) : 0;
        ctx.fillStyle = ink;
        ctx.fillText(`n ${n}  height ${ha}  (bound ${bound.toFixed(1)}, floor ${floor})`, 20, 262);
        ctx.fillText(`height ${hb}`, 350, 262);
        ctx.fillStyle = dim;
        ctx.fillText(`${sc.single} single, ${sc.double} double rotations`, 20, 278);
        ctx.fillStyle = sc.ok ? good : warn;
        ctx.fillText(sc.ok ? 'search order, heights, balance: all hold' : 'INVARIANT BROKEN', 350, 278);
        let line;
        if (s.done) {
          line = `after ${n} keys: AVL height ${ha} (bound ${bound.toFixed(1)}) with ${sc.single + sc.double} rotations; the plain tree is ${hb} deep, a spine of the ascending keys`;
          ctx.fillStyle = good;
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
          restart
        </button>
        <span className="viz-stat" aria-live="polite">{snap.line}</span>
      </div>
    </>
  );
}
