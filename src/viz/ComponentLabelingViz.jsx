import DiagramViewport from '../components/DiagramViewport.jsx';
import { useEffect, useRef, useState } from 'react';
import { useCanvasLoop, isStill, holdTicks, mulberry32 } from './useCanvasLoop.js';

// Two-pass connected component labeling with union-find on a seeded 48 x 16
// binary image under 4- or 8-connectivity. Pass one scans in reading order,
// a few pixels per tick, handing out provisional labels and firing a union
// (amber flash) where two labels meet; pass two rewrites every pixel to its
// root's final number. Invariant after every pass-one tick: the union-find's
// classes over the scanned prefix equal that prefix's true components by an
// independent flood fill; at the end the labeling equals the flood fill's
// partition, visits are two per pixel, and unions equal labels minus
// components.
const W = 640;
const H = 300;
const COLS = 48;
const ROWS = 16;
const CELL = 12;
const GX = 32;
const GY = 28;
const N = COLS * ROWS;
const SEED = 20261010;
const PASS1_PER_TICK = 6;
const PASS2_PER_TICK = 12;

const inside = (x, y) => x >= 0 && x < COLS && y >= 0 && y < ROWS;

function scannedNeighbors(x, y, conn) {
  const out = [[x - 1, y], [x, y - 1]];
  if (conn === 8) out.push([x - 1, y - 1], [x + 1, y - 1]);
  return out;
}

function allNeighbors(x, y, conn) {
  const out = [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]];
  if (conn === 8) out.push([x - 1, y - 1], [x + 1, y - 1], [x - 1, y + 1], [x + 1, y + 1]);
  return out;
}

// Independent referee: an iterative flood fill restricted to the pixels with
// raster index below `limit` (the scanned prefix). Returns a component id
// per pixel (0 = none) and the count.
export function floodFill(img, conn, limit) {
  const comp = new Int32Array(N);
  let count = 0;
  for (let i = 0; i < limit; i += 1) {
    if (!img[i] || comp[i]) continue;
    count += 1;
    comp[i] = count;
    const stack = [i];
    while (stack.length) {
      const p = stack.pop();
      const px = p % COLS;
      const py = Math.floor(p / COLS);
      for (const [nx, ny] of allNeighbors(px, py, conn)) {
        if (!inside(nx, ny)) continue;
        const q = ny * COLS + nx;
        if (q < limit && img[q] && !comp[q]) {
          comp[q] = count;
          stack.push(q);
        }
      }
    }
  }
  return { comp, count };
}

// Both labelings number components by their first pixel in reading order,
// so two class-id arrays describe the same partition exactly when equal.
export function sameArray(a, b, n) {
  for (let i = 0; i < n; i += 1) if (a[i] !== b[i]) return false;
  return true;
}

function makeImage(rand) {
  const img = new Uint8Array(N);
  const paintDisk = (cx, cy, r) => {
    for (let y = cy - r; y <= cy + r; y += 1) {
      for (let x = cx - r; x <= cx + r; x += 1) {
        if (inside(x, y) && (x - cx) * (x - cx) + (y - cy) * (y - cy) <= r * r) img[y * COLS + x] = 1;
      }
    }
  };
  const disks = 8 + Math.floor(rand() * 4);
  for (let k = 0; k < disks; k += 1) {
    paintDisk(Math.floor(rand() * COLS), Math.floor(rand() * ROWS), 1 + Math.floor(rand() * 2));
  }
  for (let k = 0; k < 2; k += 1) {
    const uw = 5 + Math.floor(rand() * 5);
    const uh = 4 + Math.floor(rand() * 4);
    const x0 = Math.floor(rand() * (COLS - uw));
    const y0 = Math.floor(rand() * (ROWS - uh));
    for (let y = y0; y < y0 + uh; y += 1) {
      img[y * COLS + x0] = 1;
      img[y * COLS + x0 + uw - 1] = 1;
    }
    for (let x = x0; x < x0 + uw; x += 1) img[(y0 + uh - 1) * COLS + x] = 1;
  }
  for (let k = 0; k < 8; k += 1) img[Math.floor(rand() * N)] = 1;
  return img;
}

function find(sc, x0) {
  sc.finds += 1;
  let root = x0;
  while (sc.parent[root] !== root) {
    root = sc.parent[root];
    sc.links += 1;
  }
  let x = x0;
  while (sc.parent[x] !== root) {
    const next = sc.parent[x];
    sc.parent[x] = root;
    x = next;
  }
  return root;
}

function union(sc, a, b) {
  const ra = find(sc, a);
  const rb = find(sc, b);
  if (ra === rb) return false;
  sc.unions += 1;
  let hi = ra;
  let lo = rb;
  if (sc.rank[ra] < sc.rank[rb]) {
    hi = rb;
    lo = ra;
  }
  sc.parent[lo] = hi;
  if (sc.rank[hi] === sc.rank[lo]) sc.rank[hi] += 1;
  return true;
}

// Pure root walk for the invariant check: no counting, no compression, so
// the displayed find statistics stay those of the algorithm itself.
function rootOf(sc, x) {
  let r = x;
  while (sc.parent[r] !== r) r = sc.parent[r];
  return r;
}

export function makeScene(seed) {
  const rand = mulberry32(seed);
  const conn = rand() < 0.5 ? 4 : 8;
  const img = makeImage(rand);
  const ref = floodFill(img, conn, N);
  let fg = 0;
  for (let i = 0; i < N; i += 1) fg += img[i];
  return {
    conn,
    img,
    fg,
    ref,
    labels: new Int32Array(N),
    final: new Int32Array(N),
    finalOf: new Map(),
    parent: [0],
    rank: [0],
    i: 0,
    j: 0,
    phase: 1,
    visits: 0,
    provisional: 0,
    unions: 0,
    finds: 0,
    links: 0,
    classes: 0,
    prefixComponents: 0,
    flash: [],
    components: 0,
    done: false,
    ok: true,
    last: `${conn}-connectivity; ${fg} foreground of ${N}; referee: ${ref.count} components`,
  };
}

export function sceneTick(sc) {
  if (sc.done) return true;
  sc.flash = sc.flash.filter((f) => {
    f.age += 1;
    return f.age < 6;
  });
  if (sc.phase === 1) {
    for (let k = 0; k < PASS1_PER_TICK && sc.i < N; k += 1, sc.i += 1) {
      const p = sc.i;
      sc.visits += 1;
      if (!sc.img[p]) continue;
      const x = p % COLS;
      const y = Math.floor(p / COLS);
      const seen = [];
      for (const [nx, ny] of scannedNeighbors(x, y, sc.conn)) {
        if (inside(nx, ny) && sc.labels[ny * COLS + nx]) seen.push(sc.labels[ny * COLS + nx]);
      }
      if (seen.length === 0) {
        sc.parent.push(sc.parent.length);
        sc.rank.push(0);
        sc.provisional += 1;
        sc.labels[p] = sc.parent.length - 1;
      } else {
        const best = Math.min(...seen);
        for (const other of seen) {
          if (other !== best && union(sc, best, other)) sc.flash.push({ p, age: 0 });
        }
        sc.labels[p] = best;
      }
    }
    // invariant: the classes over the scanned prefix equal its true components
    const classId = new Int32Array(N);
    const roots = new Map();
    for (let q = 0; q < sc.i; q += 1) {
      if (sc.labels[q]) {
        const r = rootOf(sc, sc.labels[q]);
        if (!roots.has(r)) roots.set(r, roots.size + 1);
        classId[q] = roots.get(r);
      }
    }
    const prefix = floodFill(sc.img, sc.conn, sc.i);
    const match = sameArray(classId, prefix.comp, sc.i) && roots.size === prefix.count;
    sc.ok = sc.ok && match;
    sc.classes = roots.size;
    sc.prefixComponents = prefix.count;
    sc.last = `pass one: pixel ${sc.i} of ${N}; ${sc.provisional} labels, ${sc.unions} unions, ${sc.finds} finds; ${roots.size} classes = ${prefix.count} prefix components: ${match ? 'yes' : 'NO'}`;
    if (sc.i >= N) sc.phase = 2;
    return false;
  }
  for (let k = 0; k < PASS2_PER_TICK && sc.j < N; k += 1, sc.j += 1) {
    const p = sc.j;
    sc.visits += 1;
    if (!sc.labels[p]) continue;
    const root = find(sc, sc.labels[p]);
    if (!sc.finalOf.has(root)) sc.finalOf.set(root, sc.finalOf.size + 1);
    sc.final[p] = sc.finalOf.get(root);
  }
  sc.components = sc.finalOf.size;
  const perFind = (sc.links / Math.max(1, sc.finds)).toFixed(3);
  sc.last = `pass two: pixel ${sc.j} of ${N}; ${sc.components} components so far; ${sc.finds} finds at ${perFind} links each`;
  if (sc.j >= N) {
    const match =
      sameArray(sc.final, sc.ref.comp, N) &&
      sc.components === sc.ref.count &&
      sc.visits === 2 * N &&
      sc.unions === sc.provisional - sc.components;
    sc.ok = sc.ok && match;
    sc.done = true;
    sc.last = `done: ${sc.components} components (flood fill ${sc.ref.count}); ${sc.visits} visits = 2 x ${N}; ${sc.provisional} labels, ${sc.unions} unions, ${sc.finds} finds at ${perFind} links; equals the flood fill: ${match ? 'yes' : 'NO'}`;
    return true;
  }
  return false;
}

const labelColor = (lab) => `hsl(${(lab * 47) % 360}, 55%, 62%)`;
const finalColor = (c) => `hsl(${(c * 67 + 20) % 360}, 70%, 56%)`;

export default function ComponentLabelingViz() {
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
        const header = sc.phase === 1 && !s.done
          ? `pass one, ${sc.conn}-connectivity: a scanned neighbor's label or a new one; amber = union`
          : `pass two, ${sc.conn}-connectivity: each label rewritten to its root's component`;
        ctx.fillText(header, 12, 18);
        for (let p = 0; p < N; p += 1) {
          const x = GX + (p % COLS) * CELL;
          const y = GY + Math.floor(p / COLS) * CELL;
          if (!sc.img[p]) {
            ctx.fillStyle = `${dim}14`;
            ctx.fillRect(x, y, CELL - 1, CELL - 1);
            continue;
          }
          if (sc.phase === 2 && p < sc.j) {
            ctx.fillStyle = finalColor(sc.final[p]);
          } else if (p < sc.i) {
            ctx.fillStyle = labelColor(sc.labels[p]);
            if (sc.phase === 2) ctx.globalAlpha = 0.45;
          } else {
            ctx.fillStyle = `${dim}77`;
          }
          ctx.fillRect(x, y, CELL - 1, CELL - 1);
          ctx.globalAlpha = 1;
        }
        for (const f of sc.flash) {
          ctx.strokeStyle = heur;
          ctx.lineWidth = 2;
          ctx.strokeRect(GX + (f.p % COLS) * CELL - 1, GY + Math.floor(f.p / COLS) * CELL - 1, CELL + 1, CELL + 1);
        }
        if (!s.done) {
          const cur = sc.phase === 1 ? Math.min(sc.i, N - 1) : Math.min(sc.j, N - 1);
          ctx.strokeStyle = algo;
          ctx.lineWidth = 2;
          ctx.strokeRect(GX + (cur % COLS) * CELL - 1, GY + Math.floor(cur / COLS) * CELL - 1, CELL + 1, CELL + 1);
        }
        ctx.fillStyle = dim;
        const perFind = (sc.links / Math.max(1, sc.finds)).toFixed(3);
        ctx.fillText(`visits ${sc.visits} of ${2 * N}; labels ${sc.provisional}; unions ${sc.unions}; finds ${sc.finds} at ${perFind} links each`, 12, 236);
        ctx.fillStyle = ink;
        const compLine = sc.phase === 1 && !s.done
          ? `${sc.fg} foreground; classes ${sc.classes} = prefix components ${sc.prefixComponents}; referee ${sc.ref.count} in all`
          : `${sc.fg} foreground; components written ${sc.components}; referee ${sc.ref.count}`;
        ctx.fillText(compLine, 12, 252);
        ctx.fillStyle = sc.ok ? good : warn;
        ctx.fillText(sc.ok ? 'invariant: union-find classes = true components of the scanned prefix (flood fill)' : 'INVARIANT BROKEN', 12, 268);
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
          new image
        </button>
        <span className="viz-stat">{snap.line || 'scanning…'}</span>
      </div>
    </>
  );
}
