import { useEffect, useRef, useState } from 'react';
import { useCanvasLoop, isStill, holdTicks, mulberry32 } from './useCanvasLoop.js';

// A small HNSW index over points in the plane, so the hierarchy can be
// seen. Large dots sit in the top layers, small dots only in the bottom
// one. Act 1: the index is built by inserting points one at a time (the
// bottom-layer graph appears). Act 2: a query descends: an amber hop
// per step through the sparse layers, then the beam search at the
// bottom (blue = visited), then the ten results (green) against the
// exact ten (green rings) with the distance count against brute force.
const W = 640;
const H = 300;
const SEED = 20260926;
const N = 160;
const M = 4;
const EF = 12;
const K = 6;

let count = 0;
function d2(a, b) {
  count += 1;
  return (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2;
}

class Hnsw {
  constructor(rand) {
    this.rand = rand;
    this.points = [];
    this.layers = [];
    this.levelOf = [];
    this.entry = -1;
    this.top = -1;
    this.mL = 1 / Math.log(M);
  }
  searchLayer(q, ep, ef, layer, trace) {
    const visited = new Set([ep]);
    const d0 = d2(q, this.points[ep]);
    const cand = [[d0, ep]];
    const best = [[d0, ep]];
    if (trace) trace.push({ layer, node: ep });
    while (cand.length) {
      cand.sort((a, b) => a[0] - b[0]);
      const [d, c] = cand.shift();
      best.sort((a, b) => b[0] - a[0]);
      if (d > best[0][0] && best.length >= ef) break;
      for (const e of this.layers[layer].get(c)) {
        if (visited.has(e)) continue;
        visited.add(e);
        const de = d2(q, this.points[e]);
        if (trace) trace.push({ layer, node: e });
        best.sort((a, b) => b[0] - a[0]);
        if (best.length < ef || de < best[0][0]) {
          cand.push([de, e]);
          best.push([de, e]);
          best.sort((a, b) => b[0] - a[0]);
          if (best.length > ef) best.shift();
        }
      }
    }
    return best.sort((a, b) => a[0] - b[0]);
  }
  select(q, cands, maxM) {
    const kept = [];
    const discarded = [];
    for (const [d, e] of cands) {
      if (kept.length >= maxM) break;
      let ok = true;
      for (const k of kept) if (d2(this.points[e], this.points[k]) < d) { ok = false; break; }
      (ok ? kept : discarded).push(e);
    }
    for (const e of discarded) { if (kept.length >= maxM) break; kept.push(e); }
    return kept;
  }
  insert(p) {
    const qid = this.points.length;
    this.points.push(p);
    const level = Math.min(3, Math.floor(-Math.log(this.rand()) * this.mL));
    this.levelOf.push(level);
    while (this.layers.length <= level) this.layers.push(new Map());
    for (let l = 0; l <= level; l++) this.layers[l].set(qid, []);
    if (this.entry < 0) { this.entry = qid; this.top = level; return; }
    let ep = this.entry;
    for (let l = this.top; l > level; l--) ep = this.searchLayer(p, ep, 1, l)[0][1];
    for (let l = Math.min(level, this.top); l >= 0; l--) {
      const Wl = this.searchLayer(p, ep, EF, l);
      const maxM = l === 0 ? 2 * M : M;
      const nb = this.select(p, Wl, maxM);
      this.layers[l].set(qid, [...nb]);
      for (const e of nb) {
        const lst = this.layers[l].get(e);
        lst.push(qid);
        if (lst.length > maxM) {
          const c = lst.map((x) => [d2(this.points[e], this.points[x]), x]).sort((a, b) => a[0] - b[0]);
          this.layers[l].set(e, this.select(this.points[e], c, maxM));
        }
      }
      ep = Wl[0][1];
    }
    if (level > this.top) { this.entry = qid; this.top = level; }
  }
  query(q) {
    const trace = [];
    let ep = this.entry;
    for (let l = this.top; l > 0; l--) ep = this.searchLayer(q, ep, 1, l, trace)[0][1];
    const res = this.searchLayer(q, ep, EF, 0, trace);
    return { trace, result: res.slice(0, K).map((x) => x[1]) };
  }
}

export function makeScene(seed) {
  const rand = mulberry32(seed);
  const idx = new Hnsw(rand);
  const pts = [];
  while (pts.length < N) {
    const p = [30 + rand() * 300, 40 + rand() * 230];
    if (pts.every((o) => Math.hypot(o[0] - p[0], o[1] - p[1]) > 9)) pts.push(p);
  }
  count = 0;
  for (const p of pts) idx.insert(p);
  const buildCount = count;
  const q = [60 + rand() * 240, 60 + rand() * 190];
  count = 0;
  const { trace, result } = idx.query(q);
  const queryCount = count;
  count = 0;
  const exact = pts.map((p, i) => [d2(q, p), i]).sort((a, b) => a[0] - b[0]).slice(0, K).map((x) => x[1]);
  const bruteCount = count;
  const hits = result.filter((i) => exact.includes(i)).length;
  const edges0 = [];
  for (const [u, nb] of idx.layers[0]) for (const v of nb) if (v > u) edges0.push([u, v]);
  return { idx, pts, q, trace, result, exact, hits, queryCount, bruteCount, buildCount, edges0, levelOf: idx.levelOf, sizes: idx.layers.map((l) => l.size) };
}

export default function HnswViz() {
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
      init: () => ({ scene: makeScene(SEED + cycle.current * 7919), act: 0, tick: 0, actRest: 0, rest: 0, stopAtRest: isStill() }),
      tick: (s) => {
        if (s.act >= 2) {
          if (s.stopAtRest) return false;
          s.rest += 1;
          if (s.rest > holdTicks(s)) {
            cycle.current += 1;
            Object.assign(s, { scene: makeScene(SEED + cycle.current * 7919), act: 0, tick: 0, actRest: 0, rest: 0 });
          }
          return true;
        }
        s.tick += 1;
        const len = s.act === 0 ? Math.ceil(N / 2) + 6 : s.scene.trace.length * 2 + 24;
        if (s.tick >= len) {
          s.tick = len;
          s.actRest += 1;
          if (s.actRest > holdTicks(s)) {
            s.act += 1;
            s.tick = 0;
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
        const dim = css.getPropertyValue('--ink-dim').trim() || '#9aa5bd';
        const ink = css.getPropertyValue('--ink').trim() || '#e9edf6';
        const sc = s.scene;
        const done = s.act >= 2;
        const act = done ? 1 : s.act;
        const shown = act === 0 ? Math.min(N, s.tick * 2) : N;

        ctx.font = '11px ui-monospace, monospace';
        ctx.fillStyle = dim;
        ctx.fillText(act === 0
          ? `act 1 · build: ${shown} of ${N} points inserted; big dots were drawn into the upper layers (about 1 in ${M} per level)`
          : 'act 2 · query: greedy hops down the sparse layers (amber), then a beam search at the bottom (blue), then the answer (green)', 14, 18);

        // bottom-layer edges among shown points
        ctx.strokeStyle = `${dim}33`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (const [u, v] of sc.edges0) {
          if (u < shown && v < shown) {
            ctx.moveTo(sc.pts[u][0], sc.pts[u][1]);
            ctx.lineTo(sc.pts[v][0], sc.pts[v][1]);
          }
        }
        ctx.stroke();

        let visited = new Set();
        let hops = [];
        let stepIdx = 0;
        let finished = false;
        if (act === 1) {
          stepIdx = done ? sc.trace.length : Math.min(sc.trace.length, Math.floor(s.tick / 2));
          finished = done || s.tick >= sc.trace.length * 2 + 6;
          for (let i = 0; i < stepIdx; i++) {
            const ev = sc.trace[i];
            if (ev.layer > 0) hops.push(ev.node);
            else visited.add(ev.node);
          }
        }
        // points
        for (let i = 0; i < shown; i++) {
          const [x, y] = sc.pts[i];
          const lv = sc.levelOf[i];
          const r = 2 + lv * 1.6;
          ctx.beginPath();
          ctx.arc(x, y, r, 0, Math.PI * 2);
          ctx.fillStyle = visited.has(i) ? algo : lv > 0 ? `${heur}CC` : `${dim}AA`;
          ctx.fill();
          if (finished && sc.exact.includes(i)) {
            ctx.strokeStyle = good;
            ctx.lineWidth = 1.8;
            ctx.beginPath();
            ctx.arc(x, y, r + 4, 0, Math.PI * 2);
            ctx.stroke();
          }
          if (finished && sc.result.includes(i)) {
            ctx.fillStyle = good;
            ctx.beginPath();
            ctx.arc(x, y, r + 1, 0, Math.PI * 2);
            ctx.fill();
          }
        }
        if (act === 1) {
          // hops
          ctx.strokeStyle = heur;
          ctx.lineWidth = 2;
          ctx.beginPath();
          hops.forEach((n, i) => {
            const [x, y] = sc.pts[n];
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          });
          ctx.stroke();
          // query
          ctx.fillStyle = ink;
          ctx.beginPath();
          ctx.arc(sc.q[0], sc.q[1], 5, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = ink;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(sc.q[0], sc.q[1], 9, 0, Math.PI * 2);
          ctx.stroke();
        }
        // ledger
        const lx = 350;
        ctx.font = '11px ui-monospace, monospace';
        ctx.fillStyle = ink;
        ctx.fillText(`${N} points, layers ${sc.sizes.join(' / ')}`, lx, 52);
        ctx.fillStyle = dim;
        ctx.fillText(`M = ${M} neighbors per layer (${2 * M} at the bottom), beam ef = ${EF}`, lx, 72);
        ctx.fillStyle = heur;
        ctx.fillText(`build: ${sc.buildCount.toLocaleString()} distance computations`, lx, 100);
        ctx.fillStyle = algo;
        ctx.fillText(`query: ${sc.queryCount} distances vs brute force ${sc.bruteCount}`, lx, 120);
        ctx.fillStyle = good;
        ctx.fillText(finished ? `recall: ${sc.hits} of ${K} exact neighbors found` : `answer pending: ${K} nearest wanted`, lx, 140);
        ctx.fillStyle = dim;
        ctx.font = '10px ui-monospace, monospace';
        ctx.fillText('amber dots: points present in an upper layer', lx, 168);
        ctx.fillText('amber path: the greedy descent, one nearest hop at a time', lx, 182);
        ctx.fillText('blue: bottom-layer beam · green ring: exact answer · green dot: returned', lx, 196);
        let line;
        if (act === 0) line = shown < N ? 'insert: descend to the point’s level, then connect it to a diverse handful of near neighbors on each layer' : `built: every node keeps at most ${2 * M} bottom-layer neighbors, chosen for diversity, not just nearness`;
        else if (!finished) line = stepIdx < sc.trace.length && sc.trace[stepIdx - 1] && sc.trace[stepIdx - 1].layer > 0 ? `layer ${sc.trace[stepIdx - 1].layer}: hop to the neighbor nearest the query, stop when none is nearer` : `bottom layer: a beam of ${EF} candidates, expanding the best until nothing in reach improves it`;
        else line = `${sc.queryCount} distances for ${sc.hits}/${K} exact neighbors, where brute force pays ${sc.bruteCount}: the layers bought the entry point, the beam bought the recall`;
        ctx.font = '11px ui-monospace, monospace';
        ctx.fillStyle = finished ? good : act === 1 ? heur : ink;
        ctx.fillText(line, 14, H - 8);
        statsRef.current = { line: done ? `${sc.hits}/${K} exact at ${sc.queryCount} distances vs ${sc.bruteCount} brute force` : line };
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
        <span className="viz-stat">{snap.line || 'indexing…'}</span>
      </div>
    </>
  );
}
