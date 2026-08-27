import { useEffect, useRef, useState } from 'react';
import { useCanvasLoop, isStill, holdTicks, mulberry32 } from './useCanvasLoop.js';

// The merger frenzy, run for real on a dumbbell: two dense clusters
// of five, two bridge edges between them. Each beat contracts one
// uniformly random edge: the fused nodes slide together into a
// growing blob, internal edges dim as they become self-loops, and
// the two red bridges usually survive to the end: the run's cut is
// whatever crosses between the last two blobs. Runs replay one
// after another with a scoreboard: hits (cut = 2) vs misses: the
// lottery, watched cashing at its measured rate.
const W = 640;
const H = 300;
const SEED = 20260827;
const K = 5;
const NV = 2 * K;
const STEP_TICKS = 14;
const RUN_GAP = 40;
const RUNS_SHOWN = 6;

function buildDumbbell() {
  const edges = [];
  for (let a = 0; a < K; a++) {
    for (let b = a + 1; b < K; b++) {
      edges.push([a, b]);
      edges.push([K + a, K + b]);
    }
  }
  edges.push([0, K]);
  edges.push([1, K + 1]);
  return edges;
}

function runOnce(rand, edges) {
  const parent = [...Array(NV).keys()];
  const find = (x) => {
    while (parent[x] !== x) {
      parent[x] = parent[parent[x]];
      x = parent[x];
    }
    return x;
  };
  const alive = edges.slice();
  let supern = NV;
  const events = [];
  while (supern > 2) {
    const i = Math.floor(rand() * alive.length);
    const [u, v] = alive[i];
    alive[i] = alive[alive.length - 1];
    alive.pop();
    const ru = find(u);
    const rv = find(v);
    if (ru === rv) continue;
    parent[ru] = rv;
    supern -= 1;
    events.push({ u, v, groups: [...Array(NV).keys()].map((x) => find(x)) });
  }
  const cut = edges.filter(([u, v]) => find(u) !== find(v));
  return { events, cut: cut.length, cutEdges: cut };
}

function makeScene(seed) {
  const rand = mulberry32(seed);
  const edges = buildDumbbell();
  const runs = [];
  for (let r = 0; r < RUNS_SHOWN; r++) runs.push(runOnce(rand, edges));
  return { edges, runs };
}

const BASE_POS = [];
for (let i = 0; i < K; i++) {
  const a = (i / K) * Math.PI * 2;
  BASE_POS.push([150 + 70 * Math.cos(a), 140 + 70 * Math.sin(a)]);
}
for (let i = 0; i < K; i++) {
  const a = (i / K) * Math.PI * 2;
  BASE_POS.push([490 + 70 * Math.cos(a), 140 + 70 * Math.sin(a)]);
}

export default function KargerViz() {
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
        scene: makeScene(SEED + cycle.current * 7577),
        tick: 0,
        rest: 0,
        stopAtRest: isStill(),
      }),
      tick: (s) => {
        const perRun = (NV - 2) * STEP_TICKS + RUN_GAP;
        const total = RUNS_SHOWN * perRun + 40;
        if (s.tick >= total) {
          if (s.stopAtRest) return false;
          s.rest += 1;
          if (s.rest > holdTicks(s)) {
            cycle.current += 1;
            Object.assign(s, {
              scene: makeScene(SEED + cycle.current * 7577),
              tick: 0,
              rest: 0,
            });
          }
          return true;
        }
        s.tick += 1;
        // Each contraction run wipes the graph and re-merges, so each
        // finished run holds its final frame for the full rest before
        // the next lottery ticket is drawn.
        const boundary = s.tick % perRun === 0 && s.tick < RUNS_SHOWN * perRun;
        if (boundary) {
          s.actRest = (s.actRest || 0) + 1;
          if (s.actRest <= holdTicks(s)) {
            s.tick -= 1;
          } else {
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

        const sc = s.scene;
        const perRun = (NV - 2) * STEP_TICKS + RUN_GAP;
        const runIdx = Math.min(Math.floor(s.tick / perRun), RUNS_SHOWN - 1);
        const inRun = s.tick - runIdx * perRun;
        const run = sc.runs[runIdx];
        const merges = Math.min(Math.floor(inRun / STEP_TICKS), run.events.length);
        const runDone = merges >= run.events.length;

        // Group assignment after `merges` events.
        const groups =
          merges > 0 ? run.events[merges - 1].groups : [...Array(NV).keys()];
        // Position: nodes drift toward their group's centroid.
        const gpos = {};
        const counts = {};
        groups.forEach((g, i) => {
          if (!gpos[g]) {
            gpos[g] = [0, 0];
            counts[g] = 0;
          }
          gpos[g][0] += BASE_POS[i][0];
          gpos[g][1] += BASE_POS[i][1];
          counts[g] += 1;
        });
        Object.keys(gpos).forEach((g) => {
          gpos[g][0] /= counts[g];
          gpos[g][1] /= counts[g];
        });
        const drift = 0.72;
        const pos = groups.map((g, i) => [
          BASE_POS[i][0] * (1 - drift) + gpos[g][0] * drift,
          BASE_POS[i][1] * (1 - drift) + gpos[g][1] * drift,
        ]);

        // Edges.
        sc.edges.forEach(([u, v]) => {
          const sameGroup = groups[u] === groups[v];
          const isBridge = (u === 0 && v === K) || (u === 1 && v === K + 1);
          ctx.strokeStyle = sameGroup
            ? '#232c44'
            : isBridge
              ? warn
              : heur;
          ctx.lineWidth = sameGroup ? 0.8 : isBridge ? 2.4 : 1.3;
          ctx.beginPath();
          ctx.moveTo(pos[u][0], pos[u][1]);
          ctx.lineTo(pos[v][0], pos[v][1]);
          ctx.stroke();
        });
        // Nodes.
        pos.forEach(([x, y], i) => {
          ctx.beginPath();
          ctx.arc(x, y, 9, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(93,162,255,0.3)';
          ctx.fill();
          ctx.strokeStyle = algo;
          ctx.stroke();
        });

        // Scoreboard across completed runs.
        let hits = 0;
        for (let r = 0; r < runIdx + (runDone ? 1 : 0); r++) {
          if (sc.runs[r].cut === 2) hits += 1;
        }
        ctx.fillStyle = dim;
        ctx.font = '11px ui-monospace, monospace';
        ctx.fillText(
          `run ${runIdx + 1}/${RUNS_SHOWN} · scoreboard: ${hits} found the min cut`,
          14,
          20,
        );
        for (let r = 0; r < RUNS_SHOWN; r++) {
          const done = r < runIdx || (r === runIdx && runDone);
          ctx.beginPath();
          ctx.arc(480 + r * 24, 16, 7, 0, Math.PI * 2);
          if (done) {
            ctx.fillStyle = sc.runs[r].cut === 2 ? good : warn;
            ctx.fill();
          } else {
            ctx.strokeStyle = '#40507a';
            ctx.stroke();
          }
        }

        let line;
        if (!runDone) {
          line = `merge ${merges}/${NV - 2}: a random edge fuses two blobs · bridges in red, still standing`;
          ctx.fillStyle = heur;
        } else {
          const ok = run.cut === 2;
          line = ok
            ? `two blobs remain: cut = 2: the bridges survived: a winning ticket`
            : `two blobs remain: cut = ${run.cut}: a bridge got fused: this ticket loses (most do)`;
          ctx.fillStyle = ok ? good : warn;
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
          new frenzy
        </button>
        <span className="viz-stat">
          {snap.line || 'the mergers begin…'}
        </span>
      </div>
    </>
  );
}
