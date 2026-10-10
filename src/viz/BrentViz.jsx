import { useEffect, useRef, useState } from 'react';
import { useCanvasLoop, isStill, holdTicks, mulberry32 } from './useCanvasLoop.js';

// Brent's zeroin, one evaluation per tick, on one of three functions:
// cos x - x, the signed cube root, and e^x - 1 on a wide bracket. The
// function is drawn over the starting bracket, the current bracket
// [b, c] is shaded, the three points a, b, c are marked, and the step
// just taken is named and colored: blue for an inverse quadratic step,
// amber for a secant step, red for a bisection fallback. The bracket
// width per evaluation is drawn on a log scale beside it.
const W = 640;
const H = 300;
const SEED = 20261010;
const EPS = 2.220446049250313e-16;
const TOL = 1e-10;

const FUNCTIONS = [
  { name: 'cos x − x on [0, 1]', f: (x) => Math.cos(x) - x, a: 0, b: 1, root: 0.7390851332151607, span: 1 },
  { name: 'cbrt(x − 0.3) on [−1, 1]', f: (x) => Math.cbrt(x - 0.3), a: -1, b: 1, root: 0.3, span: 2 },
  { name: 'e^x − 1 on [−40, 60]', f: (x) => Math.exp(x) - 1, a: -40, b: 60, root: 0, span: 100 },
];

// One zeroin iteration on a mutable state; returns false when converged.
export function brentStep(st) {
  const f = st.f;
  if ((st.fb > 0) === (st.fc > 0)) {
    st.c = st.a;
    st.fc = st.fa;
    st.d = st.e = st.b - st.a;
  }
  if (Math.abs(st.fc) < Math.abs(st.fb)) {
    st.a = st.b;
    st.fa = st.fb;
    st.b = st.c;
    st.fb = st.fc;
    st.c = st.a;
    st.fc = st.fa;
  }
  const tol1 = 2 * EPS * Math.abs(st.b) + 0.5 * TOL;
  const m = 0.5 * (st.c - st.b);
  st.width = Math.abs(st.c - st.b);
  if (Math.abs(m) <= tol1 || st.fb === 0) return false;
  let kind;
  if (Math.abs(st.e) >= tol1 && Math.abs(st.fa) > Math.abs(st.fb)) {
    const s = st.fb / st.fa;
    let p;
    let q;
    let proposed;
    if (st.a === st.c) {
      p = 2 * m * s;
      q = 1 - s;
      proposed = 'secant';
    } else {
      q = st.fa / st.fc;
      const r = st.fb / st.fc;
      p = s * (2 * m * q * (q - r) - (st.b - st.a) * (r - 1));
      q = (q - 1) * (r - 1) * (s - 1);
      proposed = 'inverse quadratic';
    }
    if (p > 0) q = -q;
    else p = -p;
    if (2 * p < Math.min(3 * m * q - Math.abs(tol1 * q), Math.abs(st.e * q))) {
      st.e = st.d;
      st.d = p / q;
      kind = proposed;
    } else {
      st.d = st.e = m;
      kind = 'bisection';
    }
  } else {
    st.d = st.e = m;
    kind = 'bisection';
  }
  st.a = st.b;
  st.fa = st.fb;
  if (Math.abs(st.d) > tol1) st.b += st.d;
  else st.b += m > 0 ? tol1 : -tol1;
  st.fb = f(st.b);
  st.evals += 1;
  st.kind = kind;
  st.kinds.push(kind);
  return true;
}

export function makeScene(seed) {
  const rand = mulberry32(seed);
  const pick = FUNCTIONS[seed % FUNCTIONS.length];
  // a small seeded nudge of the bracket ends keeps the run deterministic
  // per cycle but different across cycles; the sign change is preserved
  const nudge = rand() * 0.05 * pick.span;
  const a = pick.a + nudge;
  const b = pick.b - rand() * 0.05 * pick.span;
  const st = { f: pick.f, a, b, fa: pick.f(a), fb: pick.f(b), evals: 2, kinds: [], kind: 'start', width: Math.abs(b - a) };
  st.c = st.a;
  st.fc = st.fa;
  st.d = st.e = st.b - st.a;
  return { pick, st, a0: a, b0: b, widths: [Math.abs(b - a)], tick: 0, done: false, ok: true, last: `${pick.name}: two evaluations at the bracket ends` };
}

export function sceneTick(sc) {
  if (sc.done) return true;
  const st = sc.st;
  const more = brentStep(st);
  // the bracket after a step: [b, c] if they straddle the root, else [b, a]
  // (a is the previous best, on the far side), which is what the next
  // iteration's first fix-up will use
  const cc = (st.fb > 0) === (st.fc > 0) ? st.a : st.c;
  sc.lo = Math.min(st.b, cc);
  sc.hi = Math.max(st.b, cc);
  sc.widths.push(sc.hi - sc.lo);
  sc.ok = sc.lo - 1e-9 <= sc.pick.root && sc.pick.root <= sc.hi + 1e-9;
  if (!more) {
    sc.done = true;
    sc.last = `converged after ${st.evals} evaluations: x = ${st.b.toPrecision(10)} (true root ${sc.pick.root.toPrecision(10)}); ${st.kinds.filter((k) => k === 'inverse quadratic').length} parabola, ${st.kinds.filter((k) => k === 'secant').length} secant, ${st.kinds.filter((k) => k === 'bisection').length} bisection steps`;
    return true;
  }
  sc.last = `evaluation ${st.evals}: ${st.kind} step to x = ${st.b.toPrecision(6)}; bracket width ${(sc.hi - sc.lo).toExponential(2)}`;
  sc.tick += 1;
  if (sc.tick > 400) {
    sc.done = true;
    return true;
  }
  return false;
}

export default function BrentViz() {
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
      stepMs: 700,
      init: () => ({ scene: makeScene(SEED + cycle.current), done: false, rest: 0, stopAtRest: isStill() }),
      tick: (s) => {
        if (s.done) {
          if (s.stopAtRest) return false;
          s.rest += 1;
          if (s.rest > holdTicks(s) * 2) {
            cycle.current += 1;
            Object.assign(s, { scene: makeScene(SEED + cycle.current), done: false, rest: 0 });
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
        const st = sc.st;
        const colorOf = { 'inverse quadratic': algo, secant: heur, bisection: warn, start: dim };
        ctx.font = '11px ui-monospace, monospace';
        ctx.fillStyle = dim;
        ctx.fillText(`${sc.pick.name}, one evaluation per tick; blue: parabola step, amber: secant, red: bisection fallback`, 12, 18);
        // left: the function over the starting bracket, y clipped to a symmetric range
        const x0 = 30;
        const y0 = 40;
        const pw = 380;
        const ph = 200;
        const X = (x) => x0 + ((x - sc.a0) / (sc.b0 - sc.a0)) * pw;
        const samples = [];
        let ymax = 0;
        for (let i = 0; i <= 120; i += 1) {
          const x = sc.a0 + ((sc.b0 - sc.a0) * i) / 120;
          const y = sc.pick.f(x);
          samples.push([x, y]);
          ymax = Math.max(ymax, Math.min(Math.abs(y), 3));
        }
        const Y = (y) => y0 + ph / 2 - (Math.max(-ymax, Math.min(ymax, y)) / ymax) * (ph / 2);
        ctx.fillStyle = `${good}22`;
        const lo = sc.lo ?? Math.min(st.b, st.c);
        const hi = sc.hi ?? Math.max(st.b, st.c);
        ctx.fillRect(X(lo), y0, Math.max(1, X(hi) - X(lo)), ph);
        ctx.strokeStyle = `${dim}66`;
        ctx.strokeRect(x0, y0, pw, ph);
        ctx.beginPath();
        ctx.moveTo(x0, Y(0));
        ctx.lineTo(x0 + pw, Y(0));
        ctx.stroke();
        ctx.strokeStyle = ink;
        ctx.beginPath();
        samples.forEach(([x, y], i) => {
          if (i === 0) ctx.moveTo(X(x), Y(y));
          else ctx.lineTo(X(x), Y(y));
        });
        ctx.stroke();
        const mark = (x, y, color, label, r) => {
          ctx.beginPath();
          ctx.arc(X(x), Y(y), r, 0, Math.PI * 2);
          ctx.fillStyle = color;
          ctx.fill();
          ctx.fillStyle = color;
          ctx.fillText(label, X(x) + 6, Y(y) - 6);
        };
        mark(st.c, st.fc, dim, 'c', 4);
        mark(st.a, st.fa, dim, 'a', 3);
        mark(st.b, st.fb, colorOf[st.kind] || ink, 'b', 5);
        ctx.strokeStyle = good;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(X(sc.pick.root), y0);
        ctx.lineTo(X(sc.pick.root), y0 + ph);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = dim;
        ctx.fillText('green: the bracket [b, c], and the true root (dashed); |f| clipped to 3', x0, y0 + ph + 14);
        // right: bracket width per evaluation, log scale
        const bx = 440;
        const by = 240;
        const bw = 180;
        const bh = 190;
        ctx.strokeStyle = `${dim}66`;
        ctx.strokeRect(bx, by - bh, bw, bh);
        ctx.fillStyle = dim;
        ctx.fillText('bracket width (log)', bx, by - bh - 6);
        const wmax = sc.widths[0];
        const Yw = (w) => by - ((Math.log10(Math.max(w, 1e-12)) - Math.log10(1e-12)) / (Math.log10(wmax) - Math.log10(1e-12))) * bh;
        const n = Math.max(sc.widths.length, 2);
        const Xw = (i) => bx + (i / Math.max(n - 1, 40)) * bw;
        ctx.strokeStyle = algo;
        ctx.beginPath();
        sc.widths.forEach((w, i) => {
          if (i === 0) ctx.moveTo(Xw(i), Yw(w));
          else ctx.lineTo(Xw(i), Yw(w));
        });
        ctx.stroke();
        st.kinds.forEach((k, i) => {
          ctx.fillStyle = colorOf[k];
          ctx.fillRect(Xw(i + 1) - 2, Yw(sc.widths[i + 1]) - 2, 4, 4);
        });
        ctx.fillStyle = dim;
        ctx.fillText('bisection alone: 1/2 per step', bx, by + 14);
        ctx.fillStyle = sc.ok ? good : warn;
        ctx.fillText(sc.ok ? 'bracket holds the root' : 'ROOT LOST', bx, by + 28);
        ctx.fillStyle = ink;
        ctx.fillText(`${st.evals} evaluations`, bx + 110, by + 28);
        let line;
        if (s.done) {
          line = sc.last;
          ctx.fillStyle = good;
        } else {
          line = sc.last;
          ctx.fillStyle = ink;
        }
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
          next function
        </button>
        <span className="viz-stat">{snap.line || 'bracketing…'}</span>
      </div>
    </>
  );
}
