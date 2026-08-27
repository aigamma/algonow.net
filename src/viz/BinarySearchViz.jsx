import { useEffect, useRef, useState } from 'react';
import { useCanvasLoop, isStill, holdTicks, mulberry32 } from './useCanvasLoop.js';

// Two probe policies, one referee. Both panels search the SAME sorted array
// for the SAME targets, one lookup after another. The top panel probes
// midpoints: its bracket (blue band) halves per probe, and its probe count
// is glued near log2(n) whatever the target. The bottom panel probes where
// the value proportionally SHOULD be: on these uniform keys it lands almost
// on top of the answer in a few probes. Amber flash = probe; green = found.
const N = 128;
const BAR = 4.5;
const MARGIN = 12;
const LABEL_H = 16;
const STRIP_H = 66;
const GAP = 20;
const W = MARGIN * 2 + N * BAR + 4;
const H = 8 + (LABEL_H + STRIP_H) * 2 + GAP + 14;
const SEED = 20260827;
const TICKS_PER_PROBE = 7;

function makeScene(seed) {
  const rand = mulberry32(seed);
  const keys = [];
  let v = 20 + Math.floor(rand() * 30);
  for (let i = 0; i < N; i++) {
    keys.push(v);
    v += 1 + Math.floor(rand() * 14);
  }
  const targets = Array.from({ length: 12 }, () => keys[Math.floor(rand() * N)]);
  // Record probe logs per policy per lookup.
  const runs = { mid: [], itp: [] };
  for (const t of targets) {
    let lo = 0;
    let hi = N;
    const probes = [];
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      probes.push({ i: mid, lo, hi });
      if (keys[mid] < t) lo = mid + 1;
      else hi = mid;
    }
    runs.mid.push({ t, probes, found: lo });
    lo = 0;
    hi = N;
    const probes2 = [];
    while (lo < hi) {
      const span = hi - 1 > lo ? keys[hi - 1] - keys[lo] : 0;
      let mid;
      if (span <= 0 || t <= keys[lo]) mid = lo;
      else if (t > keys[hi - 1]) {
        lo = hi;
        break;
      } else {
        mid = lo + Math.floor(((t - keys[lo]) * (hi - 1 - lo)) / span);
        mid = Math.max(lo, Math.min(mid, hi - 1));
      }
      probes2.push({ i: mid, lo, hi });
      if (keys[mid] < t) lo = mid + 1;
      else hi = mid;
    }
    runs.itp.push({ t, probes: probes2, found: lo });
  }
  return { keys, targets, runs };
}

function drawStrip(ctx, scene, kind, y0, upto, colors, label) {
  const { algo, heur, path, dim } = colors;
  const runIdx = Math.min(Math.floor(upto / 1000), scene.targets.length - 1);
  const run = scene.runs[kind][runIdx];
  const probeIdx = Math.min(upto % 1000, run.probes.length);
  const total =
    scene.runs[kind].slice(0, runIdx).reduce((a, r) => a + r.probes.length, 0) +
    probeIdx;
  ctx.fillStyle = dim;
  ctx.font = '11px ui-monospace, monospace';
  ctx.fillText(
    `${label} · lookup ${runIdx + 1}/${scene.targets.length} · probes so far ${total}`,
    MARGIN,
    y0 + 11,
  );
  const top = y0 + LABEL_H;
  const cur = run.probes[Math.min(probeIdx, run.probes.length - 1)];
  const done = probeIdx >= run.probes.length;
  if (cur && !done) {
    ctx.fillStyle = `${algo}1f`;
    ctx.fillRect(MARGIN + cur.lo * BAR, top, Math.max((cur.hi - cur.lo) * BAR, 2), STRIP_H);
  }
  const maxKey = scene.keys[N - 1];
  for (let i = 0; i < N; i++) {
    const h = 6 + (scene.keys[i] / maxKey) * (STRIP_H - 10);
    ctx.fillStyle = 'rgba(255,255,255,0.28)';
    ctx.fillRect(MARGIN + i * BAR, top + STRIP_H - h, BAR - 1, h);
  }
  for (let p = 0; p < probeIdx; p++) {
    const i = run.probes[p].i;
    const h = 6 + (scene.keys[i] / maxKey) * (STRIP_H - 10);
    ctx.fillStyle = p === probeIdx - 1 && !done ? heur : `${heur}88`;
    ctx.fillRect(MARGIN + i * BAR, top + STRIP_H - h, BAR - 1, h);
  }
  if (done) {
    const i = Math.min(run.found, N - 1);
    const h = 6 + (scene.keys[i] / maxKey) * (STRIP_H - 10);
    ctx.fillStyle = path;
    ctx.fillRect(MARGIN + i * BAR, top + STRIP_H - h, BAR - 1, h);
  }
}

export default function BinarySearchViz() {
  const canvasRef = useRef(null);
  const cycle = useRef(0);
  const statsRef = useRef({ mid: 0, itp: 0 });
  const [restart, setRestart] = useState(0);
  const [snap, setSnap] = useState({ mid: 0, itp: 0 });

  useEffect(() => {
    const id = setInterval(() => setSnap({ ...statsRef.current }), 400);
    return () => clearInterval(id);
  }, []);

  useCanvasLoop(
    canvasRef,
    {
      width: W,
      height: H,
      stepMs: 40,
      init: () => ({
        scene: makeScene(SEED + cycle.current * 7919),
        tick: 0,
        cursor: { mid: 0, itp: 0 },
        rest: 0,
        stopAtRest: isStill(),
      }),
      tick: (s) => {
        const advance = (kind) => {
          const c = s.cursor[kind];
          const runIdx = Math.floor(c / 1000);
          if (runIdx >= s.scene.targets.length) return c;
          const run = s.scene.runs[kind][runIdx];
          const probeIdx = c % 1000;
          if (probeIdx < run.probes.length) return c + 1;
          return (runIdx + 1) * 1000;
        };
        const doneAll = (kind) => Math.floor(s.cursor[kind] / 1000) >= s.scene.targets.length;
        if (doneAll('mid') && doneAll('itp')) {
          if (s.stopAtRest) return false;
          s.rest += 1;
          if (s.rest > holdTicks(s)) {
            cycle.current += 1;
            s.scene = makeScene(SEED + cycle.current * 7919);
            s.tick = 0;
            s.cursor = { mid: 0, itp: 0 };
            s.rest = 0;
          }
          return true;
        }
        s.tick += 1;
        if (s.tick % TICKS_PER_PROBE === 0) {
          if (!doneAll('mid')) s.cursor.mid = advance('mid');
          if (!doneAll('itp')) s.cursor.itp = advance('itp');
          const count = (kind) =>
            s.scene.runs[kind]
              .slice(0, Math.min(Math.floor(s.cursor[kind] / 1000) + 1, s.scene.targets.length))
              .reduce(
                (a, r, i) =>
                  a +
                  (i < Math.floor(s.cursor[kind] / 1000)
                    ? r.probes.length
                    : Math.min(s.cursor[kind] % 1000, r.probes.length)),
                0,
              );
          statsRef.current = { mid: count('mid'), itp: count('itp') };
        }
        return true;
      },
      draw: (ctx, s) => {
        ctx.clearRect(0, 0, W, H);
        const css = getComputedStyle(document.documentElement);
        const colors = {
          algo: css.getPropertyValue('--algo').trim() || '#5da2ff',
          heur: css.getPropertyValue('--heur').trim() || '#f0b94b',
          path: css.getPropertyValue('--path').trim() || '#62d98a',
          dim: css.getPropertyValue('--ink-dim').trim() || '#9aa5bd',
        };
        const cap = (kind, y, label) => {
          const c = s.cursor[kind];
          drawStrip(ctx, s.scene, kind, y, c, colors, label);
        };
        cap('mid', 8, 'midpoint probes · the bracket halves');
        cap('itp', 8 + LABEL_H + STRIP_H + GAP, 'value-estimate probes · jumps almost straight there');
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
          new array
        </button>
        <span className="viz-stat">
          same array, same targets · midpoint <strong>{snap.mid}</strong> probes vs estimate <strong>{snap.itp}</strong> · skew would reverse this
        </span>
      </div>
    </>
  );
}
