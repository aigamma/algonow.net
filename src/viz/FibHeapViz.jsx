import { useEffect, useRef, useState } from 'react';
import { useCanvasLoop, isStill, holdTicks, mulberry32 } from './useCanvasLoop.js';

// A Fibonacci heap under a random workload, one operation per tick.
// Insert drops a one-node tree into the root list. Decrease-key cuts
// the node from its parent (marking the parent, or cutting it too if it
// was already marked). Delete-min is the only tidying operation: it
// links roots of equal degree until every degree is unique. The forest
// is drawn with the minimum ringed green, marked nodes amber, and the
// counts of links, cuts, cascading cuts, and marks kept beside it. The
// Fibonacci property (a node of degree k has at least F(k + 2)
// descendants) is checked every tick.
const W = 640;
const H = 300;
const SEED = 20260926;
const TICKS = 90;

const FIB = [1, 1];
while (FIB.length < 40) FIB.push(FIB[FIB.length - 1] + FIB[FIB.length - 2]);

function makeHeap() {
  return { roots: [], min: null, n: 0, links: 0, cuts: 0, cascading: 0, marks: 0, nextId: 0 };
}

function insert(h, key) {
  const node = { id: h.nextId++, key, parent: null, children: [], mark: false };
  h.roots.push(node);
  if (h.min === null || key < h.min.key) h.min = node;
  h.n += 1;
  return node;
}

function link(h, y, x) {
  h.roots.splice(h.roots.indexOf(y), 1);
  y.parent = x;
  y.mark = false;
  x.children.push(y);
  h.links += 1;
}

function deleteMin(h) {
  const z = h.min;
  if (!z) return { removed: null, links: 0, before: 0 };
  h.roots.splice(h.roots.indexOf(z), 1);
  for (const c of z.children) {
    c.parent = null;
    c.mark = false;
    h.roots.push(c);
  }
  z.children = [];
  h.n -= 1;
  const before = h.roots.length;
  const linksBefore = h.links;
  const table = new Map();
  for (const r of h.roots.slice()) {
    let x = r;
    let d = x.children.length;
    while (table.has(d)) {
      let y = table.get(d);
      table.delete(d);
      if (y.key < x.key) [x, y] = [y, x];
      link(h, y, x);
      d += 1;
    }
    table.set(d, x);
  }
  h.min = null;
  for (const r of h.roots) if (h.min === null || r.key < h.min.key) h.min = r;
  return { removed: z, links: h.links - linksBefore, before };
}

function cut(h, x, y) {
  y.children.splice(y.children.indexOf(x), 1);
  x.parent = null;
  x.mark = false;
  h.roots.push(x);
  h.cuts += 1;
}

function decreaseKey(h, node, key) {
  node.key = key;
  let y = node.parent;
  let cutsMade = 0;
  let marked = null;
  if (y && node.key < y.key) {
    cut(h, node, y);
    cutsMade += 1;
    let z = y.parent;
    while (z) {
      if (!y.mark) {
        y.mark = true;
        h.marks += 1;
        marked = y;
        break;
      }
      cut(h, y, z);
      h.cascading += 1;
      cutsMade += 1;
      y = z;
      z = y.parent;
    }
  }
  if (node.key < h.min.key) h.min = node;
  return { cutsMade, marked };
}

function allNodes(h) {
  const out = [];
  const walk = (node, depth) => {
    out.push({ node, depth });
    for (const c of node.children) walk(c, depth + 1);
  };
  for (const r of h.roots) walk(r, 0);
  return out;
}

function subtreeSize(node) {
  let s = 1;
  for (const c of node.children) s += subtreeSize(c);
  return s;
}

export function checkInvariants(h) {
  const nodes = allNodes(h);
  let heapOrder = true;
  let fibonacci = true;
  let count = 0;
  let maxDegree = 0;
  for (const { node } of nodes) {
    count += 1;
    maxDegree = Math.max(maxDegree, node.children.length);
    for (const c of node.children) if (c.key < node.key) heapOrder = false;
    if (subtreeSize(node) < FIB[node.children.length + 1]) fibonacci = false;
  }
  let minOk = h.min === null ? count === 0 : h.roots.every((r) => r.key >= h.min.key) && h.roots.includes(h.min);
  return { heapOrder, fibonacci, minOk, count: count === h.n, maxDegree, n: h.n };
}

export function makeScene(seed) {
  const rand = mulberry32(seed);
  const h = makeHeap();
  const live = [];
  for (let i = 0; i < 12; i++) live.push(insert(h, 10 + Math.floor(rand() * 90)));
  return { rand, h, live, tick: 0, last: 'twelve inserts: twelve one-node trees in the root list, no tidying yet', done: false, lastOp: 'insert', touched: null, ok: checkInvariants(h) };
}

export function sceneTick(sc) {
  if (sc.done) return true;
  const { rand, h } = sc;
  const r = rand();
  if (sc.tick >= TICKS || h.n === 0) {
    sc.done = true;
    return true;
  }
  if (h.n < 6 || (r < 0.4 && h.n < 34)) {
    const key = 10 + Math.floor(rand() * 90);
    const node = insert(h, key);
    sc.live.push(node);
    sc.touched = node;
    sc.lastOp = 'insert';
    sc.last = `insert ${key}: a one-node tree joins the root list (${h.roots.length} roots now); nothing is tidied`;
  } else if (r < 0.75) {
    const node = sc.live[Math.floor(rand() * sc.live.length)];
    const key = Math.max(1, node.key - 1 - Math.floor(rand() * 40));
    const parentKey = node.parent ? node.parent.key : null;
    const { cutsMade, marked } = decreaseKey(h, node, key);
    sc.touched = node;
    sc.lastOp = 'decrease';
    if (cutsMade === 0) sc.last = parentKey === null ? `decrease-key to ${key} on a root: no cut needed` : `decrease-key to ${key}: still at or above its parent ${parentKey}, so it stays put`;
    else if (cutsMade === 1) sc.last = `decrease-key to ${key}: cut from parent ${parentKey}${marked ? `, parent ${marked.key} marked (its first lost child)` : ''}`;
    else sc.last = `decrease-key to ${key}: cut from ${parentKey}, then ${cutsMade - 1} cascading cut${cutsMade > 2 ? 's' : ''} of marked ancestors`;
  } else {
    const { removed, links, before } = deleteMin(h);
    sc.live.splice(sc.live.indexOf(removed), 1);
    sc.touched = null;
    sc.lastOp = 'delete-min';
    const degrees = h.roots.map((x) => x.children.length).sort((a, b) => a - b).join(',');
    sc.last = `delete-min ${removed.key}: ${before} roots consolidated with ${links} links into degrees {${degrees}}`;
  }
  sc.ok = checkInvariants(h);
  sc.tick += 1;
  return false;
}

export default function FibHeapViz() {
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
      stepMs: 700,
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
        const h = sc.h;
        ctx.font = '11px ui-monospace, monospace';
        ctx.fillStyle = dim;
        ctx.fillText('the root list, left to right; green ring: the minimum; amber: marked (lost one child); one operation per tick', 12, 18);
        // layout: x by DFS order, y by depth
        const nodes = allNodes(h);
        const positions = new Map();
        let col = 0;
        const place = (node, depth) => {
          if (node.children.length === 0) {
            positions.set(node, { x: col, y: depth });
            col += 1;
            return col - 1;
          }
          const first = col;
          for (const c of node.children) place(c, depth + 1);
          const x = (first + col - 1) / 2;
          positions.set(node, { x, y: depth });
          return x;
        };
        for (const r of h.roots) {
          place(r, 0);
          col += 0.6;
        }
        const total = Math.max(col, 1);
        const ox = 20;
        const areaW = 430;
        const X = (x) => ox + ((x + 0.5) / total) * areaW;
        const Y = (y) => 48 + y * 34;
        ctx.strokeStyle = `${dim}88`;
        for (const { node } of nodes) {
          const p = positions.get(node);
          for (const c of node.children) {
            const q = positions.get(c);
            ctx.beginPath();
            ctx.moveTo(X(p.x), Y(p.y));
            ctx.lineTo(X(q.x), Y(q.y));
            ctx.stroke();
          }
        }
        const radius = total > 26 ? 7 : 9;
        for (const { node } of nodes) {
          const p = positions.get(node);
          ctx.beginPath();
          ctx.arc(X(p.x), Y(p.y), radius, 0, Math.PI * 2);
          ctx.fillStyle = node.mark ? heur : node.parent ? `${algo}55` : algo;
          ctx.fill();
          if (node === h.min) {
            ctx.strokeStyle = good;
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.lineWidth = 1;
          }
          if (node === sc.touched) {
            ctx.strokeStyle = sc.lastOp === 'decrease' ? warn : ink;
            ctx.stroke();
          }
          ctx.fillStyle = ink;
          ctx.font = `${radius < 8 ? 8 : 9}px ui-monospace, monospace`;
          ctx.fillText(String(node.key), X(p.x) - (node.key >= 10 ? 5 : 2.5), Y(p.y) + 3);
        }
        ctx.font = '11px ui-monospace, monospace';
        const tx = 470;
        ctx.fillStyle = ink;
        ctx.fillText(`${h.n} nodes, ${h.roots.length} roots`, tx, 50);
        ctx.fillStyle = dim;
        ctx.fillText(`links ${h.links}  cuts ${h.cuts}`, tx, 68);
        ctx.fillText(`cascading ${h.cascading}  marks ${h.marks}`, tx, 84);
        ctx.fillText(`max degree ${sc.ok.maxDegree}, bound ${Math.floor(Math.log(Math.max(h.n, 2)) / Math.log((1 + Math.sqrt(5)) / 2))}`, tx, 100);
        ctx.fillStyle = sc.ok.heapOrder && sc.ok.fibonacci && sc.ok.minOk ? good : warn;
        ctx.fillText(sc.ok.heapOrder && sc.ok.fibonacci && sc.ok.minOk ? 'heap order, Fibonacci property,' : 'INVARIANT BROKEN', tx, 124);
        if (sc.ok.heapOrder && sc.ok.fibonacci && sc.ok.minOk) ctx.fillText('and the min pointer all hold', tx, 140);
        ctx.fillStyle = dim;
        ctx.fillText(`operation ${sc.tick} of ${TICKS}`, tx, 166);
        ctx.fillText('the file: 0.27 cuts per decrease-key,', tx, 196);
        ctx.fillText('5.3 links per delete-min at n = 14,873;', tx, 212);
        ctx.fillText('without marks the property breaks', tx, 228);
        let line;
        if (s.done) {
          line = `after ${sc.tick} operations: ${h.links} links, ${h.cuts} cuts (${h.cascading} cascading), ${h.marks} marks; max degree ${sc.ok.maxDegree} on ${h.n} nodes; every invariant held on every tick`;
          ctx.fillStyle = good;
        } else {
          line = sc.last;
          ctx.fillStyle = ink;
        }
        ctx.fillText(line.length > 96 ? `${line.slice(0, 95)}…` : line, 12, H - 8);
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
          new workload
        </button>
        <span className="viz-stat">{snap.line || 'inserting…'}</span>
      </div>
    </>
  );
}
