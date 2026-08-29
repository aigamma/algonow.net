import { useEffect, useRef, useState } from 'react';
import { useCanvasLoop, isStill, holdTicks, mulberry32 } from './useCanvasLoop.js';

// Two acts of one hiring hall. Act one: episodes: thirty
// candidates parade past, the first n/e are reconnaissance (gray,
// the record bar amber), then the first record after the cutoff
// is hired green: the true best is starred at the reveal, the
// tally converges toward 37%. Act two: the whole strategy space:
// the exact success curve over every cutoff (closed form), Monte
// Carlo dots agreeing with it, and the information wall dashed
// above the rank-only peak.
const W = 640;
const H = 300;
const SEED = 20260829;
const END_HOLD = 70;
const N = 30;
const CUT = Math.round(N / Math.E); // observe positions 1..CUT

export function exactP(n, r) {
  // r = first hireable position (observe r-1)
  if (r <= 1) return 1 / n;
  let s = 0;
  for (let i = r; i <= n; i++) s += 1 / (i - 1);
  return ((r - 1) / n) * s;
}

export function runEpisode(order, cut) {
  // observe 1..cut (0-indexed: first `cut` entries), then first record
  let bar = -Infinity;
  for (let i = 0; i < cut; i++) bar = Math.max(bar, order[i]);
  let hired = null;
  for (let i = cut; i < order.length; i++) {
    if (order[i] > bar) {
      hired = i;
      break;
    }
  }
  const best = order.indexOf(Math.max(...order));
  return { hired, best, win: hired === best };
}

export function makeScene(seed) {
  const rand = mulberry32(seed);
  const episodes = [];
  for (let e = 0; e < 12; e++) {
    const order = Array.from({ length: N }, () => 0.1 + rand() * 0.9);
    episodes.push({ order, ...runEpisode(order, CUT) });
  }
  // act 2: exact curve + MC dots + the information wall
  const curve = [];
  for (let r = 1; r <= N; r++) curve.push(exactP(N, r));
  const mcCuts = [2, 6, CUT + 1, 16, 24];
  const TR = 3000;
  const mc = mcCuts.map(() => 0);
  let dpBest = 0;
  // backward-induction value thresholds for the info wall
  const E = [0];
  for (let k = 1; k <= N; k++) E.push((1 + E[k - 1] ** 2) / 2);
  for (let t = 0; t < TR; t++) {
    const order = Array.from({ length: N }, () => rand());
    const best = order.indexOf(Math.max(...order));
    mcCuts.forEach((r, i) => {
      const res = runEpisode(order, r - 1);
      if (res.hired === best) mc[i] += 1;
    });
    let hired = N - 1;
    for (let i = 0; i < N; i++) {
      if (order[i] > E[N - i - 1] || i === N - 1) {
        hired = i;
        break;
      }
    }
    if (hired === best) dpBest += 1;
  }
  return {
    episodes,
    curve,
    mc: mcCuts.map((r, i) => ({ r, p: mc[i] / TR })),
    wall: dpBest / TR,
    peakR: curve.indexOf(Math.max(...curve)) + 1,
  };
}

export default function SecretaryViz() {
  const canvasRef = useRef(null);
  const cycle = useRef(0);
  const statsRef = useRef({ line: '' });
  const [restart, setRestart] = useState(0);
  const [snap, setSnap] = useState({ line: '' });

  useEffect(() => {
    const id = setInterval(() => setSnap({ ...statsRef.current }), 400);
    return () => clearInterval(id);
  }, []);

  const EP_TICKS = 44;

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
        const len = s.act === 0 ? 12 * EP_TICKS + END_HOLD : 200 + END_HOLD;
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

        const done = s.act >= 2;
        const actIdx = done ? 1 : s.act;
        ctx.fillStyle = dim;
        ctx.font = '11px ui-monospace, monospace';

        if (actIdx === 0) {
          const t = done ? 12 * EP_TICKS : Math.min(s.tick, 12 * EP_TICKS);
          const ep = Math.min(11, Math.floor(t / EP_TICKS));
          const within = done ? EP_TICKS : t - ep * EP_TICKS;
          const episode = sc.episodes[ep];
          const seen = Math.min(N, Math.ceil((within / 34) * N));
          const reveal = within > 38 || done;
          ctx.fillText(`act 1 · episode ${ep + 1} of 12: observe the first ${CUT} (reconnaissance), then hire the first record`, 14, 20);
          // cutoff line
          const bx = (i) => 30 + i * 19;
          ctx.strokeStyle = heur;
          ctx.setLineDash([4, 3]);
          ctx.beginPath();
          ctx.moveTo(bx(CUT) - 4, 50);
          ctx.lineTo(bx(CUT) - 4, 205);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.fillStyle = heur;
          ctx.fillText('cutoff n/e', bx(CUT) - 4, 44);
          let bar = -Infinity;
          for (let i = 0; i < Math.min(seen, N); i++) {
            const v = episode.order[i];
            const h = v * 130;
            let color = 'rgba(154,165,189,0.55)';
            if (i < CUT) {
              bar = Math.max(bar, v);
              if (v === bar) color = heur;
            } else if (episode.hired === i) {
              color = good;
            }
            ctx.fillStyle = color;
            ctx.fillRect(bx(i), 200 - h, 13, h);
            if (reveal && i === episode.best) {
              ctx.fillStyle = episode.win ? good : warn;
              ctx.fillText('★', bx(i) + 2, 200 - h - 6);
            }
          }
          const tally = sc.episodes.slice(0, ep + (reveal ? 1 : 0)).filter((e) => e.win).length;
          const played = ep + (reveal ? 1 : 0);
          ctx.fillStyle = ink;
          ctx.font = '12px ui-monospace, monospace';
          ctx.fillText(`wins ${tally}/${played}${played ? ` (${Math.round((100 * tally) / played)}%)` : ''} · long run: 37%`, 460, 44);
          let line;
          if (reveal) {
            line = episode.win
              ? 'hired the true best: the record after the cutoff was the one'
              : episode.hired === null
                ? 'no hire: the best sat inside the reconnaissance: the priced-in failure mode'
                : 'hired a false record: someone beat the bar before the true best arrived';
            ctx.fillStyle = episode.win ? good : warn;
          } else if (seen <= CUT) {
            line = 'reconnaissance: hire nobody: the amber record is becoming the bar';
            ctx.fillStyle = heur;
          } else {
            line = 'hunting: the first candidate above the bar gets the job, instantly';
            ctx.fillStyle = ink;
          }
          ctx.font = '12px ui-monospace, monospace';
          ctx.fillText(line, 14, H - 12);
          statsRef.current = { line };
        } else {
          const t = done ? 200 : Math.min(s.tick, 200);
          ctx.fillText('act 2 · every strategy at once: P(best) for each cutoff: the exact curve, with simulation dots', 14, 20);
          const frac = Math.min(1, t / 200);
          const X = (r) => 60 + ((r - 1) / (N - 1)) * 520;
          const Y = (p) => 230 - p * 380;
          ctx.strokeStyle = 'rgba(154,165,189,0.4)';
          ctx.beginPath();
          ctx.moveTo(60, 230);
          ctx.lineTo(580, 230);
          ctx.stroke();
          const upto = Math.max(2, Math.floor(frac * N));
          ctx.strokeStyle = algo;
          ctx.lineWidth = 2;
          ctx.beginPath();
          for (let r = 1; r <= upto; r++) {
            const x = X(r);
            const y = Y(sc.curve[r - 1]);
            if (r === 1) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.stroke();
          if (frac > 0.5) {
            ctx.fillStyle = heur;
            ctx.beginPath();
            ctx.arc(X(sc.peakR), Y(sc.curve[sc.peakR - 1]), 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillText(`peak r* = ${sc.peakR} ≈ n/e: P = ${sc.curve[sc.peakR - 1].toFixed(3)}`, X(sc.peakR) + 10, Y(sc.curve[sc.peakR - 1]) - 6);
          }
          if (frac > 0.7) {
            for (const { r, p } of sc.mc) {
              ctx.fillStyle = good;
              ctx.beginPath();
              ctx.arc(X(r), Y(p), 3, 0, Math.PI * 2);
              ctx.fill();
            }
            ctx.fillStyle = good;
            ctx.fillText('dots: 3,000-trial simulation riding the exact curve', 330, 220);
          }
          if (frac >= 1 || done) {
            ctx.strokeStyle = `${warn}AA`;
            ctx.setLineDash([6, 4]);
            ctx.beginPath();
            ctx.moveTo(60, Y(sc.wall));
            ctx.lineTo(580, Y(sc.wall));
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.fillStyle = warn;
            ctx.fillText(`the information wall: cardinal values catch the best ${(100 * sc.wall).toFixed(0)}%: ranks alone never can`, 70, Y(sc.wall) - 6);
          }
          let line;
          if (done || t >= 200) {
            line = 'too early: no bar · too late: the best is spent calibrating · n/e: the proven balance, flat-topped and forgiving';
            ctx.fillStyle = good;
          } else {
            line = 'the whole strategy space in one curve: computed from the closed form, not sampled';
            ctx.fillStyle = ink;
          }
          ctx.font = '12px ui-monospace, monospace';
          ctx.fillText(line, 14, H - 12);
          statsRef.current = {
            line: done
              ? 'look at 37% of the field, then leap at the first record: optimal for its game, and only its game'
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
          new candidates
        </button>
        <span className="viz-stat">
          {snap.line || 'interviewing…'}
        </span>
      </div>
    </>
  );
}
