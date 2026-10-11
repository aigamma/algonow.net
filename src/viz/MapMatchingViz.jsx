import { useEffect, useRef, useState } from 'react';
import { useCanvasLoop, isStill, holdTicks, mulberry32 } from './useCanvasLoop.js';

// A seeded road grid with a frontage road, a hidden route, and noisy fixes
// revealed one per tick; Viterbi and snapping (beta = infinity) re-run on the
// prefix. Invariant: the Viterbi path equals the exhaustive maximum on short
// prefixes (beats every one-candidate change on long ones) and beats snapping.
const W = 640;
const H = 300;
const SEED = 20261010;
const NX = 7;
const NY = 4;
const SP = 70;

const gauss = (rand) => Math.sqrt(-2 * Math.log(Math.max(rand(), 1e-12))) * Math.cos(2 * Math.PI * rand());

function buildNetwork(rand) {
  const nodes = [];
  const edges = [];
  const grid = [];
  for (let i = 0; i < NX; i += 1) {
    grid.push([]);
    for (let j = 0; j < NY; j += 1) { grid[i].push(nodes.length); nodes.push([30 + i * SP, 30 + j * SP]); }
  }
  const add = (a, b, frontage = false) => edges.push({ a, b, len: Math.hypot(nodes[b][0] - nodes[a][0], nodes[b][1] - nodes[a][1]), frontage });
  for (let i = 0; i < NX; i += 1) {
    for (let j = 0; j < NY; j += 1) {
      if (i + 1 < NX) add(grid[i][j], grid[i + 1][j]);
      if (j + 1 < NY) add(grid[i][j], grid[i][j + 1]);
    }
  }
  for (let k = 0; k < 3; k += 1) {
    const i = Math.floor(rand() * (NX - 1));
    const j = Math.floor(rand() * (NY - 1));
    add(grid[i][j], grid[i + 1][j + 1]);
  }
  const f = [];
  for (let i = 1; i <= 5; i += 1) { f.push(nodes.length); nodes.push([30 + i * SP, 30 + 2 * SP + 13]); }
  for (let k = 0; k < 4; k += 1) add(f[k], f[k + 1], true);
  add(f[0], grid[1][2]);
  add(f[4], grid[5][2]);
  const adj = nodes.map(() => []);
  edges.forEach((e, idx) => { adj[e.a].push([e.b, e.len, idx]); adj[e.b].push([e.a, e.len, idx]); });
  const D = nodes.map((_, s) => {
    const dist = new Array(nodes.length).fill(Infinity);
    const done = new Array(nodes.length).fill(false);
    dist[s] = 0;
    for (let it = 0; it < nodes.length; it += 1) {
      let u = -1;
      for (let v = 0; v < nodes.length; v += 1) if (!done[v] && (u < 0 || dist[v] < dist[u])) u = v;
      if (dist[u] === Infinity) break;
      done[u] = true;
      for (const [v, w] of adj[u]) if (dist[u] + w < dist[v]) dist[v] = dist[u] + w;
    }
    return dist;
  });
  return { nodes, edges, adj, D, avenue: [1, 2, 3, 4, 5].map((i) => grid[i][2]) };
}

function project(p, net, e) {
  const { a, b, len } = net.edges[e];
  const [ax, ay] = net.nodes[a];
  const [bx, by] = net.nodes[b];
  const u = Math.min(1, Math.max(0, ((p[0] - ax) * (bx - ax) + (p[1] - ay) * (by - ay)) / (len * len)));
  return { e, d: Math.hypot(p[0] - ax - u * (bx - ax), p[1] - ay - u * (by - ay)), u, x: ax + u * (bx - ax), y: ay + u * (by - ay) };
}

function routeDist(net, c1, c2) {
  const A = net.edges[c1.e];
  const B = net.edges[c2.e];
  if (c1.e === c2.e) return Math.abs(c1.u - c2.u) * A.len;
  let best = Infinity;
  for (const [n1, d1] of [[A.a, c1.u * A.len], [A.b, (1 - c1.u) * A.len]]) {
    for (const [n2, d2] of [[B.a, c2.u * B.len], [B.b, (1 - c2.u) * B.len]]) best = Math.min(best, d1 + net.D[n1][n2] + d2);
  }
  return best;
}

const gcDist = (sc, t) => Math.hypot(sc.fixes[t][0] - sc.fixes[t - 1][0], sc.fixes[t][1] - sc.fixes[t - 1][1]);

function scorePath(sc, path) {
  let total = 0;
  for (let t = 0; t < path.length; t += 1) {
    const c = sc.cands[t][path[t]];
    total += -0.5 * (c.d / sc.sigma) ** 2;
    if (t > 0) total += -Math.abs(gcDist(sc, t) - routeDist(sc.net, sc.cands[t - 1][path[t - 1]], c)) / sc.beta;
  }
  return total;
}

function viterbi(sc, T, beta) {
  let score = sc.cands[0].map((c) => -0.5 * (c.d / sc.sigma) ** 2);
  const back = [];
  for (let t = 1; t < T; t += 1) {
    const gc = gcDist(sc, t);
    const next = [];
    const bp = [];
    for (const c of sc.cands[t]) {
      let best = -Infinity;
      let arg = -1;
      sc.cands[t - 1].forEach((p, i) => {
        const v = score[i] + (beta === Infinity ? 0 : -Math.abs(gc - routeDist(sc.net, p, c)) / beta);
        if (v > best) { best = v; arg = i; }
      });
      next.push(best - 0.5 * (c.d / sc.sigma) ** 2);
      bp.push(arg);
    }
    score = next;
    back.push(bp);
  }
  let j = score.indexOf(Math.max(...score));
  const path = [j];
  for (let k = back.length - 1; k >= 0; k -= 1) { j = back[k][j]; path.push(j); }
  return path.reverse();
}

export function makeScene(seed) {
  const rand = mulberry32(seed);
  const net = buildNetwork(rand);
  const sigma = 5 + Math.floor(rand() * 3) * 2;
  const alongAvenue = rand() < 0.5;
  let route = [];
  if (alongAvenue) {
    for (let k = 0; k < 4; k += 1) route.push([net.adj[net.avenue[k]].find(([v]) => v === net.avenue[k + 1])[2], net.avenue[k], net.avenue[k + 1]]);
    const tail = net.adj[net.avenue[4]].filter(([v, , e]) => !net.avenue.includes(v) && !net.edges[e].frontage);
    const pick = tail[Math.floor(rand() * tail.length)];
    route.push([pick[2], net.avenue[4], pick[0]]);
  } else {
    while (route.length < 7) {
      let u = Math.floor(rand() * (NX * NY));
      const seen = new Set([u]);
      route = [];
      for (let k = 0; k < 7; k += 1) {
        const opts = net.adj[u].filter(([v]) => !seen.has(v));
        if (!opts.length) break;
        const [v, , e] = opts[Math.floor(rand() * opts.length)];
        route.push([e, u, v]);
        seen.add(v);
        u = v;
      }
    }
  }
  const fixes = [];
  const truth = [];
  let s = 12;
  let acc = 0;
  for (const [e, a, b] of route) {
    const len = net.edges[e].len;
    while (s < acc + len) {
      const t = (s - acc) / len;
      fixes.push([net.nodes[a][0] + t * (net.nodes[b][0] - net.nodes[a][0]) + gauss(rand) * sigma, net.nodes[a][1] + t * (net.nodes[b][1] - net.nodes[a][1]) + gauss(rand) * sigma]);
      truth.push(e);
      s += 24;
    }
    acc += len;
  }
  const radius = 20 + 3 * sigma;
  const cands = fixes.map((p) => {
    const all = net.edges.map((_, e) => project(p, net, e));
    const near = all.filter((c) => c.d <= radius);
    return near.length ? near : [all.reduce((m, c) => (c.d < m.d ? c : m))];
  });
  return { net, sigma, beta: 2 * sigma, route, fixes, truth, cands, t: 0, hmm: [], snap: [], ok: true, done: false, hmmRight: 0, snapRight: 0, last: `${fixes.length} fixes at noise ${sigma}; ${alongAvenue ? 'the route runs the avenue beside the frontage road' : 'a random route'}` };
}

export function sceneTick(sc) {
  if (sc.done) return true;
  sc.t += 1;
  const T = sc.t;
  sc.hmm = viterbi(sc, T, sc.beta);
  sc.snap = viterbi(sc, T, Infinity);
  const hs = scorePath(sc, sc.hmm);
  const ss = scorePath(sc, sc.snap);
  let sequences = 1;
  for (let t = 0; t < T; t += 1) sequences *= sc.cands[t].length;
  if (sequences <= 4000) {
    let best = -Infinity;
    const path = new Array(T).fill(0);
    const rec = (t) => {
      if (t === T) { best = Math.max(best, scorePath(sc, path)); return; }
      for (let i = 0; i < sc.cands[t].length; i += 1) { path[t] = i; rec(t + 1); }
    };
    rec(0);
    if (!(Math.abs(best - hs) < 1e-9)) sc.ok = false;
  } else {
    for (let t = 0; t < T && sc.ok; t += 1) {
      for (let i = 0; i < sc.cands[t].length; i += 1) {
        if (i === sc.hmm[t]) continue;
        const alt = sc.hmm.slice();
        alt[t] = i;
        if (scorePath(sc, alt) > hs + 1e-9) sc.ok = false;
      }
    }
  }
  if (hs < ss - 1e-9 || !Number.isFinite(hs)) sc.ok = false;
  const wrongFrontage = (path) => path.filter((ci, t) => sc.net.edges[sc.cands[t][ci].e].frontage && !sc.net.edges[sc.truth[t]].frontage).length;
  sc.hmmRight = sc.hmm.filter((ci, t) => sc.cands[t][ci].e === sc.truth[t]).length;
  sc.snapRight = sc.snap.filter((ci, t) => sc.cands[t][ci].e === sc.truth[t]).length;
  const hf = wrongFrontage(sc.hmm);
  const sf = wrongFrontage(sc.snap);
  sc.done = T >= sc.fixes.length;
  sc.last = `${sc.done ? 'done: ' : ''}fix ${T} of ${sc.fixes.length}: on the true road HMM ${sc.hmmRight}/${T}, snapping ${sc.snapRight}/${T}; frontage flips HMM ${hf}, snapping ${sf}; Viterbi ${hs.toFixed(2)} >= snapping ${ss.toFixed(2)}: ${sc.ok ? 'yes' : 'NO'}`;
  return sc.done;
}

export default function MapMatchingViz() {
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
      stepMs: 380,
      init: () => ({ scene: makeScene(SEED + cycle.current * 7919), done: false, rest: 0, stopAtRest: isStill() }),
      tick: (s) => {
        if (s.done) {
          if (s.stopAtRest) return false;
          s.rest += 1;
          if (s.rest > holdTicks(s) * 2) {
            cycle.current += 1;
            Object.assign(s, { scene: makeScene(SEED + cycle.current * 7919), done: false, rest: 0 });
          }
          return true;
        }
        if (sceneTick(s.scene)) s.done = true;
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
        const { net } = sc;
        const seg = (a, b, color, width) => {
          ctx.strokeStyle = color;
          ctx.lineWidth = width;
          ctx.beginPath();
          ctx.moveTo(net.nodes[a][0], net.nodes[a][1]);
          ctx.lineTo(net.nodes[b][0], net.nodes[b][1]);
          ctx.stroke();
        };
        for (const e of net.edges) seg(e.a, e.b, e.frontage ? `${dim}99` : `${dim}55`, 1);
        for (const [, a, b] of sc.route) seg(a, b, `${good}55`, 5);
        for (let t = 0; t < sc.t; t += 1) {
          const sp = sc.cands[t][sc.snap[t]];
          ctx.fillStyle = sp.e === sc.truth[t] ? `${heur}cc` : warn;
          ctx.fillRect(sp.x - 3, sp.y - 3, 6, 6);
          ctx.fillStyle = ink;
          ctx.fillRect(sc.fixes[t][0] - 2, sc.fixes[t][1] - 2, 4, 4);
        }
        ctx.strokeStyle = algo;
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let t = 0; t < sc.t; t += 1) {
          const c = sc.cands[t][sc.hmm[t]];
          if (t === 0) ctx.moveTo(c.x, c.y); else ctx.lineTo(c.x, c.y);
        }
        ctx.stroke();
        ctx.font = '11px ui-monospace, monospace';
        const rx = 500;
        [[dim, 'green: hidden route'], [dim, 'squares: noisy fixes'], [heur, 'amber: nearest snap'], [warn, 'red: snap wrong road'], [algo, 'blue: Viterbi route'], [dim, `noise ${sc.sigma}, beta ${sc.beta}`], [dim, `fixes ${sc.t} / ${sc.fixes.length}`], [dim, `right: HMM ${sc.hmmRight}, snap ${sc.snapRight}`]].forEach(([color, text], i) => {
          ctx.fillStyle = color;
          ctx.fillText(text, rx, 40 + i * 16);
        });
        ctx.fillStyle = sc.ok ? good : warn;
        ctx.fillText(sc.ok ? 'invariant: optimum, >= snapping' : 'INVARIANT BROKEN', rx, 184);
        ctx.fillStyle = s.done ? (sc.ok ? good : warn) : ink;
        const line = sc.last;
        ctx.fillText(line.length > 100 ? `${line.slice(0, 99)}…` : line, 12, H - 6);
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
          new trace
        </button>
        <span className="viz-stat">{snap.line || 'matching…'}</span>
      </div>
    </>
  );
}
