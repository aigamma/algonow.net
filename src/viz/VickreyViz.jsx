import { useEffect, useRef, useState } from 'react';
import { useCanvasLoop, isStill, holdTicks, mulberry32 } from './useCanvasLoop.js';

// Sixty sealed-bid auctions of one item among three bidders with seeded
// uniform values, one auction per tick. Each tick opens the three truthful
// bids, awards the item to the highest, and charges the second-highest
// (the amber price line). The invariant checked every tick: the winner
// holds the highest value, the price equals the second-highest value and
// never exceeds the winner's value, and for one probed bidder none of
// forty-one alternative bids beats bidding the true value against the
// other two. The right panel tracks running revenue for the Vickrey
// auction and for a first-price auction with equilibrium shading against
// the theory (n - 1) / (n + 1), which both must approach.
const W = 640;
const H = 300;
const SEED = 20261010;
const N = 3;
const ROUNDS = 60;
const THEORY = (N - 1) / (N + 1);
const GRID = 40;

export function utilitySecondPrice(value, bid, highestOther) {
  if (bid > highestOther) return value - highestOther;
  if (bid === highestOther) return 0.5 * (value - highestOther);
  return 0;
}

export function makeScene(seed) {
  const rand = mulberry32(seed);
  return {
    rand,
    t: 0,
    values: [0, 0, 0],
    winner: -1,
    price: 0,
    probe: 0,
    probeM: 0,
    probeCurve: [],
    vickreySum: 0,
    firstSum: 0,
    vHistory: [],
    fHistory: [],
    deviationsChecked: 0,
    done: false,
    ok: true,
    last: 'three sealed envelopes per tick; the highest bid wins and pays the second bid',
  };
}

export function sceneTick(sc) {
  if (sc.done) return true;
  if (sc.t >= ROUNDS) {
    sc.done = true;
    sc.last = `done: ${ROUNDS} auctions, mean revenue ${(sc.vickreySum / ROUNDS).toFixed(3)} (Vickrey) and ${(sc.firstSum / ROUNDS).toFixed(3)} (first price at equilibrium) against theory ${THEORY.toFixed(3)}; ${sc.deviationsChecked} deviations probed, none profitable: ${sc.ok ? 'yes' : 'NO'}`;
    return true;
  }
  const values = [sc.rand(), sc.rand(), sc.rand()];
  const order = [0, 1, 2].sort((a, b) => values[b] - values[a] || a - b);
  const winner = order[0];
  const price = values[order[1]];
  let ok = values[winner] === Math.max(values[0], values[1], values[2]) && price <= values[winner];
  // probe one bidder: every bid on a grid against the other two, compared with the truth
  const probe = Math.floor(sc.rand() * N);
  const v = values[probe];
  const m = Math.max(...values.filter((_, i) => i !== probe));
  const truthful = utilitySecondPrice(v, v, m);
  const curve = [];
  for (let k = 0; k <= GRID; k += 1) {
    const u = utilitySecondPrice(v, k / GRID, m);
    curve.push(u);
    if (u > truthful + 1e-12) ok = false;
    sc.deviationsChecked += 1;
  }
  // a first-price auction in which everyone shades to (n - 1) / n of value:
  // the same winner, who pays the shaded bid
  const fPrice = ((N - 1) / N) * values[winner];
  sc.vickreySum += price;
  sc.firstSum += fPrice;
  sc.t += 1;
  sc.vHistory.push(sc.vickreySum / sc.t);
  sc.fHistory.push(sc.firstSum / sc.t);
  sc.values = values;
  sc.winner = winner;
  sc.price = price;
  sc.probe = probe;
  sc.probeM = m;
  sc.probeCurve = curve;
  sc.ok = sc.ok && ok;
  sc.last = `auction ${sc.t} of ${ROUNDS}: values ${values.map((x) => x.toFixed(2)).join(', ')}; bidder ${winner + 1} wins and pays ${price.toFixed(2)}; probe of bidder ${probe + 1}: ${GRID + 1} bids tried, none beats the truth; running revenue ${(sc.vickreySum / sc.t).toFixed(3)} against theory ${THEORY.toFixed(3)}`;
  return false;
}

export default function VickreyViz() {
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
        ctx.fillText('one sealed-bid auction per tick, three bidders with uniform values; blue bids, green winner, amber price = the second bid', 12, 18);

        // left: the current auction as three bars with the price line
        const lx = 30;
        const barW = 56;
        const gap = 34;
        const top = 44;
        const base = 176;
        const yOf = (v) => base - v * (base - top);
        if (sc.t > 0) {
          sc.values.forEach((v, i) => {
            const x = lx + i * (barW + gap);
            ctx.fillStyle = i === sc.winner ? good : algo;
            ctx.globalAlpha = 0.85;
            ctx.fillRect(x, yOf(v), barW, base - yOf(v));
            ctx.globalAlpha = 1;
            ctx.fillStyle = ink;
            ctx.fillText(`bid ${v.toFixed(2)}`, x, yOf(v) - 4);
            ctx.fillStyle = dim;
            ctx.fillText(i === sc.probe ? `bidder ${i + 1} (probed)` : `bidder ${i + 1}`, x - 4, base + 13);
          });
          ctx.strokeStyle = heur;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(lx - 8, yOf(sc.price));
          ctx.lineTo(lx + 3 * barW + 2 * gap - gap + 8, yOf(sc.price));
          ctx.stroke();
          ctx.fillStyle = heur;
          ctx.fillText(`pays ${sc.price.toFixed(2)}`, lx + 3 * barW + 2 * gap - gap + 12, yOf(sc.price) + 4);
        }
        ctx.strokeStyle = `${dim}66`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(lx - 8, base + 0.5);
        ctx.lineTo(lx + 3 * barW + 2 * gap - gap + 8, base + 0.5);
        ctx.stroke();

        // bottom left: the probed bidder's payoff against every bid (a step, flat above m)
        const px0 = 30;
        const px1 = 300;
        const py0 = 284;
        const py1 = 214;
        ctx.fillStyle = dim;
        ctx.fillText('probed bidder: payoff against every bid; flat above the rival bid, so the bid only decides win or lose', 12, 206);
        if (sc.t > 0) {
          const v = sc.values[sc.probe];
          const span = Math.max(0.05, Math.abs(v - sc.probeM));
          const yP = (u) => py0 - (Math.max(u, 0) / span) * (py0 - py1);
          ctx.strokeStyle = heur;
          ctx.lineWidth = 2;
          ctx.beginPath();
          sc.probeCurve.forEach((u, k) => {
            const x = px0 + (k / GRID) * (px1 - px0);
            if (k === 0) ctx.moveTo(x, yP(u));
            else ctx.lineTo(x, yP(u));
          });
          ctx.stroke();
          const xv = px0 + v * (px1 - px0);
          ctx.fillStyle = good;
          ctx.beginPath();
          ctx.arc(xv, yP(utilitySecondPrice(v, v, sc.probeM)), 4, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = dim;
          ctx.fillText(`truth ${v.toFixed(2)}`, Math.min(xv + 6, px1 - 60), yP(utilitySecondPrice(v, v, sc.probeM)) - 6);
          ctx.fillText(`rival ${sc.probeM.toFixed(2)}`, px0 + sc.probeM * (px1 - px0) - 24, py0 + 12 - 2);
        }

        // right: running revenue against theory
        const rx0 = 340;
        const rx1 = 620;
        const ry0 = 176;
        const ry1 = 44;
        const yR = (r) => ry0 - r * (ry0 - ry1);
        ctx.strokeStyle = `${dim}66`;
        ctx.beginPath();
        ctx.moveTo(rx0, ry0 + 0.5);
        ctx.lineTo(rx1, ry0 + 0.5);
        ctx.stroke();
        ctx.setLineDash([4, 4]);
        ctx.strokeStyle = dim;
        ctx.beginPath();
        ctx.moveTo(rx0, yR(THEORY));
        ctx.lineTo(rx1, yR(THEORY));
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = dim;
        ctx.fillText(`theory (n - 1)/(n + 1) = ${THEORY.toFixed(3)}`, rx0, yR(THEORY) - 5);
        const drawSeries = (hist, color) => {
          if (hist.length === 0) return;
          ctx.strokeStyle = color;
          ctx.lineWidth = 2;
          ctx.beginPath();
          hist.forEach((r, k) => {
            const x = rx0 + ((k + 1) / ROUNDS) * (rx1 - rx0);
            if (k === 0) ctx.moveTo(x, yR(r));
            else ctx.lineTo(x, yR(r));
          });
          ctx.stroke();
        };
        drawSeries(sc.fHistory, heur);
        drawSeries(sc.vHistory, algo);
        ctx.fillStyle = algo;
        ctx.fillText(`Vickrey running revenue ${sc.t > 0 ? (sc.vickreySum / sc.t).toFixed(3) : '...'}`, rx0, 196);
        ctx.fillStyle = heur;
        ctx.fillText(`first price at equilibrium ${sc.t > 0 ? (sc.firstSum / sc.t).toFixed(3) : '...'}`, rx0, 211);
        ctx.fillStyle = dim;
        ctx.fillText('the file: 60,000 draws, 0.4997 against 0.4994, theory 0.500', rx0, 229);
        ctx.fillStyle = sc.ok ? good : warn;
        ctx.fillText(sc.ok ? `invariant: highest value wins, pays the second; ${sc.deviationsChecked} deviations, none pays` : 'INVARIANT BROKEN', rx0, 247);
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
          new bidders
        </button>
        <span className="viz-stat">{snap.line || 'opening the envelopes…'}</span>
      </div>
    </>
  );
}
