import { useEffect, useRef, useState } from 'react';
import { useCanvasLoop, isStill, holdTicks, mulberry32 } from './useCanvasLoop.js';

// Two acts. Act one: the machine: two quadratic curves (the factors,
// limbs as coefficients) get sampled at five posts: 0, 1, -1, 2, and
// the infinity chip: heights multiply post by post, five green
// product points appear, and the unique quartic threads them: five
// multiplications, not nine. Act two: the ladder at 729 digits: three
// log-scaled bars fall from the grid's 531,441 through Karatsuba's
// 59,049 to Toom's 15,625: counts this page asserts to the integer.
const W = 640;
const H = 300;
const SEED = 20260827;
const POST_TICKS = 26;
const THREAD_TICKS = 60;
const ACT1_HOLD = 50;
const BAR_TICKS = 55;
const ACT2_HOLD = 70;

const POSTS = [
  { x: 0, label: '0' },
  { x: 1, label: '1' },
  { x: -1, label: '−1' },
  { x: 2, label: '2' },
  { x: Infinity, label: '∞' },
];

function makeScene(seed) {
  const rand = mulberry32(seed);
  const A = [2 + Math.floor(rand() * 5), 1 + Math.floor(rand() * 4), 1 + Math.floor(rand() * 3)];
  const B = [1 + Math.floor(rand() * 5), 1 + Math.floor(rand() * 4), 1 + Math.floor(rand() * 3)];
  const evalP = (c, x) => (x === Infinity ? c[2] : c[0] + c[1] * x + c[2] * x * x);
  const samples = POSTS.map((p) => ({
    ...p,
    va: evalP(A, p.x),
    vb: evalP(B, p.x),
    prod: evalP(A, p.x) * evalP(B, p.x),
  }));
  // The product quartic's coefficients, for the threading curve.
  const C = [
    A[0] * B[0],
    A[0] * B[1] + A[1] * B[0],
    A[0] * B[2] + A[1] * B[1] + A[2] * B[0],
    A[1] * B[2] + A[2] * B[1],
    A[2] * B[2],
  ];
  return { A, B, C, samples };
}

const BARS = [
  { label: 'grid n²', value: 531441, color: 'warn' },
  { label: 'Karatsuba 3¹⁰', value: 59049, color: 'heur' },
  { label: 'Toom-3 5⁶', value: 15625, color: 'good' },
];

export default function ToomViz() {
  const canvasRef = useRef(null);
  const cycle = useRef(0);
  const statsRef = useRef({ line: '' });
  const [restart, setRestart] = useState(0);
  const [snap, setSnap] = useState({ line: '' });

  useEffect(() => {
    const id = setInterval(() => setSnap({ ...statsRef.current }), 400);
    return () => clearInterval(id);
  }, []);

  const ACT1_TOTAL = POSTS.length * POST_TICKS + THREAD_TICKS + ACT1_HOLD;
  const ACT2_TOTAL = BARS.length * BAR_TICKS + ACT2_HOLD;

  useCanvasLoop(
    canvasRef,
    {
      width: W,
      height: H,
      stepMs: 45,
      init: () => ({
        scene: makeScene(SEED + cycle.current * 911),
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
              scene: makeScene(SEED + cycle.current * 911),
              act: 0,
              tick: 0,
              rest: 0,
            });
          }
          return true;
        }
        s.tick += 1;
        if (s.tick >= (s.act === 0 ? ACT1_TOTAL : ACT2_TOTAL)) {
          // Hold the finished act for the full rest before the next
          // act begins: every burst of motion earns its two minutes.
          s.tick = (s.act === 0 ? ACT1_TOTAL : ACT2_TOTAL);
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
        const colors = {
          algo: css.getPropertyValue('--algo').trim() || '#5da2ff',
          heur: css.getPropertyValue('--heur').trim() || '#f0b94b',
          good: css.getPropertyValue('--path').trim() || '#62d98a',
          warn: css.getPropertyValue('--warn').trim() || '#e2606c',
          dim: css.getPropertyValue('--ink-dim').trim() || '#9aa5bd',
        };

        const done = s.act >= 2;
        const actIdx = done ? 1 : s.act;
        const tick = done ? ACT2_TOTAL - 1 : s.tick;

        if (actIdx === 0) {
          const sc = s.scene;
          const posts = Math.min(Math.floor(tick / POST_TICKS), POSTS.length);
          const threading = tick > POSTS.length * POST_TICKS;
          const thFrac = threading
            ? Math.min(1, (tick - POSTS.length * POST_TICKS) / THREAD_TICKS)
            : 0;

          // Coordinate frames: factor panel (top), product panel (bottom).
          const XX = (x) => 150 + x * 110; // x in [-1, 2] -> [40, 370]... plus inf chip
          const maxF = Math.max(...sc.samples.filter((p) => p.x !== Infinity).map((p) => Math.max(p.va, p.vb))) + 2;
          const YF = (v) => 128 - (v / maxF) * 86;
          const maxP = Math.max(...sc.samples.map((p) => p.prod)) + 4;
          const YP = (v) => 258 - (v / maxP) * 76;

          // The two factor curves.
          [
            [sc.A, colors.algo],
            [sc.B, '#8b95ad'],
          ].forEach(([c, col]) => {
            ctx.strokeStyle = col;
            ctx.lineWidth = 2;
            ctx.beginPath();
            for (let px = 0; px <= 100; px++) {
              const x = -1.15 + (px / 100) * 3.4;
              const v = c[0] + c[1] * x + c[2] * x * x;
              const X = XX(x);
              const Y = YF(Math.max(0, v));
              if (px === 0) ctx.moveTo(X, Y);
              else ctx.lineTo(X, Y);
            }
            ctx.stroke();
          });
          ctx.fillStyle = colors.dim;
          ctx.font = '11px ui-monospace, monospace';
          ctx.fillText(
            `A(x) = ${sc.A[0]}+${sc.A[1]}x+${sc.A[2]}x² · B(x) = ${sc.B[0]}+${sc.B[1]}x+${sc.B[2]}x²`,
            36,
            22,
          );

          // Posts and product points.
          for (let i = 0; i < posts; i++) {
            const p = sc.samples[i];
            if (p.x === Infinity) {
              ctx.strokeStyle = colors.heur;
              ctx.strokeRect(520, 46, 84, 22);
              ctx.fillStyle = colors.heur;
              ctx.fillText(`∞: ${sc.A[2]}·${sc.B[2]}=${p.prod}`, 526, 61);
            } else {
              const X = XX(p.x);
              ctx.strokeStyle = colors.heur;
              ctx.setLineDash([5, 4]);
              ctx.beginPath();
              ctx.moveTo(X, 40);
              ctx.lineTo(X, 132);
              ctx.stroke();
              ctx.setLineDash([]);
              [p.va, p.vb].forEach((v, j) => {
                ctx.fillStyle = j === 0 ? colors.algo : '#8b95ad';
                ctx.beginPath();
                ctx.arc(X, YF(v), 4, 0, Math.PI * 2);
                ctx.fill();
              });
              ctx.fillStyle = colors.heur;
              ctx.fillText(`${p.va}·${p.vb}=${p.prod}`, X - 24, 148);
            }
            // The product point below.
            const PX = p.x === Infinity ? 560 : XX(p.x);
            ctx.fillStyle = colors.good;
            ctx.beginPath();
            ctx.arc(PX, YP(p.prod), 4.5, 0, Math.PI * 2);
            ctx.fill();
          }

          // Thread the quartic through the product panel.
          if (threading) {
            ctx.strokeStyle = colors.good;
            ctx.lineWidth = 2;
            ctx.beginPath();
            for (let px = 0; px <= 100 * thFrac; px++) {
              const x = -1.15 + (px / 100) * 3.4;
              const v = sc.C.reduce((a, cc, i) => a + cc * x ** i, 0);
              const X = XX(x);
              const Y = YP(Math.max(0, Math.min(maxP, v)));
              if (px === 0) ctx.moveTo(X, Y);
              else ctx.lineTo(X, Y);
            }
            ctx.stroke();
            if (thFrac >= 1) {
              ctx.fillStyle = colors.good;
              ctx.fillText(
                `coefficients read off: [${sc.C.join(', ')}] = the five limbs of the product`,
                36,
                282,
              );
            }
          }

          let line;
          if (posts < POSTS.length) {
            line = `post ${posts + 1}/5 · heights multiply: one number times one number`;
            ctx.fillStyle = colors.heur;
          } else if (thFrac < 1) {
            line = 'five points pin the quartic: threading the unique product curve';
            ctx.fillStyle = colors.good;
          } else {
            line = '5 multiplications, not 9: the recursion takes the same road down';
            ctx.fillStyle = colors.good;
          }
          ctx.font = '12px ui-monospace, monospace';
          ctx.fillText(line, 14, H - 4);
          statsRef.current = { line };
        } else {
          // Act 2: the ladder bars, log scale.
          const grown = Math.min(Math.floor(tick / BAR_TICKS) + 1, BARS.length);
          const frac = Math.min(1, ((tick % BAR_TICKS) + 1) / (BAR_TICKS - 8));
          ctx.fillStyle = colors.dim;
          ctx.font = '11px ui-monospace, monospace';
          ctx.fillText('act 2 · the ladder at 729 digits: digit multiplications, log scale, asserted exact', 14, 20);
          const logMax = Math.log10(531441);
          BARS.forEach((b, i) => {
            if (i >= grown) return;
            const f = i === grown - 1 ? frac : 1;
            const wpx = (Math.log10(b.value) / logMax) * 520 * f;
            ctx.fillStyle = colors[b.color];
            ctx.fillRect(90, 62 + i * 62, wpx, 30);
            ctx.fillStyle = colors.dim;
            ctx.fillText(b.label, 90, 56 + i * 62);
            if (f >= 1) {
              ctx.fillStyle = colors[b.color];
              ctx.fillText(b.value.toLocaleString(), 98 + wpx, 82 + i * 62);
            }
          });
          const lineTxt =
            grown >= 3 && frac >= 1
              ? '34x under the grid, 3.8x under Karatsuba: 5^6, to the integer'
              : 'counting sub-multiplications: the only spend the recursion cannot forgive';
          ctx.fillStyle = grown >= 3 && frac >= 1 ? colors.good : colors.dim;
          ctx.font = '12px ui-monospace, monospace';
          ctx.fillText(lineTxt, 14, H - 12);
          statsRef.current = { line: lineTxt };
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
          new factors
        </button>
        <span className="viz-stat">
          {snap.line || 'planting the posts…'}
        </span>
      </div>
    </>
  );
}
