import { useEffect, useRef, useState } from 'react';
import { useCanvasLoop, isStill, holdTicks, mulberry32 } from './useCanvasLoop.js';

// The job fair's tide, watched. Nine workers, nine jobs. Each phase: a
// BFS wave sweeps the layers (amber rings ripple outward from the free
// workers), then the harvested batch of vertex-disjoint shortest
// augmenting paths draws in amber and flips green together. When no
// wave reaches a free job, the final search's reachable set becomes the
// König cover: red rings whose count equals the matching: certified on
// canvas. The instance is seeded-searched for at least two phases with
// a real batch.
const W = 640;
const H = 300;
const SEED = 20260827;
const NL = 9;
const NR = 9;
const LX = 170;
const RX = 470;
const TICKS_LAYER = 7;
const TICKS_PATH = 12;
const PHASE_HOLD = 24;
const COVER_HOLD = 70;

function runHK(adj) {
  const matchL = new Array(NL).fill(-1);
  const matchR = new Array(NR).fill(-1);
  const phases = [];
  for (let guard = 0; guard < 50; guard++) {
    const dist = new Array(NL).fill(Infinity);
    const layers = [[]];
    const q = [];
    for (let u = 0; u < NL; u++) {
      if (matchL[u] === -1) {
        dist[u] = 0;
        q.push(u);
        layers[0].push(u);
      }
    }
    let found = false;
    let qi = 0;
    const layerR = new Map();
    while (qi < q.length) {
      const u = q[qi++];
      for (const v of adj[u]) {
        if (!layerR.has(v)) layerR.set(v, dist[u]);
        const w = matchR[v];
        if (w === -1) found = true;
        else if (dist[w] === Infinity) {
          dist[w] = dist[u] + 1;
          (layers[dist[w]] = layers[dist[w]] || []).push(w);
          q.push(w);
        }
      }
    }
    if (!found) {
      // König: Z = reachable set of the failed search.
      const zl = new Set(layers.flat());
      const zr = new Set(layerR.keys());
      const coverL = [];
      for (let u = 0; u < NL; u++) if (!zl.has(u)) coverL.push(u);
      const coverR = [...zr];
      return { phases, matchL, matchR, coverL, coverR };
    }
    const paths = [];
    const dfs = (u) => {
      for (const v of adj[u]) {
        const w = matchR[v];
        if (w === -1) {
          matchL[u] = v;
          matchR[v] = u;
          return [u, v];
        }
        if (dist[w] === dist[u] + 1) {
          dist[w] = Infinity;
          const deeper = dfs(w);
          if (deeper) {
            matchL[u] = v;
            matchR[v] = u;
            return [u, v, ...deeper];
          }
        }
      }
      dist[u] = Infinity;
      return null;
    };
    for (let u = 0; u < NL; u++) {
      if (matchL[u] === -1) {
        const p = dfs(u);
        if (p) paths.push(p);
      }
    }
    phases.push({
      layers: layers.map((l) => l.slice()),
      paths,
      snapshot: matchL.slice(),
    });
  }
  return { phases, matchL, matchR, coverL: [], coverR: [] };
}

function makeScene(seed) {
  for (let attempt = 0; attempt < 120; attempt++) {
    const rand = mulberry32(seed + attempt * 131);
    const adj = Array.from({ length: NL }, () => []);
    for (let u = 0; u < NL; u++) {
      for (let v = 0; v < NR; v++) {
        if (rand() < 0.24) adj[u].push(v);
      }
      if (adj[u].length === 0) adj[u].push(Math.floor(rand() * NR));
    }
    const run = runHK(adj);
    const batchy = run.phases.some((p) => p.paths.length >= 2);
    if (run.phases.length >= 2 && batchy) return { adj, ...run };
  }
  const rand = mulberry32(seed);
  const adj = Array.from({ length: NL }, (_, u) => [u % NR, (u + 1) % NR]);
  return { adj, ...runHK(adj) };
}

const yOf = (i, n) => 44 + (i * (H - 96)) / Math.max(n - 1, 1);

export default function HopcroftKarpViz() {
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
        const total =
          s.scene.phases.reduce(
            (t, p) => t + p.layers.length * TICKS_LAYER + p.paths.length * TICKS_PATH + PHASE_HOLD,
            0,
          ) + COVER_HOLD;
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
        const algo = css.getPropertyValue('--algo').trim() || '#5da2ff';
        const heur = css.getPropertyValue('--heur').trim() || '#f0b94b';
        const good = css.getPropertyValue('--path').trim() || '#62d98a';
        const warn = css.getPropertyValue('--warn').trim() || '#e2606c';
        const dim = css.getPropertyValue('--ink-dim').trim() || '#9aa5bd';
        const ink = css.getPropertyValue('--ink').trim() || '#e9edf6';
        const sc = s.scene;

        // Locate the animation position.
        let t = s.tick;
        let phaseIdx = 0;
        let stage = 'cover';
        let stageT = 0;
        for (; phaseIdx < sc.phases.length; phaseIdx++) {
          const p = sc.phases[phaseIdx];
          const span = p.layers.length * TICKS_LAYER + p.paths.length * TICKS_PATH + PHASE_HOLD;
          if (t < span) {
            if (t < p.layers.length * TICKS_LAYER) {
              stage = 'bfs';
              stageT = t;
            } else if (t < p.layers.length * TICKS_LAYER + p.paths.length * TICKS_PATH) {
              stage = 'paths';
              stageT = t - p.layers.length * TICKS_LAYER;
            } else {
              stage = 'hold';
              stageT = 0;
            }
            break;
          }
          t -= span;
        }
        const inCover = phaseIdx >= sc.phases.length;

        // Matching state to display: snapshot after previous phases,
        // plus flipped paths already drawn within this phase.
        const matchNow = new Array(NL).fill(-1);
        const prior = phaseIdx > 0 ? sc.phases[phaseIdx - 1].snapshot : null;
        if (inCover) {
          sc.matchL.forEach((v, u) => (matchNow[u] = v));
        } else if (prior) {
          prior.forEach((v, u) => (matchNow[u] = v));
        }
        let pathsDrawn = 0;
        if (!inCover && stage === 'paths') pathsDrawn = Math.floor(stageT / TICKS_PATH) + 1;
        if (!inCover && stage === 'hold') pathsDrawn = sc.phases[phaseIdx].paths.length;
        if (!inCover) {
          for (let i = 0; i < pathsDrawn; i++) {
            const p = sc.phases[phaseIdx].paths[i];
            if (!p) continue;
            for (let j = 0; j + 1 < p.length; j += 2) matchNow[p[j]] = p[j + 1];
          }
        }

        // Edges.
        sc.adj.forEach((vs, u) => {
          vs.forEach((v) => {
            const matched = matchNow[u] === v;
            ctx.strokeStyle = matched ? good : '#2a3450';
            ctx.lineWidth = matched ? 2.4 : 1;
            ctx.beginPath();
            ctx.moveTo(LX + 9, yOf(u, NL));
            ctx.lineTo(RX - 9, yOf(v, NR));
            ctx.stroke();
          });
        });

        // Active path being drawn.
        if (!inCover && stage === 'paths') {
          const cur = sc.phases[phaseIdx].paths[Math.min(pathsDrawn - 1, sc.phases[phaseIdx].paths.length - 1)];
          if (cur) {
            ctx.strokeStyle = heur;
            ctx.lineWidth = 2.6;
            for (let j = 0; j + 1 < cur.length; j += 1) {
              const isLR = j % 2 === 0;
              const a = isLR ? [LX + 9, yOf(cur[j], NL)] : [RX - 9, yOf(cur[j], NR)];
              const b = isLR ? [RX - 9, yOf(cur[j + 1], NR)] : [LX + 9, yOf(cur[j + 1], NL)];
              ctx.beginPath();
              ctx.moveTo(a[0], a[1]);
              ctx.lineTo(b[0], b[1]);
              ctx.stroke();
            }
          }
        }

        // Nodes with BFS layer pulses and cover rings.
        const layersNow =
          !inCover && stage === 'bfs'
            ? Math.floor(stageT / TICKS_LAYER) + 1
            : 0;
        const coverLSet = new Set(sc.coverL);
        const coverRSet = new Set(sc.coverR);
        for (let u = 0; u < NL; u++) {
          const free = matchNow[u] === -1;
          ctx.fillStyle = free ? `${heur}33` : `${algo}33`;
          ctx.strokeStyle = free ? heur : algo;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(LX, yOf(u, NL), 9, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          if (!inCover && stage === 'bfs') {
            const p = sc.phases[phaseIdx];
            for (let li = 0; li < Math.min(layersNow, p.layers.length); li++) {
              if (p.layers[li].includes(u)) {
                ctx.strokeStyle = `${heur}aa`;
                ctx.beginPath();
                ctx.arc(LX, yOf(u, NL), 13 + li, 0, Math.PI * 2);
                ctx.stroke();
              }
            }
          }
          if (inCover && coverLSet.has(u)) {
            ctx.strokeStyle = warn;
            ctx.lineWidth = 2.2;
            ctx.beginPath();
            ctx.arc(LX, yOf(u, NL), 13, 0, Math.PI * 2);
            ctx.stroke();
          }
        }
        const matchedR = new Set(matchNow.filter((v) => v !== -1));
        for (let v = 0; v < NR; v++) {
          const free = !matchedR.has(v);
          ctx.fillStyle = free ? `${heur}33` : `${algo}33`;
          ctx.strokeStyle = free ? heur : algo;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(RX, yOf(v, NR), 9, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          if (inCover && coverRSet.has(v)) {
            ctx.strokeStyle = warn;
            ctx.lineWidth = 2.2;
            ctx.beginPath();
            ctx.arc(RX, yOf(v, NR), 13, 0, Math.PI * 2);
            ctx.stroke();
          }
        }

        const size = matchNow.filter((v) => v !== -1).length;
        ctx.fillStyle = dim;
        ctx.font = '11px ui-monospace, monospace';
        let line;
        if (inCover) {
          const cn = sc.coverL.length + sc.coverR.length;
          ctx.fillText('the failed search is not waste: its reachable set is the certificate', 14, 20);
          ctx.fillStyle = good;
          line = `matching ${size} · König cover ${cn} (red rings): equal, so neither can improve`;
        } else {
          const p = sc.phases[phaseIdx];
          ctx.fillText(
            `phase ${phaseIdx + 1}/${sc.phases.length} · ${stage === 'bfs' ? 'BFS wave: layering by alternating distance' : `batch: ${p.paths.length} disjoint shortest path${p.paths.length > 1 ? 's' : ''} flip together`}`,
            14,
            20,
          );
          ctx.fillStyle = ink;
          line = `matched ${size}/${NL} · amber = free · green = matched`;
        }
        ctx.font = '12px ui-monospace, monospace';
        ctx.fillText(line, 14, H - 12);
        ctx.fillStyle = dim;
        ctx.font = '11px ui-monospace, monospace';
        ctx.fillText('L', LX - 4, 26);
        ctx.fillText('R', RX - 4, 26);

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
          new fair
        </button>
        <span className="viz-stat">
          {snap.line || 'opening the job fair…'}
        </span>
      </div>
    </>
  );
}
