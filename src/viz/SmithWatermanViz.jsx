import { useEffect, useRef, useState } from 'react';
import { useCanvasLoop, isStill, holdTicks, mulberry32 } from './useCanvasLoop.js';

// The ridge in the sea. A 26x26 alignment matrix fills row by row as a
// heatmap: two sequences sharing a planted 9-char island produce a
// bright diagonal ridge rising from a sea of zero-floored cells. The
// peak flashes, the traceback walks back down the ridge to its first
// zero, and the recovered island prints beneath. A second pass shows
// the global corner score for the same pair: negative, drowned.
const W = 640;
const H = 300;
const SEED = 20260827;
const N = 26;
const MATCH = 2;
const MISMATCH = -3;
const GAP = -4;
const ROW_TICKS = 7;
const TRACE_TICKS = 5;
const END_HOLD = 90;

function makeScene(seed) {
  const rand = mulberry32(seed);
  const sig = 'acgt';
  const rs = (n) => Array.from({ length: n }, () => sig[Math.floor(rand() * 4)]).join('');
  const island = rs(9);
  const offA = 3 + Math.floor(rand() * 6);
  const offB = 10 + Math.floor(rand() * 6);
  const A = rs(offA) + island + rs(N - offA - 9);
  const B = rs(offB) + island + rs(N - offB - 9);
  // Fill H with floor; record traceback.
  const Hm = Array.from({ length: N + 1 }, () => new Array(N + 1).fill(0));
  let best = 0;
  let bi = 0;
  let bj = 0;
  for (let i = 1; i <= N; i++) {
    for (let j = 1; j <= N; j++) {
      const s = A[i - 1] === B[j - 1] ? MATCH : MISMATCH;
      const v = Math.max(0, Hm[i - 1][j - 1] + s, Hm[i - 1][j] + GAP, Hm[i][j - 1] + GAP);
      Hm[i][j] = v;
      if (v > best) {
        best = v;
        bi = i;
        bj = j;
      }
    }
  }
  const path = [];
  let i = bi;
  let j = bj;
  while (i > 0 && j > 0 && Hm[i][j] > 0) {
    path.push([i, j]);
    const s = A[i - 1] === B[j - 1] ? MATCH : MISMATCH;
    if (Hm[i][j] === Hm[i - 1][j - 1] + s) {
      i -= 1;
      j -= 1;
    } else if (Hm[i][j] === Hm[i - 1][j] + GAP) i -= 1;
    else j -= 1;
  }
  // Global corner score (quick NW).
  const G = Array.from({ length: N + 1 }, (_, r) => {
    const row = new Array(N + 1).fill(0);
    row[0] = r * GAP;
    return row;
  });
  for (let jj = 0; jj <= N; jj++) G[0][jj] = jj * GAP;
  for (let r = 1; r <= N; r++) {
    for (let c = 1; c <= N; c++) {
      const s = A[r - 1] === B[c - 1] ? MATCH : MISMATCH;
      G[r][c] = Math.max(G[r - 1][c - 1] + s, G[r - 1][c] + GAP, G[r][c - 1] + GAP);
    }
  }
  const recovered = A.slice(i, bi);
  return { A, B, Hm, best, bi, bj, path, global: G[N][N], island, recovered };
}

export default function SmithWatermanViz() {
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
        const total = N * ROW_TICKS + s.scene.path.length * TRACE_TICKS + END_HOLD;
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
        const heur = css.getPropertyValue('--heur').trim() || '#f0b94b';
        const good = css.getPropertyValue('--path').trim() || '#62d98a';
        const warn = css.getPropertyValue('--warn').trim() || '#e2606c';
        const dim = css.getPropertyValue('--ink-dim').trim() || '#9aa5bd';
        const ink = css.getPropertyValue('--ink').trim() || '#e9edf6';
        const sc = s.scene;

        const fillRows = Math.min(Math.floor(s.tick / ROW_TICKS), N);
        const tracing = s.tick >= N * ROW_TICKS;
        const traced = tracing
          ? Math.min(Math.floor((s.tick - N * ROW_TICKS) / TRACE_TICKS), sc.path.length)
          : 0;
        const doneTrace = traced >= sc.path.length;

        const cs = 8.6;
        const x0 = 40;
        const y0 = 34;
        const maxv = Math.max(sc.best, 1);
        for (let i = 1; i <= fillRows; i++) {
          for (let j = 1; j <= N; j++) {
            const v = sc.Hm[i][j];
            const heat = v / maxv;
            ctx.fillStyle = v === 0 ? 'rgba(93,162,255,0.05)' : `rgba(98,217,138,${0.1 + heat * 0.8})`;
            ctx.fillRect(x0 + (j - 1) * cs, y0 + (i - 1) * cs, cs - 1, cs - 1);
          }
        }
        // Traceback overlay.
        for (let p = 0; p < traced; p++) {
          const [i, j] = sc.path[p];
          ctx.fillStyle = heur;
          ctx.fillRect(x0 + (j - 1) * cs, y0 + (i - 1) * cs, cs - 1, cs - 1);
        }
        if (fillRows >= N) {
          ctx.strokeStyle = good;
          ctx.lineWidth = 2;
          ctx.strokeRect(x0 + (sc.bj - 1) * cs - 2, y0 + (sc.bi - 1) * cs - 2, cs + 3, cs + 3);
        }

        // Side panel.
        const px = 300;
        ctx.fillStyle = dim;
        ctx.font = '11px ui-monospace, monospace';
        ctx.fillText('H[i][j] = max(0, diag+s, gaps)', px, 52);
        ctx.fillStyle = ink;
        ctx.font = '12px ui-monospace, monospace';
        if (fillRows >= N) {
          ctx.fillStyle = good;
          ctx.fillText(`local peak: ${sc.best}`, px, 84);
          ctx.fillStyle = warn;
          ctx.fillText(`global corner: ${sc.global}`, px, 108);
          ctx.fillStyle = dim;
          ctx.font = '11px ui-monospace, monospace';
          ctx.fillText('same grid, same letters:', px, 132);
          ctx.fillText('two different questions', px, 148);
        }
        if (doneTrace) {
          ctx.fillStyle = heur;
          ctx.font = '12px ui-monospace, monospace';
          ctx.fillText(`traceback: "${sc.recovered.slice(0, 14)}${sc.recovered.length > 14 ? '…' : ''}"`, px, 184);
          ctx.fillStyle = good;
          ctx.fillText(`planted:   "${sc.island}"`, px, 208);
          ctx.fillStyle = dim;
          ctx.font = '11px ui-monospace, monospace';
          ctx.fillText('the ridge is the island', px, 232);
        }

        ctx.fillStyle = dim;
        ctx.font = '11px ui-monospace, monospace';
        ctx.fillText('the sea is the zero floor: debts forgiven · the ridge rises where the island sits', 14, 20);
        let line;
        if (!tracing) {
          line = `filling row ${Math.min(fillRows + 1, N)}/${N} · sea = 0, ridge = score`;
          ctx.fillStyle = ink;
        } else if (!doneTrace) {
          line = `traceback: ${traced}/${sc.path.length} moves down the ridge`;
          ctx.fillStyle = heur;
        } else {
          line = `local ${sc.best} vs global ${sc.global}: the floor found what forced ends drowned`;
          ctx.fillStyle = good;
        }
        ctx.font = '12px ui-monospace, monospace';
        ctx.fillText(line, 14, H - 12);

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
          new sequences
        </button>
        <span className="viz-stat">
          {snap.line || 'flooding the sea…'}
        </span>
      </div>
    </>
  );
}
