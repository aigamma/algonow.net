import { useEffect, useRef, useState } from 'react';
import { useCanvasLoop } from './useCanvasLoop.js';

// The live comparison. Both panels consume the SAME stream of random unions;
// the left forest applies union by rank plus path compression, the right one
// links naively. Cells are colored by component and dimmed by their depth in
// the forest, so the right panel visibly darkens as its trees grow legs while
// the left stays flat. The counters underneath are the honest currency:
// parent-array touches, the same units the tested Python solution reports.
const COLS = 22;
const ROWS = 14;
const CELL = 15;
const GAP = 26;
const N = COLS * ROWS;
const PANEL_W = COLS * CELL;
const W = PANEL_W * 2 + GAP;
const H = ROWS * CELL + 30;
const SEED = 20260723;

function mulberry(seed) {
  let a = seed >>> 0;
  return () => {
    a += 0x6d2b79f5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeForest(useRank) {
  const parent = new Int32Array(N);
  for (let i = 0; i < N; i++) parent[i] = i;
  return {
    parent,
    rank: useRank ? new Int32Array(N) : null,
    work: 0,
    components: N,
    useRank,
    find(x) {
      let root = x;
      for (;;) {
        this.work += 1;
        const p = this.parent[root];
        if (p === root) break;
        root = p;
      }
      if (this.useRank) {
        // Path compression is half the pairing; the naive panel skips it.
        while (x !== root) {
          const next = this.parent[x];
          this.parent[x] = root;
          this.work += 2;
          x = next;
        }
      }
      return root;
    },
    union(a, b) {
      let ra = this.find(a);
      let rb = this.find(b);
      if (ra === rb) return;
      if (this.useRank) {
        if (this.rank[ra] < this.rank[rb]) [ra, rb] = [rb, ra];
        this.parent[rb] = ra;
        if (this.rank[ra] === this.rank[rb]) this.rank[ra] += 1;
      } else {
        this.parent[ra] = rb;
      }
      this.work += 1;
      this.components -= 1;
    },
  };
}

// Display-only helpers: walk without touching the counters, so drawing the
// forest never changes the numbers the panel is reporting.
function quietRoot(parent, x) {
  let depth = 0;
  while (parent[x] !== x) {
    x = parent[x];
    depth += 1;
  }
  return [x, depth];
}

function drawPanel(ctx, forest, x0, label, accent) {
  const css = getComputedStyle(document.documentElement);
  const dim = css.getPropertyValue('--ink-dim').trim() || '#9aa5bd';
  const roots = new Int32Array(N);
  const depths = new Int32Array(N);
  const minOfRoot = new Map();
  for (let v = 0; v < N; v++) {
    const [r, d] = quietRoot(forest.parent, v);
    roots[v] = r;
    depths[v] = d;
    const m = minOfRoot.get(r);
    if (m === undefined || v < m) minOfRoot.set(r, v);
  }
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const v = r * COLS + c;
      const hue = (minOfRoot.get(roots[v]) * 137.5) % 360;
      const light = Math.max(26, 58 - depths[v] * 7);
      ctx.fillStyle = `hsl(${hue}, 52%, ${light}%)`;
      ctx.fillRect(x0 + c * CELL + 1, 22 + r * CELL + 1, CELL - 2, CELL - 2);
    }
  }
  ctx.fillStyle = dim;
  ctx.font = '11px ui-monospace, monospace';
  ctx.fillText(label, x0, 14);
  ctx.fillStyle = accent;
  ctx.fillText(`touches ${forest.work.toLocaleString()}`, x0, H - 4);
}

export default function UnionFindViz() {
  const canvasRef = useRef(null);
  const cycle = useRef(0);
  const statsRef = useRef({ flat: 0, naive: 0 });
  const [restart, setRestart] = useState(0);
  const [snap, setSnap] = useState({ flat: 0, naive: 0 });

  // The counters update on their own cadence rather than every animation
  // tick, so React re-renders a few times a second instead of twenty.
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
        rand: mulberry(SEED + cycle.current * 7919),
        flat: makeForest(true),
        naive: makeForest(false),
        rest: 0,
      }),
      tick: (s) => {
        if (s.flat.components <= 1) {
          s.rest += 1;
          if (s.rest > 60) {
            cycle.current += 1;
            s.rand = mulberry(SEED + cycle.current * 7919);
            s.flat = makeForest(true);
            s.naive = makeForest(false);
            s.rest = 0;
          }
          return true;
        }
        const a = Math.floor(s.rand() * N);
        const b = Math.floor(s.rand() * N);
        if (a !== b) {
          s.flat.union(a, b);
          s.naive.union(a, b);
          // A query pair, same for both panels: this is where compression
          // pulls ahead, because answering questions flattens the forest.
          const qa = Math.floor(s.rand() * N);
          const qb = Math.floor(s.rand() * N);
          s.flat.find(qa); s.flat.find(qb);
          s.naive.find(qa); s.naive.find(qb);
        }
        statsRef.current = { flat: s.flat.work, naive: s.naive.work };
        return true;
      },
      draw: (ctx, s) => {
        const css = getComputedStyle(document.documentElement);
        const algo = css.getPropertyValue('--algo').trim() || '#5da2ff';
        const dim = css.getPropertyValue('--ink-dim').trim() || '#9aa5bd';
        ctx.clearRect(0, 0, W, H);
        drawPanel(ctx, s.flat, 0, 'rank + compression (depth shown as darkness)', algo);
        drawPanel(ctx, s.naive, PANEL_W + GAP, 'naive linking', dim);
      },
    },
    [restart],
  );

  const ratio = snap.flat > 0 ? (snap.naive / snap.flat).toFixed(1) : null;

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
          new sequence
        </button>
        <span className="viz-stat">
          {ratio
            ? <>same unions, same queries · the naive forest is doing <strong>{ratio}×</strong> the touches</>
            : 'merging components…'}
        </span>
      </div>
    </>
  );
}
