import { useEffect, useRef, useState } from 'react';
import { useCanvasLoop, isStill, holdTicks, mulberry32 } from './useCanvasLoop.js';

// Two acts of one polynomial. Act one: the secret sits at x = 0 on
// a hidden parabola over a small prime field; five share points
// are dealt; then three of them are chosen, the unique parabola
// through them draws itself, and it lands on the secret exactly.
// Act two: the same drawing with only TWO shares: a family of
// parabolas cycles through the two points, and each one lands on
// a DIFFERENT value at x = 0: every candidate secret exactly as
// consistent as the truth: perfect secrecy, animated as a fan.
const W = 640;
const H = 300;
const SEED = 20260827;
const P = 97;
const END_HOLD = 70;

function mod(a) {
  return ((a % P) + P) % P;
}

function modinv(a) {
  let r = 1;
  let b = mod(a);
  let e = P - 2;
  while (e) {
    if (e & 1) r = (r * b) % P;
    b = (b * b) % P;
    e >>= 1;
  }
  return r;
}

export function evalPoly(coeffs, x) {
  let acc = 0;
  for (let i = coeffs.length - 1; i >= 0; i--) acc = mod(acc * x + coeffs[i]);
  return acc;
}

export function lagrangeAt0(pts) {
  let total = 0;
  for (let i = 0; i < pts.length; i++) {
    let num = 1;
    let den = 1;
    for (let j = 0; j < pts.length; j++) {
      if (i === j) continue;
      num = mod(num * -pts[j][0]);
      den = mod(den * (pts[i][0] - pts[j][0]));
    }
    total = mod(total + pts[i][1] * num * modinv(den));
  }
  return total;
}

// Fit the degree-2 polynomial through three points (small field).
export function fitThree(pts) {
  const [[x0, y0], [x1, y1], [x2, y2]] = pts;
  // Solve via Lagrange basis to coefficients: evaluate basis polys.
  // Simpler: evaluate at 0,1,2... we only need to EVALUATE the fit,
  // so return an evaluator.
  return (x) => {
    let total = 0;
    for (const [i, [xi, yi]] of pts.entries()) {
      let num = 1;
      let den = 1;
      for (const [j, [xj]] of pts.entries()) {
        if (i === j) continue;
        num = mod(num * (x - xj));
        den = mod(den * (xi - xj));
      }
      total = mod(total + yi * num * modinv(den));
    }
    return total;
  };
}

export function makeScene(seed) {
  const rand = mulberry32(seed);
  const secret = 5 + Math.floor(rand() * (P - 10));
  const coeffs = [secret, 1 + Math.floor(rand() * (P - 1)), 1 + Math.floor(rand() * (P - 1))];
  const shares = [];
  for (let x = 1; x <= 5; x++) shares.push([x * 3, evalPoly(coeffs, x * 3)]);
  const chosen = [0, 2, 4].map((i) => shares[i]);
  const rec = lagrangeAt0(chosen);
  // Act 2: candidate parabolas through shares[0], shares[2] and each
  // candidate secret s': one per tick, cycling.
  const two = [shares[0], shares[2]];
  const candidates = [];
  for (let t = 0; t < 24; t++) {
    const sPrime = Math.floor((t / 24) * P);
    const fit = fitThree([[0, sPrime], two[0], two[1]]);
    candidates.push({ sPrime, curve: [0, 3, 6, 9, 12, 15].map((x) => [x, fit(x)]) });
  }
  return { secret, coeffs, shares, chosen, rec, two, candidates };
}

const X0 = 70;
const XW = 34;
const px = (x) => X0 + x * XW;
const py = (y) => 250 - (y / P) * 200;

export default function ShamirViz() {
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
        const len = s.act === 0 ? 200 + END_HOLD : s.scene.candidates.length * 12 + END_HOLD;
        if (s.tick >= len) {
          s.tick = 0;
          s.act += 1;
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

        const done = s.act >= 2;
        const actIdx = done ? 1 : s.act;
        ctx.fillStyle = dim;
        ctx.font = '11px ui-monospace, monospace';

        // Axes.
        ctx.strokeStyle = 'rgba(154,165,189,0.35)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(px(0), 40);
        ctx.lineTo(px(0), 258);
        ctx.moveTo(40, 250);
        ctx.lineTo(610, 250);
        ctx.stroke();
        ctx.fillStyle = dim;
        ctx.font = '10px ui-monospace, monospace';
        ctx.fillText('x = 0: where the secret lives', px(0) - 20, 272);

        const drawShares = (hot) => {
          sc.shares.forEach(([x, y], i) => {
            const isChosen = hot && sc.chosen.some(([cx]) => cx === x);
            ctx.fillStyle = isChosen ? heur : dim;
            ctx.beginPath();
            ctx.arc(px(x / 3), py(y), isChosen ? 6 : 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.font = '9px ui-monospace, monospace';
            ctx.fillText(`s${i + 1}`, px(x / 3) + 8, py(y) - 4);
          });
        };

        if (actIdx === 0) {
          const t = done ? 200 : Math.min(s.tick, 200);
          ctx.fillText(`act 1 · a 3-of-5 split over GF(${P}): three shares find the one parabola home`, 14, 20);
          drawShares(t > 60);
          // Reveal the polynomial as field dots, right to left toward
          // x = 0 (over GF(97) the curve wraps: dots are the honest
          // picture, not a smooth parabola).
          if (t > 90) {
            const frac = Math.min(1, (t - 90) / 80);
            const nDots = Math.floor(frac * 16);
            for (let d = 0; d < nDots; d++) {
              const fx = 15 - d; // in field units 0..15 (shares at 3,6,9,12,15)
              const yv = evalPoly(sc.coeffs, fx);
              ctx.fillStyle = algo;
              ctx.globalAlpha = 0.8;
              ctx.beginPath();
              ctx.arc(px(fx / 3), py(yv), 3, 0, Math.PI * 2);
              ctx.fill();
              ctx.globalAlpha = 1;
            }
          }
          if (t > 170 || done) {
            ctx.fillStyle = good;
            ctx.beginPath();
            ctx.arc(px(0), py(sc.secret), 8, 0, Math.PI * 2);
            ctx.fill();
            ctx.font = '11px ui-monospace, monospace';
            ctx.fillText(`secret = ${sc.rec}`, px(0) + 12, py(sc.secret) + 4);
          }

          let line;
          if (done || t >= 200) {
            line = `Lagrange through the three amber shares lands at f(0) = ${sc.rec}: exact, every quorum`;
            ctx.fillStyle = good;
          } else if (t > 90) {
            line = 'the unique degree-2 polynomial through three points walks home to x = 0…';
            ctx.fillStyle = algo;
          } else if (t > 60) {
            line = 'any three of the five shares form a quorum: these three volunteer';
            ctx.fillStyle = heur;
          } else {
            line = 'five shares dealt: points on a hidden parabola';
            ctx.fillStyle = ink;
          }
          ctx.font = '12px ui-monospace, monospace';
          ctx.fillText(line, 14, H - 12);
          statsRef.current = { line };
        } else {
          const ci = done ? sc.candidates.length - 1 : Math.min(Math.floor(s.tick / 12), sc.candidates.length - 1);
          ctx.fillText('act 2 · only TWO shares: every candidate secret has exactly one parabola: all equally true', 14, 20);
          // The two known shares.
          sc.two.forEach(([x, y]) => {
            ctx.fillStyle = heur;
            ctx.beginPath();
            ctx.arc(px(x / 3), py(y), 6, 0, Math.PI * 2);
            ctx.fill();
          });
          // Ghost fits seen so far: dots for the current candidate's
          // polynomial, and every candidate's landing at x = 0.
          for (let k = 0; k <= ci; k++) {
            const c = sc.candidates[k];
            const isNow = k === ci && !done;
            if (isNow) {
              ctx.fillStyle = warn;
              for (const [x, y] of c.curve) {
                ctx.globalAlpha = 0.85;
                ctx.beginPath();
                ctx.arc(px(x / 3), py(y), 3, 0, Math.PI * 2);
                ctx.fill();
                ctx.globalAlpha = 1;
              }
            }
            ctx.fillStyle = isNow ? warn : 'rgba(226,96,108,0.4)';
            ctx.beginPath();
            ctx.arc(px(0), py(c.sPrime), isNow ? 5 : 2.5, 0, Math.PI * 2);
            ctx.fill();
          }

          let line;
          if (done || ci >= sc.candidates.length - 1) {
            line = `the x = 0 axis fills uniformly: with k-1 shares, the true secret is one red dot among ${P}: exhausted flat`;
            ctx.fillStyle = warn;
          } else {
            line = `candidate secret ${sc.candidates[ci].sPrime}: one parabola fits it perfectly through both shares`;
            ctx.fillStyle = ink;
          }
          ctx.font = '12px ui-monospace, monospace';
          ctx.fillText(line, 14, H - 12);
          statsRef.current = {
            line: done
              ? 'k points pin the polynomial: k-1 points pin nothing: the cliff is vertical'
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
          new secret
        </button>
        <span className="viz-stat">
          {snap.line || 'dealing the shares…'}
        </span>
      </div>
    </>
  );
}
