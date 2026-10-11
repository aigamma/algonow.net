import { useEffect, useRef, useState } from 'react';
import { useCanvasLoop, isStill, holdTicks, mulberry32 } from './useCanvasLoop.js';

// Pool-based active learning on two seeded Gaussian classes. Left: the pool,
// the labels bought so far (green), the current logistic boundary (blue), and
// the least-confidence query about to be asked (amber ring). Right: test
// accuracy against labels for least confidence (blue) and for random sampling
// (dim) run on the same pool, seeds, and test set. Checked every tick: the
// query is the pool's least confident point by an independent margin scan,
// the labeled set grows by exactly one, and probabilities and accuracy stay
// finite inside [0, 1].
const W = 640;
const H = 300;
const SEED = 20261010;
const BUDGET = 30;

function gauss(rand) {
  const u = Math.max(rand(), 1e-12);
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rand());
}

function solve3(A, b) {
  const M = A.map((r, i) => [...r, b[i]]);
  for (let c = 0; c < 3; c += 1) {
    let p = c;
    for (let r = c + 1; r < 3; r += 1) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    [M[c], M[p]] = [M[p], M[c]];
    for (let j = c; j < 4; j += 1) M[c][j] /= M[c][c] || 1e-12;
    for (let r = 0; r < 3; r += 1) {
      if (r !== c) {
        const f = M[r][c];
        for (let j = c; j < 4; j += 1) M[r][j] -= f * M[c][j];
      }
    }
  }
  return [M[0][3], M[1][3], M[2][3]];
}

const sig = (z) => 1 / (1 + Math.exp(-z));
const prob = (w, p) => sig(w[0] + w[1] * p[0] + w[2] * p[1]);

function fit(X, y) {
  let w = [0, 0, 0];
  for (let it = 0; it < 12; it += 1) {
    const g = w.map((v) => 0.05 * v);
    const Hm = [[0.05, 0, 0], [0, 0.05, 0], [0, 0, 0.05]];
    X.forEach((p, i) => {
      const x = [1, p[0], p[1]];
      const q = prob(w, p);
      const r = q - y[i];
      const s = q * (1 - q);
      for (let a = 0; a < 3; a += 1) {
        g[a] += r * x[a];
        for (let b = 0; b < 3; b += 1) Hm[a][b] += s * x[a] * x[b];
      }
    });
    const step = solve3(Hm, g);
    w = w.map((v, i) => v - step[i]);
    if (Math.max(...step.map(Math.abs)) < 1e-7) break;
  }
  return w;
}

const accuracy = (w, X, y) => X.reduce((s, p, i) => s + ((prob(w, p) >= 0.5) === (y[i] === 1) ? 1 : 0), 0) / X.length;

export function makeScene(seed) {
  const rand = mulberry32(seed);
  const sep = 2.6 + rand() * 0.8;
  const mk = (n) => {
    const X = [];
    const y = [];
    for (let c = 0; c < 2; c += 1) for (let i = 0; i < n; i += 1) {
      X.push([(c ? sep / 2 : -sep / 2) + gauss(rand), gauss(rand)]);
      y.push(c);
    }
    return { X, y };
  };
  const pool = mk(110);
  const test = mk(150);
  const s0 = Math.floor(rand() * 110);
  const s1 = 110 + Math.floor(rand() * 110);
  const strat = (name) => ({ name, L: [s0, s1], U: pool.X.map((_, i) => i).filter((i) => i !== s0 && i !== s1), w: null, curve: [] });
  return { rand, sep, pool, test, unc: strat('unc'), rnd: strat('rnd'), round: 0, next: -1, checks: 0, ok: true, done: false, last: `pool of ${pool.X.length}, separation ${sep.toFixed(2)}; two seed labels; buying one label per tick` };
}

function step(sc, st, pick) {
  st.w = fit(st.L.map((i) => sc.pool.X[i]), st.L.map((i) => sc.pool.y[i]));
  const a = accuracy(st.w, sc.test.X, sc.test.y);
  st.curve.push(a);
  if (!(a >= 0 && a <= 1)) sc.ok = false;
  const before = st.L.length + st.U.length;
  const k = pick(st);
  st.L.push(st.U[k]);
  st.U.splice(k, 1);
  if (st.L.length + st.U.length !== before || st.L.length !== st.curve.length + 2) sc.ok = false;
}

export function sceneTick(sc) {
  if (sc.done) return true;
  if (sc.round >= BUDGET) {
    for (const st of [sc.unc, sc.rnd]) {
      st.w = fit(st.L.map((i) => sc.pool.X[i]), st.L.map((i) => sc.pool.y[i]));
      st.curve.push(accuracy(st.w, sc.test.X, sc.test.y));
    }
    sc.done = true;
    sc.next = -1;
    const u = sc.unc.curve;
    const r = sc.rnd.curve;
    const mean = (c) => c.reduce((s, v) => s + v, 0) / c.length;
    sc.last = `done: ${sc.unc.L.length} labels each; least confidence ${u[u.length - 1].toFixed(3)} (curve mean ${mean(u).toFixed(3)}), random ${r[r.length - 1].toFixed(3)} (${mean(r).toFixed(3)}); invariants held on ${sc.checks} checks: ${sc.ok ? 'yes' : 'NO'}`;
    return true;
  }
  step(sc, sc.unc, (st) => {
    let best = -1;
    let k = 0;
    const ps = st.U.map((i) => prob(st.w, sc.pool.X[i]));
    ps.forEach((p, j) => {
      if (!(Number.isFinite(p) && p >= 0 && p <= 1)) sc.ok = false;
      const u = 1 - Math.max(p, 1 - p);
      if (u > best) { best = u; k = j; }
    });
    // independent check: no pool point has a smaller margin |2p - 1| than the query
    const minMargin = Math.min(...ps.map((p) => Math.abs(2 * p - 1)));
    if (Math.abs(2 * ps[k] - 1) > minMargin + 1e-9) sc.ok = false;
    sc.checks += 1;
    sc.next = st.U[k];
    sc.nextP = ps[k];
    return k;
  });
  step(sc, sc.rnd, (st) => Math.floor(sc.rand() * st.U.length));
  sc.round += 1;
  const u = sc.unc.curve[sc.unc.curve.length - 1];
  const r = sc.rnd.curve[sc.rnd.curve.length - 1];
  sc.last = `label ${sc.unc.L.length}: least confidence asked about a point at p = ${sc.nextP.toFixed(3)}; accuracy ${u.toFixed(3)} against random ${r.toFixed(3)}`;
  return false;
}

export default function ActiveLearningViz() {
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
      stepMs: 420,
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
        ctx.font = '11px ui-monospace, monospace';
        ctx.fillStyle = dim;
        ctx.fillText('left: pool, bought labels (green), the logistic boundary (blue), the next least-confident query (amber)', 12, 18);
        const cx = 160;
        const cy = 150;
        const sx = (x) => cx + x * 30;
        const sy = (y) => cy - y * 30;
        const labeled = new Set(sc.unc.L);
        sc.pool.X.forEach((p, i) => {
          ctx.beginPath();
          ctx.arc(sx(p[0]), sy(p[1]), 2.5, 0, 2 * Math.PI);
          if (labeled.has(i)) {
            ctx.fillStyle = good;
            ctx.fill();
          } else if (sc.pool.y[i]) {
            ctx.fillStyle = `${dim}aa`;
            ctx.fill();
          } else {
            ctx.strokeStyle = `${dim}aa`;
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        });
        if (sc.next >= 0) {
          const p = sc.pool.X[sc.next];
          ctx.strokeStyle = heur;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(sx(p[0]), sy(p[1]), 7, 0, 2 * Math.PI);
          ctx.stroke();
        }
        const w = sc.unc.w;
        if (w && Math.abs(w[2]) > 1e-9) {
          ctx.strokeStyle = algo;
          ctx.lineWidth = 2;
          ctx.beginPath();
          const yAt = (x) => -(w[0] + w[1] * x) / w[2];
          ctx.moveTo(sx(-4.5), sy(yAt(-4.5)));
          ctx.lineTo(sx(4.5), sy(yAt(4.5)));
          ctx.stroke();
        }
        ctx.fillStyle = dim;
        ctx.fillText(`${sc.unc.L.length} labels of ${sc.pool.X.length}`, 20, 262);
        // right: learning curves
        const rx = 350;
        const rw = 270;
        const top = 48;
        const bot = 232;
        const X = (n) => rx + ((n - 2) / BUDGET) * rw;
        const Y = (a) => bot - ((a - 0.5) / 0.5) * (bot - top);
        ctx.strokeStyle = `${dim}66`;
        ctx.beginPath();
        ctx.moveTo(rx, bot);
        ctx.lineTo(rx + rw, bot);
        ctx.moveTo(rx, top);
        ctx.lineTo(rx, bot);
        ctx.stroke();
        const draw = (curve, color) => {
          ctx.strokeStyle = color;
          ctx.lineWidth = 2;
          ctx.beginPath();
          curve.forEach((a, i) => (i ? ctx.lineTo(X(i + 2), Y(a)) : ctx.moveTo(X(2), Y(a))));
          ctx.stroke();
        };
        draw(sc.rnd.curve, dim);
        draw(sc.unc.curve, algo);
        ctx.fillStyle = dim;
        ctx.fillText('test accuracy vs labels', rx, 36);
        [0.5, 0.75, 1.0].forEach((a) => ctx.fillText(a.toFixed(2), rx - 30, Y(a) + 3));
        ctx.fillText('2', rx - 3, bot + 13);
        ctx.fillText(String(BUDGET + 2), rx + rw - 10, bot + 13);
        if (sc.unc.curve.length) {
          ctx.fillStyle = algo;
          ctx.fillText(`least confidence ${sc.unc.curve[sc.unc.curve.length - 1].toFixed(3)}`, rx + 8, top + 12);
          ctx.fillStyle = dim;
          ctx.fillText(`random ${sc.rnd.curve[sc.rnd.curve.length - 1].toFixed(3)}`, rx + 8, top + 26);
        }
        ctx.fillStyle = sc.ok ? good : warn;
        ctx.fillText(sc.ok ? 'invariants: query is the pool argmax (margin scan agrees); one label per round' : 'INVARIANT BROKEN', rx, 262);
        const line = sc.last;
        ctx.fillStyle = s.done ? (sc.ok ? good : warn) : ink;
        ctx.fillText(line.length > 96 ? `${line.slice(0, 95)}…` : line, 12, H - 6);
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
          new pool
        </button>
        <span className="viz-stat">{snap.line || 'training…'}</span>
      </div>
    </>
  );
}
