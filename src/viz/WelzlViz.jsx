import { useEffect, useRef, useState } from 'react';
import { useCanvasLoop, isStill, holdTicks, mulberry32 } from './useCanvasLoop.js';

// Two acts of one circle. Act one: fifty-six shuffled points arrive
// one by one; the running circle (blue) absorbs almost all of them
// silently, and only a rare outsider (red flash) forces a rebuild
// that pins it on the new boundary (amber basis). Act two: the
// betrayal: the SAME code fed an arc of points in sorted angular
// order: every single arrival lands outside, every step rebuilds,
// and the work counter runs quadratic. The answer is still right;
// the bill is not. The shuffle IS the algorithm.
const W = 640;
const H = 300;
const SEED = 20260827;
const PT_TICKS = 5;
const END_HOLD = 70;

function dist(a, b) {
  return Math.hypot(a[0] - b[0], a[1] - b[1]);
}

function circle2(a, b) {
  return { x: (a[0] + b[0]) / 2, y: (a[1] + b[1]) / 2, r: dist(a, b) / 2 };
}

function circum(a, b, c) {
  const d = 2 * (a[0] * (b[1] - c[1]) + b[0] * (c[1] - a[1]) + c[0] * (a[1] - b[1]));
  if (Math.abs(d) < 1e-12) return null;
  const a2 = a[0] * a[0] + a[1] * a[1];
  const b2 = b[0] * b[0] + b[1] * b[1];
  const c2 = c[0] * c[0] + c[1] * c[1];
  const ux = (a2 * (b[1] - c[1]) + b2 * (c[1] - a[1]) + c2 * (a[1] - b[1])) / d;
  const uy = (a2 * (c[0] - b[0]) + b2 * (a[0] - c[0]) + c2 * (b[0] - a[0])) / d;
  return { x: ux, y: uy, r: Math.hypot(ux - a[0], uy - a[1]) };
}

function inC(c, p) {
  return Math.hypot(c.x - p[0], c.y - p[1]) <= c.r + 1e-7;
}

// Incremental Welzl with a per-arrival event log: the viz's script.
export function runWelzl(pts) {
  let c = null;
  let basis = [];
  let tests = 0;
  let rebuilds = 0;
  const events = [];
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i];
    tests += 1;
    if (c !== null && inC(c, p)) {
      events.push({ out: false, c, basis, tests, rebuilds });
      continue;
    }
    rebuilds += 1;
    c = { x: p[0], y: p[1], r: 0 };
    basis = [p];
    for (let j = 0; j < i; j++) {
      tests += 1;
      if (inC(c, pts[j])) continue;
      c = circle2(p, pts[j]);
      basis = [p, pts[j]];
      for (let k = 0; k < j; k++) {
        tests += 1;
        if (inC(c, pts[k])) continue;
        const cc = circum(p, pts[j], pts[k]);
        if (cc) {
          c = cc;
          basis = [p, pts[j], pts[k]];
        }
      }
    }
    events.push({ out: true, c, basis, tests, rebuilds });
  }
  return { events, c, basis, tests, rebuilds };
}

export function makeScene(seed) {
  const rand = mulberry32(seed);
  const raw = [];
  for (let i = 0; i < 56; i++) {
    const gx = rand() + rand() + rand() - 1.5;
    const gy = rand() + rand() + rand() - 1.5;
    raw.push([320 + gx * 112, 152 + gy * 62]);
  }
  // Similarity-map the blob so its enclosing circle lands on a fixed
  // frame: r 128 at (320, 158). A similarity preserves which point
  // pins the circle, so the animated run is the real one, and no
  // gaussian tail cycle ever pushes the circle offscreen.
  const pre = runWelzl(raw).c;
  const f = 128 / pre.r;
  const mapped = raw.map(([x, y]) => [320 + (x - pre.x) * f, 158 + (y - pre.y) * f]);
  // Five real shuffles of the same set; animate the median-cost one.
  // A single n = 56 run can be a freak (one unlucky late rebuild
  // triples the bill); the median shuffle is the typical behavior
  // the expectation theorem is about.
  const candidates = [];
  for (let c = 0; c < 5; c++) {
    const order = mapped.slice();
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
    candidates.push(order);
  }
  candidates.sort((a, b) => runWelzl(a).tests - runWelzl(b).tests);
  const blob = candidates[2];
  // A 160-degree circular arc in sorted angular order: every
  // prefix's circle is the chord-diameter circle, so the next arc
  // point always lands outside it.
  const arc = [];
  for (let t = 0; t < 44; t++) {
    const th = ((-80 + (160 * t) / 43) * Math.PI) / 180;
    arc.push([320 + 96 * Math.cos(th), 158 + 96 * Math.sin(th)]);
  }
  const acts = [
    {
      pts: blob,
      run: runWelzl(blob),
      note: 'act 1 · fifty-six shuffled arrivals: rebuilds die out',
      betray: false,
    },
    {
      pts: arc,
      run: runWelzl(arc),
      note: 'act 2 · the same code, an arc fed in sorted angular order',
      betray: true,
    },
  ];
  return { acts };
}

export default function WelzlViz() {
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
        const act = s.scene.acts[s.act];
        s.tick += 1;
        if (s.tick >= act.pts.length * PT_TICKS + END_HOLD) {
          // Hold the finished act for the full rest before the next
          // act begins: every burst of motion earns its two minutes.
          s.tick = act.pts.length * PT_TICKS + END_HOLD;
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

        const done = s.act >= 2;
        const actIdx = done ? 1 : s.act;
        const act = s.scene.acts[actIdx];
        const n = act.pts.length;
        const tick = done ? n * PT_TICKS + END_HOLD : s.tick;
        const idx = Math.min(Math.floor(tick / PT_TICKS), n - 1);
        const finished = done || tick >= n * PT_TICKS;
        const ev = act.run.events[idx];

        // Points that have arrived.
        for (let i = 0; i <= idx; i++) {
          const p = act.pts[i];
          ctx.fillStyle = dim;
          ctx.beginPath();
          ctx.arc(p[0], p[1], 2.2, 0, Math.PI * 2);
          ctx.fill();
        }

        // The running circle.
        const c = ev.c;
        if (c && c.r > 0.5) {
          ctx.strokeStyle = finished ? good : algo;
          ctx.lineWidth = finished ? 2.4 : 2;
          ctx.beginPath();
          ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2);
          ctx.stroke();
        }

        // The basis that pins it.
        ev.basis.forEach((b) => {
          ctx.strokeStyle = heur;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(b[0], b[1], 5.5, 0, Math.PI * 2);
          ctx.stroke();
        });

        // The arriving point: red flash when it forced a rebuild.
        if (!finished) {
          const p = act.pts[idx];
          ctx.strokeStyle = ev.out ? warn : ink;
          ctx.lineWidth = ev.out ? 2.4 : 1.4;
          ctx.beginPath();
          ctx.arc(p[0], p[1], ev.out ? 8 : 4.5, 0, Math.PI * 2);
          ctx.stroke();
        }

        ctx.fillStyle = dim;
        ctx.font = '11px ui-monospace, monospace';
        ctx.fillText(act.note, 14, 20);

        let line;
        if (!finished) {
          line = `point ${idx + 1}/${n} · tests ${ev.tests.toLocaleString()} · rebuilds ${ev.rebuilds}${ev.out ? ' · OUTSIDE: rebuild' : ''}`;
          ctx.fillStyle = ev.out ? warn : ink;
        } else if (act.betray) {
          const r1 = s.scene.acts[0].run;
          line = `${n} sorted arrivals · ${act.run.rebuilds} rebuilds · ${act.run.tests.toLocaleString()} tests vs act one's ${r1.tests.toLocaleString()}: the shuffle IS the algorithm`;
          ctx.fillStyle = warn;
        } else {
          line = `${n} points enclosed · ${act.run.rebuilds} rebuilds · ${act.run.tests.toLocaleString()} tests: late arrivals almost never rebuild`;
          ctx.fillStyle = good;
        }
        ctx.font = '12px ui-monospace, monospace';
        ctx.fillText(line, 14, H - 12);

        statsRef.current = {
          line: done
            ? 'right answer both times: the sorted feed just paid quadratic for it'
            : line,
        };
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
          new points
        </button>
        <span className="viz-stat">
          {snap.line || 'shuffling the arrivals…'}
        </span>
      </div>
    </>
  );
}
