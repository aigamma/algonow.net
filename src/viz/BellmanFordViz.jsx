import { useEffect, useRef, useState } from 'react';
import { useCanvasLoop, isStill, holdTicks, mulberry32 } from './useCanvasLoop.js';

// The telephone chain, watched. Twelve villages on a ring road with
// shortcut edges, several of them negative (dashed red). Act one: rounds
// sweep every edge; each improvement pulses green and updates the label;
// a quiet round triggers the early exit long before the n−1 guarantee.
// Act two: three planted edges form a negative loop; the rounds never go
// quiet, round n proves it, and the cycle glows red with its sum.
const W = 640;
const H = 300;
const SEED = 20260827;
const N = 12;
const TICKS_PER_IMP = 5;
const ROUND_PAUSE = 10;
const BANNER_HOLD = 50;

function simulate(nodes, edges, maxRounds) {
  const dist = new Array(nodes).fill(Infinity);
  dist[0] = 0;
  const rounds = [];
  for (let r = 0; r < maxRounds; r++) {
    const imps = [];
    for (let ei = 0; ei < edges.length; ei++) {
      const [u, v, w] = edges[ei];
      if (dist[u] + w < dist[v]) {
        dist[v] = dist[u] + w;
        imps.push({ ei, v, newd: dist[v] });
      }
    }
    rounds.push(imps);
    if (imps.length === 0) break;
  }
  return { rounds, dist };
}

function makeScene(seed) {
  const rand = mulberry32(seed);
  const coords = Array.from({ length: N }, (_, i) => {
    const a = (i / N) * Math.PI * 2 - Math.PI / 2;
    return [320 + 258 * Math.cos(a), 138 + 96 * Math.sin(a)];
  });
  const phi = Array.from({ length: N }, () => Math.floor(rand() * 40) - 20);
  const edges = [];
  const seen = new Set();
  const add = (u, v, extra) => {
    if (u === v || seen.has(u * 100 + v)) return;
    seen.add(u * 100 + v);
    edges.push([u, v, phi[v] - phi[u] + (extra !== undefined ? extra : Math.floor(rand() * 10))]);
  };
  for (let i = 0; i < N - 1; i++) add(i, i + 1);
  for (let t = 0; t < 11; t++) add(Math.floor(rand() * N), Math.floor(rand() * N));
  const act1 = { edges, ...simulate(N, edges, N), planted: null };
  const cyc = [3, 7, 10];
  const edges2 = edges.concat([
    [3, 7, phi[7] - phi[3] - 15],
    [7, 10, phi[10] - phi[7] - 15],
    [10, 3, phi[3] - phi[10] - 15],
  ]);
  const act2 = { edges: edges2, ...simulate(N, edges2, N), planted: cyc, sum: -45 };
  return { coords, acts: [act1, act2] };
}

function actSchedule(act) {
  // Flat tick schedule: rounds of improvements, then the banner.
  let t = 0;
  const marks = [];
  act.rounds.forEach((imps, r) => {
    const len = Math.max(imps.length, 1) * TICKS_PER_IMP + ROUND_PAUSE;
    marks.push({ start: t, len, r, imps });
    t += len;
  });
  return { marks, total: t + BANNER_HOLD };
}

export default function BellmanFordViz() {
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
        s.tick += 1;
        const sched = actSchedule(s.scene.acts[s.act]);
        if (s.tick >= sched.total) {
          // Hold the finished act for the full rest before the next
          // act begins: every burst of motion earns its two minutes.
          s.tick = sched.total;
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
        const sched = actSchedule(act);
        const tick = done ? sched.total : s.tick;
        const { coords } = s.scene;

        // Replay improvements up to the current tick to get live labels.
        const dist = new Array(N).fill(Infinity);
        dist[0] = 0;
        let curRound = 0;
        let flashing = -1;
        let banner = tick >= sched.total - BANNER_HOLD || done;
        for (const mark of sched.marks) {
          if (tick >= mark.start + mark.len) {
            mark.imps.forEach((im) => {
              dist[im.v] = im.newd;
            });
            curRound = mark.r + 1;
          } else if (tick >= mark.start) {
            curRound = mark.r + 1;
            const step = Math.floor((tick - mark.start) / TICKS_PER_IMP);
            mark.imps.slice(0, step + 1).forEach((im, idx) => {
              dist[im.v] = im.newd;
              if (idx === step) flashing = im.ei;
            });
            break;
          }
        }

        const inCycle = (u, v) =>
          act.planted &&
          act.planted.some(
            (x, i) => x === u && act.planted[(i + 1) % act.planted.length] === v,
          );

        act.edges.forEach(([u, v, w], ei) => {
          const [x1, y1] = coords[u];
          const [x2, y2] = coords[v];
          const isFlash = ei === flashing;
          const cyc = inCycle(u, v);
          const neg = w < 0;
          ctx.strokeStyle = isFlash ? good : cyc && banner ? warn : neg ? `${warn}88` : '#2a3450';
          ctx.lineWidth = isFlash ? 2.4 : cyc && banner ? 2.6 : 1.1;
          ctx.setLineDash(neg && !cyc ? [4, 3] : []);
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.stroke();
          ctx.setLineDash([]);
          const mx = x1 + (x2 - x1) * 0.62;
          const my = y1 + (y2 - y1) * 0.62;
          const ang = Math.atan2(y2 - y1, x2 - x1);
          ctx.fillStyle = isFlash ? good : cyc && banner ? warn : neg ? `${warn}aa` : '#3a4664';
          ctx.beginPath();
          ctx.moveTo(mx, my);
          ctx.lineTo(mx - 7 * Math.cos(ang - 0.4), my - 7 * Math.sin(ang - 0.4));
          ctx.lineTo(mx - 7 * Math.cos(ang + 0.4), my - 7 * Math.sin(ang + 0.4));
          ctx.fill();
          if (neg || isFlash) {
            ctx.fillStyle = neg ? warn : good;
            ctx.font = '9px ui-monospace, monospace';
            ctx.fillText(String(w), mx + 4, my - 4);
          }
        });

        coords.forEach(([x, y], i) => {
          ctx.fillStyle = i === 0 ? heur : `${algo}`;
          ctx.beginPath();
          ctx.arc(x, y, i === 0 ? 9 : 7, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = ink;
          ctx.font = '10px ui-monospace, monospace';
          ctx.textAlign = 'center';
          ctx.fillText(dist[i] === Infinity ? '∞' : String(dist[i]), x, y - 12);
          ctx.textAlign = 'start';
        });

        ctx.fillStyle = dim;
        ctx.font = '11px ui-monospace, monospace';
        ctx.fillText(
          actIdx === 0
            ? 'act 1 · sweep all edges each round; a quiet round is the answer'
            : 'act 2 · three planted edges form a negative loop (red, dashed)',
          14,
          22,
        );
        let line;
        if (banner) {
          if (actIdx === 0) {
            ctx.fillStyle = good;
            line = `round ${act.rounds.length} was quiet: fixpoint, stop (the guarantee allowed ${N - 1})`;
          } else {
            ctx.fillStyle = warn;
            line = `round ${N} still improving: negative cycle certified, sum ${act.sum}`;
          }
        } else {
          ctx.fillStyle = ink;
          line = `round ${curRound} · source dist 0 · ∞ = unreached`;
        }
        ctx.font = '12px ui-monospace, monospace';
        ctx.fillText(line, 14, 44);
        ctx.fillStyle = dim;
        ctx.font = '10px ui-monospace, monospace';
        ctx.fillText('amber source · dashed red = negative edge · green pulse = an improvement', 14, H - 10);

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
          new village
        </button>
        <span className="viz-stat">
          {snap.line || 'stringing the telephone lines…'}
        </span>
      </div>
    </>
  );
}
