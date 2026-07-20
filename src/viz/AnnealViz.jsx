import { useEffect, useRef, useState } from 'react';
import { useCanvasLoop, prefersReducedMotion, mulberry32 } from './useCanvasLoop.js';

const W = 640;
const H = 400;
const GAUGE_X = 596;
const AREA_W = 560;
const N_CITIES = 38;
const T0 = 1.0;
const T_MIN = 0.004;
const PROPS_PER_TICK = 80;
const SEED = 7192026;

const MODES = [
  { key: 'quench', label: 'quench · α 0.96', alpha: 0.96 },
  { key: 'classic', label: 'classic · α 0.99', alpha: 0.99 },
  { key: 'patient', label: 'patient · α 0.995', alpha: 0.995 },
];

function makeCities(seed) {
  const rng = mulberry32(seed);
  const cities = [];
  while (cities.length < N_CITIES) {
    const x = 24 + rng() * (AREA_W - 48);
    const y = 24 + rng() * (H - 48);
    if (cities.every(([cx, cy]) => (cx - x) ** 2 + (cy - y) ** 2 > 26 ** 2)) {
      cities.push([x, y]);
    } else if (rng() < 0.02) {
      cities.push([x, y]); // escape hatch so generation always terminates
    }
  }
  return cities;
}

const dist = (cities, a, b) => Math.hypot(cities[a][0] - cities[b][0], cities[a][1] - cities[b][1]);

function tourLength(cities, tour) {
  let sum = 0;
  for (let i = 0; i < tour.length; i += 1) {
    sum += dist(cities, tour[i], tour[(i + 1) % tour.length]);
  }
  return sum;
}

// Live annealer: 2-opt proposals against a geometric schedule. Switching
// modes re-anneals the SAME cities so the final lengths are honestly
// comparable; a new city set resets the comparison.
export default function AnnealViz() {
  const canvasRef = useRef(null);
  const [modeKey, setModeKey] = useState('classic');
  const [restartTick, setRestartTick] = useState(0);
  const cycleRef = useRef(0);
  const bestsRef = useRef({});
  const [snap, setSnap] = useState({ temp: T0, len: 0, best: 0, bests: {} });
  const liveRef = useRef({ temp: T0, len: 0, best: 0 });

  const mode = MODES.find((m) => m.key === modeKey);

  useCanvasLoop(
    canvasRef,
    {
      width: W,
      height: H,
      stepMs: 36,
      maxTicks: 4000,
      init: () => {
        const cities = makeCities(SEED + cycleRef.current * 613);
        const rng = mulberry32(SEED + cycleRef.current * 613 + 1);
        const tour = [...Array(N_CITIES).keys()];
        for (let i = tour.length - 1; i > 0; i -= 1) {
          const j = Math.floor(rng() * (i + 1));
          [tour[i], tour[j]] = [tour[j], tour[i]];
        }
        const len = tourLength(cities, tour);
        return {
          cities,
          rng,
          tour,
          len,
          best: tour.slice(),
          bestLen: len,
          temp: T0,
          scale: Math.max(AREA_W, H), // temperature is in normalized units
          phase: 'anneal',
          reveal: 0,
          rest: 0,
          uphill: null,
          stopAtRest: prefersReducedMotion(),
        };
      },
      tick: (st) => {
        if (st.phase === 'anneal') {
          for (let p = 0; p < PROPS_PER_TICK; p += 1) {
            let i = 1 + Math.floor(st.rng() * (N_CITIES - 1));
            let j = 1 + Math.floor(st.rng() * (N_CITIES - 1));
            if (i === j) continue;
            if (i > j) [i, j] = [j, i];
            const a = st.tour[i - 1];
            const b = st.tour[i];
            const c = st.tour[j];
            const d = st.tour[(j + 1) % N_CITIES];
            if (a === c || b === d) continue;
            const delta =
              dist(st.cities, a, c) + dist(st.cities, b, d) -
              dist(st.cities, a, b) - dist(st.cities, c, d);
            const norm = delta / st.scale;
            if (norm <= 0 || st.rng() < Math.exp(-norm / st.temp)) {
              let lo = i;
              let hi = j;
              while (lo < hi) {
                [st.tour[lo], st.tour[hi]] = [st.tour[hi], st.tour[lo]];
                lo += 1;
                hi -= 1;
              }
              st.len += delta;
              if (norm > 0) st.uphill = { a, d: b, ttl: 10 };
              if (st.len < st.bestLen - 1e-9) {
                st.bestLen = st.len;
                st.best = st.tour.slice();
              }
            }
          }
          st.temp *= mode.alpha;
          if (st.uphill && (st.uphill.ttl -= 1) <= 0) st.uphill = null;
          liveRef.current = { temp: st.temp, len: st.len, best: st.bestLen };
          if (st.temp < T_MIN) {
            bestsRef.current[mode.key] = Math.round(st.bestLen);
            st.phase = 'trace';
            st.reveal = 0;
          }
        } else if (st.phase === 'trace') {
          st.reveal += 2;
          if (st.reveal >= N_CITIES + 1) {
            st.phase = 'rest';
            st.rest = 80;
            if (st.stopAtRest) return false;
          }
        } else {
          st.rest -= 1;
          if (st.rest <= 0) {
            cycleRef.current += 1;
            bestsRef.current = {};
            const cities = makeCities(SEED + cycleRef.current * 613);
            const rng = mulberry32(SEED + cycleRef.current * 613 + 1);
            const tour = [...Array(N_CITIES).keys()];
            for (let i = tour.length - 1; i > 0; i -= 1) {
              const j = Math.floor(rng() * (i + 1));
              [tour[i], tour[j]] = [tour[j], tour[i]];
            }
            Object.assign(st, {
              cities,
              rng,
              tour,
              len: tourLength(cities, tour),
              best: tour.slice(),
              bestLen: tourLength(cities, tour),
              temp: T0,
              phase: 'anneal',
              reveal: 0,
              uphill: null,
            });
          }
        }
        return true;
      },
      draw: (ctx, st) => {
        ctx.fillStyle = '#0d1119';
        ctx.fillRect(0, 0, W, H);

        const tracing = st.phase !== 'anneal';
        const tour = tracing ? st.best : st.tour;
        const upto = st.phase === 'trace' ? st.reveal : N_CITIES + 1;

        ctx.strokeStyle = tracing ? '#62d98a' : 'rgba(93, 162, 255, 0.8)';
        ctx.lineWidth = tracing ? 2.2 : 1.4;
        ctx.beginPath();
        for (let i = 0; i < Math.min(upto, N_CITIES + 1); i += 1) {
          const [x, y] = st.cities[tour[i % N_CITIES]];
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();

        if (!tracing && st.uphill) {
          const [ax, ay] = st.cities[st.uphill.a];
          const [dx, dy] = st.cities[st.uphill.d];
          ctx.strokeStyle = 'rgba(240, 185, 75, 0.9)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(ax, ay);
          ctx.lineTo(dx, dy);
          ctx.stroke();
        }

        ctx.fillStyle = '#e9edf6';
        for (const [x, y] of st.cities) {
          ctx.beginPath();
          ctx.arc(x, y, 2.6, 0, Math.PI * 2);
          ctx.fill();
        }

        // Temperature gauge: log-scaled bar, amber like every heuristic surface.
        const frac = Math.max(
          0,
          Math.min(1, Math.log(st.temp / T_MIN) / Math.log(T0 / T_MIN))
        );
        ctx.fillStyle = '#161d2c';
        ctx.fillRect(GAUGE_X, 24, 22, H - 60);
        ctx.fillStyle = '#f0b94b';
        const gh = (H - 60) * frac;
        ctx.fillRect(GAUGE_X, 24 + (H - 60) - gh, 22, gh);
        ctx.fillStyle = '#9aa5bd';
        ctx.font = '11px ui-monospace, Consolas, monospace';
        ctx.textAlign = 'center';
        ctx.fillText('T', GAUGE_X + 11, H - 18);
      },
    },
    [modeKey, restartTick]
  );

  useEffect(() => {
    const id = setInterval(() => {
      setSnap({
        temp: liveRef.current.temp,
        len: liveRef.current.len,
        best: liveRef.current.best,
        bests: { ...bestsRef.current },
      });
    }, 400);
    return () => clearInterval(id);
  }, []);

  const finished = MODES.filter((m) => snap.bests[m.key] != null)
    .map((m) => `${m.key} ${snap.bests[m.key]}`)
    .join(' · ');

  return (
    <>
      <canvas ref={canvasRef} style={{ aspectRatio: `${W} / ${H}` }} aria-hidden="true" />
      <div className="viz-controls">
        {MODES.map((m) => (
          <button
            key={m.key}
            type="button"
            className={`btn${m.key === modeKey ? ' btn-primary' : ''}`}
            aria-pressed={m.key === modeKey}
            onClick={() => setModeKey(m.key)}
          >
            {m.label}
          </button>
        ))}
        <button
          type="button"
          className="btn"
          onClick={() => {
            cycleRef.current += 1;
            bestsRef.current = {};
            setRestartTick((t) => t + 1);
          }}
        >
          new cities
        </button>
        <span className="viz-stat">
          {finished
            ? <>final tour · {finished}</>
            : <>T <b>{snap.temp.toFixed(3)}</b> · tour <b>{Math.round(snap.len)}</b> · best <b>{Math.round(snap.best)}</b></>}
        </span>
      </div>
    </>
  );
}
