import { useEffect, useRef, useState } from 'react';
import { useCanvasLoop, isStill, holdTicks, mulberry32 } from './useCanvasLoop.js';

// Two acts of one casino. Act one: three Beta posteriors sharpen
// live: each round one draw per posterior competes (dots on the
// axis), the winning arm gets the pull, win nudges alpha, loss
// nudges beta: watch doubt decay into commitment. Act two: the
// regret race: four policies on the same seeded instances, the
// cumulative-regret curves drawn as they grow: greedy's ramp,
// epsilon's steady slope, and the bending pair.
const W = 640;
const H = 300;
const SEED = 20260829;
const END_HOLD = 70;
const MUS = [0.45, 0.5, 0.55];
const ROUNDS = 90;

export function makeGauss(rand) {
  return () => {
    const u = Math.max(rand(), 1e-12);
    const v = rand();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };
}

export function makeGamma(rand, gauss) {
  const gamma = (a) => {
    if (a < 1) {
      const u = Math.max(rand(), 1e-12);
      return gamma(a + 1) * Math.pow(u, 1 / a);
    }
    const d = a - 1 / 3;
    const c = 1 / Math.sqrt(9 * d);
    for (;;) {
      const x = gauss();
      const v = (1 + c * x) ** 3;
      if (v <= 0) continue;
      const u = rand();
      if (Math.log(Math.max(u, 1e-12)) < 0.5 * x * x + d - d * v + d * Math.log(v)) return d * v;
    }
  };
  return gamma;
}

export function betaSampler(rand) {
  const gauss = makeGauss(rand);
  const gamma = makeGamma(rand, gauss);
  return (a, b) => {
    const x = gamma(a);
    const y = gamma(b);
    return x / (x + y);
  };
}

export function betaPdfGrid(a, b, n = 60) {
  // normalized to max 1 for drawing
  const ys = [];
  let mx = 0;
  for (let i = 0; i <= n; i++) {
    const x = Math.max(1e-6, Math.min(1 - 1e-6, i / n));
    const ly = (a - 1) * Math.log(x) + (b - 1) * Math.log(1 - x);
    ys.push(ly);
    if (i === 0 || ly > mx) mx = ly;
  }
  return ys.map((ly) => Math.exp(ly - mx));
}

export function makeAct1(rand) {
  const beta = betaSampler(rand);
  const k = 3;
  const a = [1, 1, 1];
  const b = [1, 1, 1];
  const wins = [0, 0, 0];
  const losses = [0, 0, 0];
  const rounds = [];
  for (let t = 0; t < ROUNDS; t++) {
    const draws = [0, 1, 2].map((i) => beta(a[i], b[i]));
    let best = 0;
    for (let i = 1; i < k; i++) if (draws[i] > draws[best]) best = i;
    const r = rand() < MUS[best] ? 1 : 0;
    a[best] += r;
    b[best] += 1 - r;
    wins[best] += r;
    losses[best] += 1 - r;
    rounds.push({ draws, chosen: best, reward: r, a: [...a], b: [...b] });
  }
  return { rounds, wins: [...wins], losses: [...losses], a: [...a], b: [...b] };
}

export function makeAct2(rand) {
  const T = 2000;
  // 10-run mean: greedy's per-run variance is enormous (that IS its
  // character: sometimes it locks the best arm and pays nothing),
  // so single runs would draw a misleading picture either way.
  const AVG = 10;
  const best = Math.max(...MUS);
  const curves = { greedy: new Array(T).fill(0), eps: new Array(T).fill(0), ucb: new Array(T).fill(0), ts: new Array(T).fill(0) };
  for (let run = 0; run < AVG; run++) {
    const beta = betaSampler(rand);
    // thompson
    let a = [1, 1, 1];
    let b = [1, 1, 1];
    let reg = 0;
    for (let t = 0; t < T; t++) {
      const d = [0, 1, 2].map((i) => beta(a[i], b[i]));
      let i = 0;
      for (let j = 1; j < 3; j++) if (d[j] > d[i]) i = j;
      const r = rand() < MUS[i] ? 1 : 0;
      a[i] += r;
      b[i] += 1 - r;
      reg += best - MUS[i];
      curves.ts[t] += reg / AVG;
    }
    // the three frequentists share one template
    for (const name of ['greedy', 'eps', 'ucb']) {
      const n = [0, 0, 0];
      const s = [0, 0, 0];
      reg = 0;
      for (let t = 0; t < T; t++) {
        let i;
        if (t < 3) i = t;
        else if (name === 'eps' && rand() < 0.1) i = Math.floor(rand() * 3);
        else if (name === 'ucb') {
          i = 0;
          let bv = -1;
          for (let j = 0; j < 3; j++) {
            const v = s[j] / n[j] + Math.sqrt((2 * Math.log(t + 1)) / n[j]);
            if (v > bv) {
              bv = v;
              i = j;
            }
          }
        } else {
          i = 0;
          for (let j = 1; j < 3; j++) if (s[j] / n[j] > s[i] / n[i]) i = j;
        }
        const r = rand() < MUS[i] ? 1 : 0;
        n[i] += 1;
        s[i] += r;
        reg += best - MUS[i];
        curves[name][t] += reg / AVG;
      }
    }
  }
  return curves;
}

export function makeScene(seed) {
  const rand = mulberry32(seed);
  return { act1: makeAct1(rand), act2: makeAct2(rand) };
}

export default function ThompsonViz() {
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
      stepMs: 60,
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
        const len = s.act === 0 ? ROUNDS * 3 + END_HOLD : 200 + END_HOLD;
        if (s.tick >= len) {
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
        const COLS = [warn, heur, good];

        const done = s.act >= 2;
        const actIdx = done ? 1 : s.act;
        ctx.fillStyle = dim;
        ctx.font = '11px ui-monospace, monospace';

        if (actIdx === 0) {
          const t = done ? ROUNDS * 3 : Math.min(s.tick, ROUNDS * 3);
          const round = Math.min(ROUNDS - 1, Math.floor(t / 3));
          const st = sc.act1.rounds[round];
          ctx.fillText(`act 1 · round ${round + 1}: draw one world per posterior, play its winner (arms pay 0.45 / 0.50 / 0.55)`, 14, 20);
          [0, 1, 2].map((i) => {
            const x0 = 30 + i * 205;
            const wPx = 180;
            const grid = betaPdfGrid(st.a[i], st.b[i]);
            ctx.strokeStyle = COLS[i];
            ctx.lineWidth = 1.6;
            ctx.beginPath();
            grid.forEach((y, gi) => {
              const px = x0 + (gi / (grid.length - 1)) * wPx;
              const py = 190 - y * 120;
              if (gi === 0) ctx.moveTo(px, py);
              else ctx.lineTo(px, py);
            });
            ctx.stroke();
            // the round's draw
            ctx.fillStyle = COLS[i];
            ctx.beginPath();
            ctx.arc(x0 + st.draws[i] * wPx, 196, st.chosen === i ? 5 : 3, 0, Math.PI * 2);
            ctx.fill();
            if (st.chosen === i) {
              ctx.strokeStyle = st.reward ? good : warn;
              ctx.lineWidth = 1.6;
              ctx.beginPath();
              ctx.arc(x0 + st.draws[i] * wPx, 196, 8, 0, Math.PI * 2);
              ctx.stroke();
            }
            // true rate marker
            ctx.strokeStyle = `${COLS[i]}88`;
            ctx.setLineDash([3, 3]);
            ctx.beginPath();
            ctx.moveTo(x0 + MUS[i] * wPx, 70);
            ctx.lineTo(x0 + MUS[i] * wPx, 190);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.fillStyle = dim;
            ctx.font = '10px ui-monospace, monospace';
            ctx.fillText(`arm ${'ABC'[i]} · pulls ${st.a[i] + st.b[i] - 2} · β(${st.a[i]},${st.b[i]})`, x0, 218);
            return null;
          });
          let line;
          if (done || round >= ROUNDS - 1) {
            const pulls = sc.act1.rounds[ROUNDS - 1].a.map((av, i) => av + sc.act1.rounds[ROUNDS - 1].b[i] - 2);
            line = `after ${ROUNDS} rounds the best arm holds ${Math.max(...pulls)} pulls: doubt decayed into commitment, no knob involved`;
            ctx.fillStyle = good;
          } else if (round < 15) {
            line = 'flat posteriors throw wild draws: everything gets tried: exploration IS the uncertainty';
            ctx.fillStyle = heur;
          } else {
            line = st.reward ? 'the drawn winner paid off: its alpha ticks up, its curve leans right' : 'the drawn winner missed: beta ticks up, the curve leans left';
            ctx.fillStyle = ink;
          }
          ctx.font = '12px ui-monospace, monospace';
          ctx.fillText(line, 14, H - 12);
          statsRef.current = { line };
        } else {
          const t = done ? 200 : Math.min(s.tick, 200);
          ctx.fillText('act 2 · the regret race: same seeded instances, four policies, cumulative regret (10-run mean, T = 2,000)', 14, 20);
          const frac = Math.min(1, t / 200);
          const T = sc.act2.ts.length;
          const upto = Math.max(2, Math.floor(frac * T));
          const maxY = Math.max(sc.act2.greedy[T - 1], sc.act2.ucb[T - 1], sc.act2.eps[T - 1], sc.act2.ts[T - 1]) * 1.1;
          const X = (i) => 50 + (i / (T - 1)) * 540;
          const Y = (v) => 230 - (v / maxY) * 180;
          const series = [
            ['greedy', warn],
            ['ucb', heur],
            ['eps', dim],
            ['ts', algo],
          ];
          for (const [name, color] of series) {
            ctx.strokeStyle = color;
            ctx.lineWidth = name === 'ts' ? 2.2 : 1.5;
            ctx.beginPath();
            for (let i = 0; i < upto; i += 4) {
              const px = X(i);
              const py = Y(sc.act2[name][i]);
              if (i === 0) ctx.moveTo(px, py);
              else ctx.lineTo(px, py);
            }
            ctx.stroke();
          }
          ctx.font = '10px ui-monospace, monospace';
          ctx.fillStyle = warn;
          ctx.fillText(`greedy ${sc.act2.greedy[upto - 1].toFixed(0)}`, 550, Y(sc.act2.greedy[upto - 1]) - 4);
          ctx.fillStyle = heur;
          ctx.fillText(`ucb1 ${sc.act2.ucb[upto - 1].toFixed(0)}`, 550, Y(sc.act2.ucb[upto - 1]) - 4);
          ctx.fillStyle = dim;
          ctx.fillText(`ε ${sc.act2.eps[upto - 1].toFixed(0)}`, 550, Y(sc.act2.eps[upto - 1]) + 10);
          ctx.fillStyle = algo;
          ctx.fillText(`thompson ${sc.act2.ts[upto - 1].toFixed(0)}`, 550, Y(sc.act2.ts[upto - 1]) + 12);
          let line;
          if (done || t >= 200) {
            line = 'straight lines pay forever; bending curves stop: the bend is the product (53 vs 95 vs 177 at T = 10,000 in the solution)';
            ctx.fillStyle = good;
          } else {
            line = 'every policy faces the same coins: only the visit discipline differs';
            ctx.fillStyle = ink;
          }
          ctx.font = '12px ui-monospace, monospace';
          ctx.fillText(line, 14, H - 12);
          statsRef.current = {
            line: done
              ? 'draw a world, play its winner, update: exploration exactly as large as the doubt'
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
          new casino
        </button>
        <span className="viz-stat">
          {snap.line || 'drawing worlds…'}
        </span>
      </div>
    </>
  );
}
