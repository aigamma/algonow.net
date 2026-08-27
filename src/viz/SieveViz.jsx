import { useEffect, useRef, useState } from 'react';
import { useCanvasLoop, isStill, holdTicks, mulberry32 } from './useCanvasLoop.js';

// One continuous hall of 120 doors. Each surviving prime takes its
// walk in turn: the walker chip slides along the row, every slam
// dims a door: and each walk visibly BEGINS at the prime's square,
// gliding past the already-dark doors below it. When 11's square
// overshoots the hall, the walking ends and every open door lights
// green at once: primality was never tested: it is what remained.
const W = 640;
const H = 300;
const SEED = 20260827;
const N = 120;
const COLS = 20;
const SLAM_TICKS = 5;
const WALK_GAP = 24;
const END_HOLD = 70;

function makeScene() {
  // Precompute the walks: for each prime p with p*p <= N, the list
  // of doors slammed (from p^2 by p).
  const alive = Array(N + 1).fill(true);
  alive[0] = alive[1] = false;
  const walks = [];
  for (let p = 2; p * p <= N; p++) {
    if (!alive[p]) continue;
    const doors = [];
    for (let m = p * p; m <= N; m += p) {
      doors.push(m);
      alive[m] = false;
    }
    walks.push({ p, doors });
  }
  return { walks, alive };
}

export default function SieveViz() {
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
      init: () => {
        const scene = makeScene();
        const total =
          scene.walks.reduce((a, w) => a + w.doors.length * SLAM_TICKS + WALK_GAP, 0) +
          END_HOLD;
        return {
          scene,
          total,
          seedBump: mulberry32(SEED + cycle.current)(),
          tick: 0,
          rest: 0,
          stopAtRest: isStill(),
        };
      },
      tick: (s) => {
        if (s.tick >= s.total) {
          if (s.stopAtRest) return false;
          s.rest += 1;
          if (s.rest > holdTicks(s)) {
            s.tick = 0;
            s.rest = 0;
            cycle.current += 1;
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
        const warn = css.getPropertyValue('--warn').trim() || '#e2606c';
        const dim = css.getPropertyValue('--ink-dim').trim() || '#9aa5bd';

        // Figure out where we are: which walk, which slam.
        let t = s.tick;
        let walkIdx = 0;
        let slammedInWalk = 0;
        const walks = s.scene.walks;
        while (walkIdx < walks.length) {
          const wt = walks[walkIdx].doors.length * SLAM_TICKS + WALK_GAP;
          if (t < wt) {
            slammedInWalk = Math.min(
              Math.floor(t / SLAM_TICKS),
              walks[walkIdx].doors.length,
            );
            break;
          }
          t -= wt;
          walkIdx += 1;
        }
        const finished = walkIdx >= walks.length;

        // Collect slammed doors so far.
        const dark = new Set([0, 1]);
        for (let wi = 0; wi < (finished ? walks.length : walkIdx); wi++) {
          walks[wi].doors.forEach((d) => dark.add(d));
        }
        if (!finished) {
          walks[walkIdx].doors.slice(0, slammedInWalk).forEach((d) => dark.add(d));
        }

        const DX = (v) => 24 + ((v - 1) % COLS) * 30;
        const DY = (v) => 46 + Math.floor((v - 1) / COLS) * 34;

        for (let v = 2; v <= N; v++) {
          const isDark = dark.has(v);
          const isPrime = s.scene.alive[v];
          ctx.fillStyle = isDark ? '#1a2138' : finished && isPrime ? 'rgba(98,217,138,0.25)' : '#243052';
          ctx.fillRect(DX(v), DY(v), 26, 26);
          ctx.strokeStyle = finished && isPrime ? good : '#2a3450';
          ctx.lineWidth = finished && isPrime ? 1.8 : 1;
          ctx.strokeRect(DX(v), DY(v), 26, 26);
          ctx.fillStyle = isDark ? '#3a4560' : finished && isPrime ? good : dim;
          ctx.font = '9px ui-monospace, monospace';
          ctx.fillText(String(v), DX(v) + 4, DY(v) + 17);
        }

        // The walker chip.
        if (!finished && walks[walkIdx]) {
          const wlk = walks[walkIdx];
          const at = slammedInWalk < wlk.doors.length ? wlk.doors[slammedInWalk] : wlk.doors[wlk.doors.length - 1];
          ctx.strokeStyle = heur;
          ctx.lineWidth = 2.4;
          ctx.strokeRect(DX(at) - 2, DY(at) - 2, 30, 30);
          // The square marker.
          const sq = wlk.p * wlk.p;
          ctx.strokeStyle = warn;
          ctx.setLineDash([4, 3]);
          ctx.strokeRect(DX(sq) - 4, DY(sq) - 4, 34, 34);
          ctx.setLineDash([]);
        }

        ctx.fillStyle = dim;
        ctx.font = '11px ui-monospace, monospace';
        ctx.fillText('each walker starts at his SQUARE: everything below it already fell to a smaller prime', 14, 20);

        let line;
        if (!finished && walks[walkIdx]) {
          const wlk = walks[walkIdx];
          line = `walker ${wlk.p}: first fresh door ${wlk.p * wlk.p} (dashed) · slamming every ${wlk.p}th`;
          ctx.fillStyle = heur;
        } else {
          const count = s.scene.alive.filter(Boolean).length;
          line = `11² = 121 > 120: the walking is over · ${count} doors stay open forever: the primes`;
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
          replay
        </button>
        <span className="viz-stat">
          {snap.line || 'the hall opens…'}
        </span>
      </div>
    </>
  );
}
