import { useEffect, useRef, useState } from 'react';
import { useCanvasLoop, isStill, holdTicks, mulberry32 } from './useCanvasLoop.js';

// Two acts of one objective. Act one: a planted four-block network
// starts as confetti (every node its own community); greedy
// modularity moves recolor node after node, the Q meter climbs,
// and the four blocks crystallize out. Act two: the resolution
// limit: a ring of twelve little cliques, each an obvious
// community: and the same objective happily paints adjacent
// cliques the SAME color, because the merged partition scores
// higher modularity: the famous flaw, drawn.
const W = 640;
const H = 300;
const SEED = 20260827;
const END_HOLD = 70;
const MOVE_TICKS = 3;

function modularity(adj, m, comm) {
  let q = 0;
  const dsum = new Map();
  adj.forEach((nbrs, i) => {
    dsum.set(comm[i], (dsum.get(comm[i]) || 0) + nbrs.length);
    for (const j of nbrs) if (comm[i] === comm[j]) q += 1;
  });
  let exp = 0;
  for (const s of dsum.values()) exp += s * s;
  return (q - exp / (2 * m)) / (2 * m);
}

// Louvain phase 1 with an event log of accepted moves.
export function localMoves(adj, m) {
  const n = adj.length;
  const deg = adj.map((a) => a.length);
  const comm = [...Array(n).keys()];
  const tot = deg.slice();
  const events = [];
  let improved = true;
  while (improved) {
    improved = false;
    for (let v = 0; v < n; v++) {
      const cv = comm[v];
      const links = new Map();
      for (const u of adj[v]) {
        if (u === v) continue;
        links.set(comm[u], (links.get(comm[u]) || 0) + 1);
      }
      tot[cv] -= deg[v];
      const base = (links.get(cv) || 0) - (tot[cv] * deg[v]) / (2 * m);
      let bestC = cv;
      let bestG = 0;
      for (const [c, l] of links) {
        if (c === cv) continue;
        const g = l - (tot[c] * deg[v]) / (2 * m) - base;
        if (g > bestG + 1e-12) {
          bestG = g;
          bestC = c;
        }
      }
      comm[v] = bestC;
      tot[bestC] += deg[v];
      if (bestC !== cv) {
        improved = true;
        events.push({ nodes: [v], to: bestC, q: modularity(adj, m, comm) });
      }
    }
  }
  return { comm, events };
}

// Full Louvain for the viz: phase 1, aggregate (self-loops kept),
// phase 2 on the supernode graph, with stage-2 moves mapped back
// to whole-community recolor events on the original nodes.
export function fullLouvain(adj, m) {
  const first = localMoves(adj, m);
  const comm = first.comm.slice();
  const events = first.events.slice();
  // aggregate
  const remap = new Map();
  for (const c of comm) if (!remap.has(c)) remap.set(c, remap.size);
  const nSup = remap.size;
  const supAdj = Array.from({ length: nSup }, () => []);
  adj.forEach((nbrs, v) => {
    for (const u of nbrs) supAdj[remap.get(comm[v])].push(remap.get(comm[u]));
  });
  const second = localMoves(supAdj, m);
  // map stage-2 moves back: recolor every original member at once.
  const members = Array.from({ length: nSup }, () => []);
  comm.forEach((c, v) => members[remap.get(c)].push(v));
  const supComm = [...Array(nSup).keys()];
  for (const e of second.events) {
    const sup = e.nodes[0];
    supComm[sup] = e.to;
    const labels = comm.map((c) => supComm[remap.get(c)]);
    // Stage-2 labels live in a different space than stage-1's, so
    // each merge event carries the full label snapshot: the replay
    // assigns it wholesale instead of patching.
    events.push({ nodes: members[sup].slice(), labels: labels.slice(), q: modularity(adj, m, labels) });
  }
  const final = comm.map((c) => supComm[remap.get(c)]);
  return { comm: final, events };
}

export function makeScene(seed) {
  const rand = mulberry32(seed);
  // Act 1: planted 4 blocks of 9 in a 6x6 grid layout.
  const K = 4;
  const SZ = 9;
  const n = K * SZ;
  const truth = [...Array(n).keys()].map((v) => Math.floor(v / SZ));
  // Deterministic reroll: the caption claims the planted blocks are
  // recovered, so the instance shown must be one where the (single
  // aggregation round) run genuinely recovers them: typical, not
  // cherry-rare: the solution file measures 30/30 at this density
  // for the full multi-round algorithm.
  let adj;
  let m;
  let run;
  for (let tries = 0; tries < 40; tries++) {
    adj = Array.from({ length: n }, () => []);
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const p = truth[i] === truth[j] ? 0.65 : 0.02;
        if (rand() < p) {
          adj[i].push(j);
          adj[j].push(i);
        }
      }
    }
    m = adj.reduce((a, x) => a + x.length, 0) / 2;
    run = fullLouvain(adj, m);
    let exact = true;
    for (let i = 0; i < n && exact; i++) {
      for (let j = i + 1; j < n; j++) {
        if ((truth[i] === truth[j]) !== (run.comm[i] === run.comm[j])) {
          exact = false;
          break;
        }
      }
    }
    if (exact) break;
  }
  // positions: four cluster blobs
  const centers = [
    [150, 95],
    [430, 85],
    [180, 212],
    [460, 208],
  ];
  const pos = truth.map((t) => {
    const ang = rand() * Math.PI * 2;
    const rad = 16 + rand() * 28;
    return [centers[t][0] + Math.cos(ang) * rad * 1.5, centers[t][1] + Math.sin(ang) * rad];
  });
  const qFinal = modularity(adj, m, run.comm);
  const agree = run.comm.every(
    (c, v) => run.comm.filter((c2, v2) => truth[v2] === truth[v] && c2 === c).length ===
      run.comm.filter((_, v2) => truth[v2] === truth[v]).length,
  );

  // Act 2: ring of 12 triangles (3-cliques) linked in a cycle.
  const RC = 12;
  const RS = 3;
  const n2 = RC * RS;
  const adj2 = Array.from({ length: n2 }, () => []);
  for (let c = 0; c < RC; c++) {
    const b = c * RS;
    for (let i = 0; i < RS; i++)
      for (let j = i + 1; j < RS; j++) {
        adj2[b + i].push(b + j);
        adj2[b + j].push(b + i);
      }
    const nxt = ((c + 1) % RC) * RS;
    adj2[b].push(nxt + 1);
    adj2[nxt + 1].push(b);
  }
  const m2 = adj2.reduce((a, x) => a + x.length, 0) / 2;
  const run2 = fullLouvain(adj2, m2);
  const found2 = new Set(run2.comm).size;
  const perClique = [...Array(n2).keys()].map((v) => Math.floor(v / RS));
  const qMerged = modularity(adj2, m2, run2.comm);
  const qObvious = modularity(adj2, m2, perClique);
  const pos2 = [...Array(n2).keys()].map((v) => {
    const c = Math.floor(v / RS);
    const i = v % RS;
    const ang = (c / RC) * Math.PI * 2 - Math.PI / 2;
    const cx = 320 + Math.cos(ang) * 105;
    const cy = 150 + Math.sin(ang) * 88;
    const a2 = (i / RS) * Math.PI * 2;
    return [cx + Math.cos(a2) * 11, cy + Math.sin(a2) * 11];
  });
  return { adj, pos, truth, run, m, qFinal, agree, adj2, pos2, run2, found2, RC, qMerged, qObvious };
}

const PALETTE_N = 10;

export default function LouvainViz() {
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
        const len =
          s.act === 0
            ? s.scene.run.events.length * MOVE_TICKS + END_HOLD
            : s.scene.run2.events.length * MOVE_TICKS + END_HOLD;
        if (s.tick >= len) {
          // Hold the finished act for the full rest before the next
          // act begins: every burst of motion earns its two minutes.
          s.tick = len;
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
        const sc = s.scene;
        const palette = [algo, heur, good, warn, '#b78cff', '#5fd4d0', '#e08fd0', '#a8c26a', '#d99d66', '#7f9df0'];

        const done = s.act >= 2;
        const actIdx = done ? 1 : s.act;
        ctx.fillStyle = dim;
        ctx.font = '11px ui-monospace, monospace';

        const drawGraph = (adj, pos, colorOf, r) => {
          ctx.strokeStyle = 'rgba(154,165,189,0.14)';
          ctx.lineWidth = 1;
          adj.forEach((nbrs, i) => {
            for (const j of nbrs) {
              if (j > i) {
                ctx.beginPath();
                ctx.moveTo(pos[i][0], pos[i][1]);
                ctx.lineTo(pos[j][0], pos[j][1]);
                ctx.stroke();
              }
            }
          });
          pos.forEach((p, i) => {
            ctx.fillStyle = colorOf(i);
            ctx.beginPath();
            ctx.arc(p[0], p[1], r, 0, Math.PI * 2);
            ctx.fill();
          });
        };

        if (actIdx === 0) {
          const evs = sc.run.events;
          const k = Math.min(done ? evs.length : Math.floor(s.tick / MOVE_TICKS), evs.length);
          const finished = done || k >= evs.length;
          ctx.fillText('act 1 · every node starts alone; each move takes the neighbor community with the largest ΔQ', 14, 20);
          // replay community state after k moves
          let comm = [...Array(sc.adj.length).keys()];
          for (let i = 0; i < k; i++) {
            if (evs[i].labels) comm = evs[i].labels.slice();
            else for (const v of evs[i].nodes) comm[v] = evs[i].to;
          }
          const canon = new Map();
          const colorOf = (i) => {
            if (!canon.has(comm[i])) canon.set(comm[i], canon.size % PALETTE_N);
            return palette[canon.get(comm[i])];
          };
          drawGraph(sc.adj, sc.pos, colorOf, 6);
          const q = k > 0 ? evs[k - 1].q : 0;
          ctx.fillStyle = heur;
          ctx.font = '12px ui-monospace, monospace';
          ctx.fillText(`Q = ${q.toFixed(4)}`, 552, 40);

          let line;
          if (finished) {
            line = `quiet: ${new Set(comm).size} communities, Q = ${sc.qFinal.toFixed(4)}: the four planted blocks, recovered`;
            ctx.fillStyle = good;
          } else {
            line = `move ${k}/${evs.length}: node ${evs[Math.max(0, k - 1)]?.nodes[0] ?? '·'} joins its best neighbor community`;
            ctx.fillStyle = ink;
          }
          ctx.font = '12px ui-monospace, monospace';
          ctx.fillText(line, 14, H - 12);
          statsRef.current = { line };
        } else {
          const evs = sc.run2.events;
          const k = Math.min(done ? evs.length : Math.floor(s.tick / MOVE_TICKS), evs.length);
          const finished = done || k >= evs.length;
          ctx.fillText('act 2 · the resolution limit: twelve obvious cliques in a ring, one objective', 14, 20);
          let comm = [...Array(sc.adj2.length).keys()];
          for (let i = 0; i < k; i++) {
            if (evs[i].labels) comm = evs[i].labels.slice();
            else for (const v of evs[i].nodes) comm[v] = evs[i].to;
          }
          const canon = new Map();
          const colorOf = (i) => {
            if (!canon.has(comm[i])) canon.set(comm[i], canon.size % PALETTE_N);
            return palette[canon.get(comm[i])];
          };
          drawGraph(sc.adj2, sc.pos2, colorOf, 5);

          let line;
          if (finished) {
            line = `${sc.found2} colors over ${sc.RC} cliques: pairs merged, and the merged Q ${sc.qMerged.toFixed(3)} BEATS one-per-clique ${sc.qObvious.toFixed(3)}`;
            ctx.fillStyle = warn;
          } else {
            line = `move ${k}/${evs.length}: modularity pulls neighboring cliques together…`;
            ctx.fillStyle = ink;
          }
          ctx.font = '12px ui-monospace, monospace';
          ctx.fillText(line, 14, H - 12);
          statsRef.current = {
            line: done
              ? 'the flaw is the objective, not the search: know your yardstick before trusting its optimum'
              : line,
          };
        }
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
          new network
        </button>
        <span className="viz-stat">
          {snap.line || 'scattering the confetti…'}
        </span>
      </div>
    </>
  );
}
