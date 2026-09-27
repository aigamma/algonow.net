import { useEffect, useRef, useState } from 'react';
import { useCanvasLoop, isStill, holdTicks, mulberry32 } from './useCanvasLoop.js';

// 120 unit vectors in the plane, clustered, and a query with a near
// neighbor. Each tick adds one hash table: k random lines through the
// origin (amber), whose sides give a k-bit code, so the plane is cut
// into sectors; every point in the query's sector (blue) joins the
// candidate set. After L tables the candidates are reranked exactly,
// and the answer is checked against brute force (green if it is the
// true nearest neighbor, red if the filter lost it).
const W = 640;
const H = 300;
const SEED = 20260926;
const N = 120;
const CLUSTERS = 8;
const K = 6;
const L = 4;

function angDiff(a, b) {
  let d = Math.abs(a - b) % (Math.PI * 2);
  if (d > Math.PI) d = Math.PI * 2 - d;
  return d;
}

export function makeScene(seed) {
  const rand = mulberry32(seed);
  const centers = Array.from({ length: CLUSTERS }, () => rand() * Math.PI * 2);
  const pts = [];
  for (let i = 0; i < N; i++) {
    const c = centers[i % CLUSTERS];
    pts.push(c + (rand() - 0.5) * 0.28);
  }
  const query = centers[Math.floor(rand() * CLUSTERS)] + (rand() - 0.5) * 0.2;
  let truth = 0;
  for (let i = 1; i < N; i++) if (angDiff(pts[i], query) < angDiff(pts[truth], query)) truth = i;
  return { rand, pts, query, truth, table: 0, lines: [], cands: new Set(), lastBucket: [], answer: null, done: false };
}

const side = (theta, phi) => Math.cos(theta - phi) >= 0;

export function sceneTick(sc) {
  if (sc.done) return true;
  if (sc.table < L) {
    const lines = Array.from({ length: K }, () => sc.rand() * Math.PI);
    const qcode = lines.map((phi) => side(sc.query, phi)).join('');
    const bucket = [];
    for (let i = 0; i < N; i++) {
      if (lines.map((phi) => side(sc.pts[i], phi)).join('') === qcode) {
        bucket.push(i);
        sc.cands.add(i);
      }
    }
    sc.lines = lines;
    sc.lastBucket = bucket;
    sc.table += 1;
    return false;
  }
  let best = null;
  for (const i of sc.cands) if (best === null || angDiff(sc.pts[i], sc.query) < angDiff(sc.pts[best], sc.query)) best = i;
  sc.answer = best;
  sc.done = true;
  return true;
}

export default function LshViz() {
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
      stepMs: 1100,
      init: () => ({ scene: makeScene(SEED + cycle.current * 7919), done: false, rest: 0, stopAtRest: isStill() }),
      tick: (s) => {
        if (s.done) {
          if (s.stopAtRest) return false;
          s.rest += 1;
          if (s.rest > holdTicks(s)) {
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
        const cx = 170;
        const cy = 160;
        const R = 118;
        ctx.font = '11px ui-monospace, monospace';
        ctx.fillStyle = dim;
        ctx.fillText(`${N} unit vectors in the plane, ${CLUSTERS} clusters; table ${Math.min(sc.table, L)} of ${L}: ${K} random lines, one bit each; the query's sector is its bucket`, 12, 18);
        ctx.strokeStyle = `${dim}55`;
        ctx.beginPath();
        ctx.arc(cx, cy, R, 0, Math.PI * 2);
        ctx.stroke();
        if (!s.done) {
          ctx.strokeStyle = `${heur}99`;
          for (const phi of sc.lines) {
            ctx.beginPath();
            ctx.moveTo(cx + Math.cos(phi) * R, cy - Math.sin(phi) * R);
            ctx.lineTo(cx - Math.cos(phi) * R, cy + Math.sin(phi) * R);
            ctx.stroke();
          }
        }
        const bucketSet = new Set(sc.lastBucket);
        for (let i = 0; i < N; i++) {
          const th = sc.pts[i];
          const inCand = sc.cands.has(i);
          ctx.fillStyle = s.done ? (inCand ? algo : `${dim}55`) : bucketSet.has(i) ? algo : inCand ? `${algo}88` : `${dim}55`;
          ctx.beginPath();
          ctx.arc(cx + Math.cos(th) * R, cy - Math.sin(th) * R, bucketSet.has(i) && !s.done ? 3.5 : 2.5, 0, Math.PI * 2);
          ctx.fill();
        }
        // truth and answer
        const tt = sc.pts[sc.truth];
        ctx.strokeStyle = good;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(cx + Math.cos(tt) * R, cy - Math.sin(tt) * R, 7, 0, Math.PI * 2);
        ctx.stroke();
        ctx.lineWidth = 1;
        if (s.done && sc.answer !== null && sc.answer !== sc.truth) {
          const ta = sc.pts[sc.answer];
          ctx.strokeStyle = warn;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(cx + Math.cos(ta) * R, cy - Math.sin(ta) * R, 7, 0, Math.PI * 2);
          ctx.stroke();
          ctx.lineWidth = 1;
        }
        // the query
        ctx.strokeStyle = ink;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(sc.query) * R, cy - Math.sin(sc.query) * R);
        ctx.stroke();
        ctx.lineWidth = 1;
        const tx = 330;
        ctx.fillStyle = ink;
        ctx.fillText('white ray: the query', tx, 60);
        ctx.fillStyle = heur;
        ctx.fillText(`amber: this table's ${K} lines (${K} bits)`, tx, 78);
        ctx.fillStyle = algo;
        ctx.fillText('blue: the query’s bucket, joining the candidates', tx, 96);
        ctx.fillStyle = good;
        ctx.fillText('green ring: the true nearest neighbor', tx, 114);
        ctx.fillStyle = dim;
        ctx.fillText(`candidates so far: ${sc.cands.size} of ${N}`, tx, 150);
        ctx.fillText(`hash dots so far: ${Math.min(sc.table, L) * K}`, tx, 168);
        ctx.fillText(`brute force would cost ${N} dots`, tx, 186);
        ctx.fillText('in 32 dimensions the file measures:', tx, 222);
        ctx.fillText('k 10, L 20: recall 1.00, 137 candidates,', tx, 240);
        ctx.fillText('337 dots per query against 2,000', tx, 258);
        let line;
        if (s.done) {
          const hit = sc.answer === sc.truth;
          line = hit
            ? `found the true neighbor among ${sc.cands.size} candidates: ${L * K} hash dots + ${sc.cands.size} exact = ${L * K + sc.cands.size} against ${N} brute force`
            : `missed: the true neighbor never shared the query's sector in ${L} tables; ${sc.cands.size} candidates examined`;
          ctx.fillStyle = hit ? good : warn;
        } else {
          line = `table ${sc.table}: ${sc.lastBucket.length} points share the query's ${K}-bit code; near points share sides of random lines more often than far ones`;
          ctx.fillStyle = ink;
        }
        ctx.fillText(line, 12, H - 8);
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
          new query
        </button>
        <span className="viz-stat">{snap.line || 'hashing…'}</span>
      </div>
    </>
  );
}
