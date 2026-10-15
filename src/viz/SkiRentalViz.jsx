import DiagramViewport from '../components/DiagramViewport.jsx';
import { useEffect, useRef, useState } from 'react';
import { useCanvasLoop, isStill, holdTicks, mulberry32 } from './useCanvasLoop.js';

// One ski season per cycle, one day per tick. The price B and the season
// length T are seeded; T stays hidden from every rule until the season ends.
// Four rules pay their way through the days: the break-even rule (rent until
// day B, buy on day B), the randomized rule (one buy day drawn from the
// Karlin, Manasse, McGeoch, Owicki distribution), buy on day one, and never
// buy. The clairvoyant pays min(T, B). Two invariants are checked every day
// d: the break-even cost so far is at most (2 - 1/B) times the clairvoyant's
// min(d, B), and the exact expected cost of the randomized rule so far equals
// its ratio 1 / (1 - (1 - 1/B)^B) times min(d, B), the equalizing property.
const W = 640;
const H = 300;
const SEED = 20261010;

export function kmmoWeights(B) {
  const q = (B - 1) / B;
  const w = [];
  let total = 0;
  for (let k = 1; k <= B; k += 1) {
    const v = q ** (B - k);
    w.push(v);
    total += v;
  }
  return w.map((v) => v / total);
}

function costThreshold(k, d, B) {
  return d < k ? d : k - 1 + B;
}

export function makeScene(seed) {
  const rand = mulberry32(seed);
  const B = 6 + Math.floor(rand() * 7); // price 6 to 12
  // half the seasons end within B days (where the adversary lives), half run on
  const T = rand() < 0.5 ? 1 + Math.floor(rand() * B) : B + 1 + Math.floor(rand() * (2 * B));
  const p = kmmoWeights(B);
  let r = rand();
  let kRand = B;
  for (let k = 1; k <= B; k += 1) {
    r -= p[k - 1];
    if (r <= 0) {
      kRand = k;
      break;
    }
  }
  const ratioRand = 1 / (1 - ((B - 1) / B) ** B);
  return {
    B, T, p, kRand, ratioRand, d: 0, opt: 0, done: false, ok: true,
    costs: { breakEven: 0, rand: 0, dayOne: 0, never: 0 },
    last: `price B = ${B}, rent 1 a day, season length hidden; the randomized rule drew buy day ${kRand}`,
  };
}

export function sceneTick(sc) {
  if (sc.done) return true;
  if (sc.d >= sc.T) {
    sc.done = true;
    const c = sc.costs;
    sc.last = `season over after ${sc.T} day${sc.T === 1 ? '' : 's'}: clairvoyant ${sc.opt}; break-even ${c.breakEven} (ratio ${(c.breakEven / sc.opt).toFixed(2)}); randomized ${c.rand} (ratio ${(c.rand / sc.opt).toFixed(2)}); day one ${c.dayOne}; never ${c.never}`;
    return true;
  }
  sc.d += 1;
  const { B, d } = sc;
  sc.costs.breakEven = costThreshold(B, d, B);
  sc.costs.rand = costThreshold(sc.kRand, d, B);
  sc.costs.dayOne = B;
  sc.costs.never = d;
  sc.opt = Math.min(d, B);
  const bound = (2 - 1 / B) * sc.opt + 1e-9;
  let expected = 0;
  for (let k = 1; k <= B; k += 1) expected += sc.p[k - 1] * costThreshold(k, d, B);
  const equalized = Math.abs(expected - sc.ratioRand * sc.opt) < 1e-9;
  sc.ok = sc.ok && sc.costs.breakEven <= bound && equalized;
  let what;
  if (d < B) what = `day ${d}: break-even rents (paid ${sc.costs.breakEven})`;
  else if (d === B) what = `day ${d}: break-even buys, total ${sc.costs.breakEven} against the clairvoyant's ${B}`;
  else what = `day ${d}: break-even owns its skis; never-buy has paid ${d}`;
  const rs = d < sc.kRand ? 'rents' : d === sc.kRand ? 'buys' : 'owns';
  sc.last = `${what}; randomized ${rs} (${sc.costs.rand})`;
  return false;
}

export default function SkiRentalViz() {
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
      stepMs: 450,
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
        const { B, d } = sc;
        ctx.font = '11px ui-monospace, monospace';
        ctx.fillStyle = dim;
        ctx.fillText(`rent 1 a day (amber) or buy for B = ${B} (blue), season length hidden; one day per tick`, 12, 18);
        const x0 = 196;
        const unit = 400 / (3 * B);
        const rows = [
          ['break-even: buy on day B', 'breakEven', B],
          [`randomized: drew day ${sc.kRand}`, 'rand', sc.kRand],
          ['buy on day one', 'dayOne', 1],
          ['never buy', 'never', Infinity],
        ];
        rows.forEach(([label, key, k], i) => {
          const y = 44 + i * 46;
          ctx.fillStyle = i === 0 ? ink : dim;
          ctx.fillText(label, 12, y + 15);
          // rent days as amber squares, the purchase as one blue block of B units
          const rentDays = Math.min(d, k - 1);
          for (let j = 0; j < rentDays; j += 1) {
            ctx.fillStyle = heur;
            ctx.fillRect(x0 + j * unit, y, Math.max(1, unit - 1), 22);
          }
          if (d >= k) {
            ctx.fillStyle = algo;
            ctx.fillRect(x0 + rentDays * unit, y, B * unit - 1, 22);
          }
          const cost = sc.costs[key];
          ctx.fillStyle = cost > (2 - 1 / B) * sc.opt + 1e-9 ? warn : ink;
          ctx.fillText(`${cost}  (${sc.opt ? (cost / sc.opt).toFixed(2) : '·'}x)`, x0 + Math.max(cost, 1) * unit + 6, y + 15);
        });
        // the clairvoyant's cost so far and the break-even bound
        const optX = x0 + sc.opt * unit;
        ctx.strokeStyle = good;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(optX, 40);
        ctx.lineTo(optX, 224);
        ctx.stroke();
        const boundX = x0 + (2 - 1 / B) * sc.opt * unit;
        ctx.strokeStyle = warn;
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 3]);
        ctx.beginPath();
        ctx.moveTo(boundX, 40);
        ctx.lineTo(boundX, 224);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = good;
        ctx.fillText(`clairvoyant min(day, B) = ${sc.opt}`, 12, 240);
        ctx.fillStyle = warn;
        ctx.fillText(`red bound: (2 - 1/B) × OPT = ${((2 - 1 / B) * sc.opt).toFixed(1)}`, 196, 240);
        ctx.fillStyle = sc.ok ? good : warn;
        ctx.fillText(
          sc.ok
            ? `every day: break-even ≤ (2 - 1/B) × OPT; randomized expected cost = ${sc.ratioRand.toFixed(4)} × OPT`
            : 'INVARIANT BROKEN',
          12,
          262,
        );
        const line = sc.last;
        ctx.fillStyle = s.done ? (sc.ok ? good : warn) : ink;
        ctx.fillText(line.length > 100 ? `${line.slice(0, 99)}…` : line, 12, H - 6);
        statsRef.current = { line };
      },
    },
    [restart],
  );

  return (
    <>
      <DiagramViewport width={W}>
        <canvas ref={canvasRef} style={{ aspectRatio: `${W} / ${H}` }} aria-hidden="true" />
      </DiagramViewport>
      <div className="viz-controls">
        <button
          type="button"
          className="btn"
          onClick={() => {
            cycle.current += 1;
            setRestart((t) => t + 1);
          }}
        >
          new season
        </button>
        <span className="viz-stat">{snap.line || 'renting…'}</span>
      </div>
    </>
  );
}
