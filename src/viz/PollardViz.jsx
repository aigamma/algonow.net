import { useEffect, useRef, useState } from 'react';
import { useCanvasLoop, isStill, holdTicks, mulberry32 } from './useCanvasLoop.js';

// The shadow world, drawn for real. A small semiprime n = p*q: the
// left panel shows the walk's values mod p laid out on a ring of p
// positions (the world the algorithm cannot see), the right panel
// the values mod n as an opaque scatter. The tortoise and hare run
// the identical x -> x^2 + c walk: in the shadow ring their tracks
// bend into the rho and collide: the flash: while the visible
// scatter still looks patternless: and the gcd banner reads the
// hidden factor off the collision.
const W = 640;
const H = 300;
const SEED = 20260827;
const STEP_TICKS = 16;
const END_HOLD = 70;

const SMALL_PRIMES = [31, 37, 41, 43, 47];
const BIG_PRIMES = [997, 1009, 1013, 1019];

function makeScene(seed) {
  const rand = mulberry32(seed);
  const p = SMALL_PRIMES[Math.floor(rand() * SMALL_PRIMES.length)];
  const q = BIG_PRIMES[Math.floor(rand() * BIG_PRIMES.length)];
  const n = p * q;
  const c = 1 + Math.floor(rand() * (n - 2));
  const f = (x) => (x * x + c) % n;
  // Run Floyd until gcd hit; record per-step states.
  const gcd = (a, b) => (b ? gcd(b, a % b) : a);
  let t = 2;
  let h = 2;
  const frames = [];
  let factor = null;
  for (let step = 0; step < 400; step++) {
    t = f(t);
    h = f(f(h));
    const g = gcd(Math.abs(t - h) || n, n);
    frames.push({ t, h, g: g > 1 && g < n ? g : null });
    if (g > 1 && g < n) {
      factor = g;
      break;
    }
    if (g === n) break;
  }
  if (factor === null) return null; // retry seed
  return { p, q, n, c, frames, factor };
}

function makeSceneRetry(seed) {
  for (let b = 0; b < 60; b++) {
    const sc = makeScene(seed + b * 613);
    if (sc && sc.frames.length >= 6 && sc.frames.length <= 60) return sc;
  }
  return makeScene(seed) || makeScene(seed + 1);
}

export default function PollardViz() {
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
        scene: makeSceneRetry(SEED + cycle.current * 3467),
        tick: 0,
        rest: 0,
        stopAtRest: isStill(),
      }),
      tick: (s) => {
        const total = s.scene.frames.length * STEP_TICKS + END_HOLD;
        if (s.tick >= total) {
          if (s.stopAtRest) return false;
          s.rest += 1;
          if (s.rest > holdTicks(s)) {
            cycle.current += 1;
            Object.assign(s, {
              scene: makeSceneRetry(SEED + cycle.current * 3467),
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
        const warn = css.getPropertyValue('--warn').trim() || '#e2606c';
        const dim = css.getPropertyValue('--ink-dim').trim() || '#9aa5bd';

        const sc = s.scene;
        const shown = Math.min(Math.floor(s.tick / STEP_TICKS) + 1, sc.frames.length);
        const finished = shown >= sc.frames.length && s.tick >= sc.frames.length * STEP_TICKS;
        const cur = sc.frames[shown - 1];

        // Left: the shadow ring mod p.
        const cx = 160;
        const cy = 150;
        const R = 92;
        const ringXY = (v) => {
          const a = (v / sc.p) * Math.PI * 2 - Math.PI / 2;
          return [cx + R * Math.cos(a), cy + R * Math.sin(a)];
        };
        ctx.strokeStyle = '#2a3450';
        ctx.beginPath();
        ctx.arc(cx, cy, R, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = dim;
        ctx.font = '11px ui-monospace, monospace';
        ctx.fillText(`the shadow world: mod p = ${sc.p} (${sc.p} places to stand)`, 30, 26);

        // Trails mod p.
        for (let i = 0; i < shown; i++) {
          const fr = sc.frames[i];
          const [tx, ty] = ringXY(fr.t % sc.p);
          const [hx, hy] = ringXY(fr.h % sc.p);
          ctx.fillStyle = i === shown - 1 ? heur : 'rgba(240,185,75,0.35)';
          ctx.beginPath();
          ctx.arc(tx, ty, i === shown - 1 ? 6 : 3, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = i === shown - 1 ? good : 'rgba(98,217,138,0.35)';
          ctx.beginPath();
          ctx.arc(hx, hy, i === shown - 1 ? 6 : 3, 0, Math.PI * 2);
          ctx.fill();
        }
        if (cur && cur.t % sc.p === cur.h % sc.p) {
          const [mx, my] = ringXY(cur.t % sc.p);
          ctx.strokeStyle = warn;
          ctx.lineWidth = 2.4;
          ctx.beginPath();
          ctx.arc(mx, my, 12, 0, Math.PI * 2);
          ctx.stroke();
        }

        // Right: the visible world mod n (scatter by value).
        ctx.fillStyle = dim;
        ctx.fillText(`the visible world: mod n = ${sc.n.toLocaleString()}`, 360, 26);
        const visXY = (v) => [
          352 + (v % 97) * 2.7,
          44 + Math.floor((v / sc.n) * 200),
        ];
        for (let i = 0; i < shown; i++) {
          const fr = sc.frames[i];
          const [tx, ty] = visXY(fr.t);
          const [hx, hy] = visXY(fr.h);
          ctx.fillStyle = 'rgba(240,185,75,0.5)';
          ctx.fillRect(tx, ty, 4, 4);
          ctx.fillStyle = 'rgba(98,217,138,0.5)';
          ctx.fillRect(hx, hy, 4, 4);
        }

        let line;
        if (!finished) {
          const collided = cur && cur.t % sc.p === cur.h % sc.p;
          line = collided
            ? `step ${shown}: collision in the shadow: |t−h| shares ${sc.p} with n`
            : `step ${shown}: tortoise ${cur.t} · hare ${cur.h} · gcd so far: 1`;
          ctx.fillStyle = collided ? warn : dim;
        } else {
          line = `gcd(|t−h|, ${sc.n.toLocaleString()}) = ${sc.factor}: the hidden factor, read off a collision the visible world never showed`;
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
          new walk
        </button>
        <span className="viz-stat">
          {snap.line || 'the fog rolls in…'}
        </span>
      </div>
    </>
  );
}
