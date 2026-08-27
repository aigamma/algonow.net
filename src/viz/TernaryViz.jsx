import { useEffect, useRef, useState } from 'react';
import { useCanvasLoop, isStill, holdTicks, mulberry32 } from './useCanvasLoop.js';

// Two acts of two probes. Act one: a fog-bound unimodal ridge; probes
// drop at the thirds, the losing third greys out, the bracket shrinks
// round by round until the peak flashes green. Act two: the betrayal:
// a 2.0-tall spike hides at 6% while a 1.0 hill sits at 70%: the very
// first comparison greys out the spike's third, and the same machinery
// converges confidently to the lesser hill: red X on the summit it
// never saw.
const W = 640;
const H = 300;
const SEED = 20260827;
const ROUNDS_SHOWN = 9;
const ROUND_TICKS = 26;
const END_HOLD = 60;

function makeScene(seed) {
  const rand = mulberry32(seed);
  const p = 0.25 + rand() * 0.5;
  const w = 0.08 + rand() * 0.2;
  const uni = (x) => Math.exp(-((x - p) ** 2) / w);
  const bi = (x) =>
    2.0 * Math.exp(-((x - 0.06) ** 2) / 0.0004) + Math.exp(-((x - 0.7) ** 2) / 0.012);
  const acts = [
    { f: uni, peak: p, note: 'act 1 · a unimodal ridge: the contract holds', betray: false },
    { f: bi, peak: 0.06, note: 'act 2 · a hidden 2.0 spike at 0.06: the contract is broken', betray: true },
  ].map((act) => {
    let lo = 0;
    let hi = 1;
    const rounds = [];
    for (let r = 0; r < ROUNDS_SHOWN; r++) {
      const m1 = lo + (hi - lo) / 3;
      const m2 = hi - (hi - lo) / 3;
      const left = act.f(m1) < act.f(m2);
      rounds.push({ lo, hi, m1, m2, left });
      if (left) lo = m1;
      else hi = m2;
    }
    return { ...act, rounds, final: (lo + hi) / 2 };
  });
  return { acts };
}

export default function TernaryViz() {
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
        const total = ROUNDS_SHOWN * ROUND_TICKS + END_HOLD;
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
        if (s.tick >= total) {
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

        const done = s.act >= 2;
        const actIdx = done ? 1 : s.act;
        const act = s.scene.acts[actIdx];
        const tick = done ? ROUNDS_SHOWN * ROUND_TICKS : s.tick;
        const rIdx = Math.min(Math.floor(tick / ROUND_TICKS), ROUNDS_SHOWN - 1);
        const within = tick - rIdx * ROUND_TICKS;
        const finished = done || tick >= ROUNDS_SHOWN * ROUND_TICKS;

        const X = (v) => 30 + v * (W - 60);
        const maxF = actIdx === 0 ? 1.0 : 2.05;
        const Y = (v) => 240 - (v / maxF) * 190;

        // Dead regions accumulated so far.
        const round = act.rounds[rIdx];
        ctx.fillStyle = 'rgba(226,96,108,0.10)';
        ctx.fillRect(X(0), 40, X(round.lo) - X(0), 210);
        ctx.fillRect(X(round.hi), 40, X(1) - X(round.hi), 210);

        // The curve.
        ctx.strokeStyle = algo;
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let px = 0; px <= W - 60; px += 2) {
          const x = px / (W - 60);
          const y = Y(act.f(x));
          if (px === 0) ctx.moveTo(X(x), y);
          else ctx.lineTo(X(x), y);
        }
        ctx.stroke();

        // Probes for the current round.
        if (!finished && within > 4) {
          [round.m1, round.m2].forEach((m, i) => {
            const losing =
              within > 14 && ((round.left && i === 0) || (!round.left && i === 1));
            ctx.strokeStyle = losing ? warn : heur;
            ctx.lineWidth = 1.8;
            ctx.setLineDash([5, 4]);
            ctx.beginPath();
            ctx.moveTo(X(m), 250);
            ctx.lineTo(X(m), Y(act.f(m)));
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.fillStyle = losing ? warn : heur;
            ctx.beginPath();
            ctx.arc(X(m), Y(act.f(m)), 4.5, 0, Math.PI * 2);
            ctx.fill();
          });
        }

        // The finale.
        if (finished) {
          ctx.strokeStyle = act.betray ? warn : good;
          ctx.lineWidth = 2.4;
          ctx.beginPath();
          ctx.moveTo(X(act.final), 250);
          ctx.lineTo(X(act.final), Y(act.f(act.final)));
          ctx.stroke();
          if (act.betray) {
            // The missed spike.
            ctx.strokeStyle = warn;
            ctx.lineWidth = 2.4;
            const sx = X(0.06);
            const sy = Y(2.0);
            ctx.beginPath();
            ctx.moveTo(sx - 8, sy - 8);
            ctx.lineTo(sx + 8, sy + 8);
            ctx.moveTo(sx + 8, sy - 8);
            ctx.lineTo(sx - 8, sy + 8);
            ctx.stroke();
            ctx.fillStyle = warn;
            ctx.font = '10px ui-monospace, monospace';
            ctx.fillText('the summit it never saw', sx + 12, sy);
          } else {
            ctx.fillStyle = good;
            ctx.beginPath();
            ctx.arc(X(act.final), Y(act.f(act.final)), 6, 0, Math.PI * 2);
            ctx.fill();
          }
        }

        ctx.fillStyle = dim;
        ctx.font = '11px ui-monospace, monospace';
        ctx.fillText(act.note, 14, 20);
        let line;
        if (!finished) {
          line = `round ${rIdx + 1} · bracket [${round.lo.toFixed(3)}, ${round.hi.toFixed(3)}] · the lower probe's third dies`;
          ctx.fillStyle = ink;
        } else if (act.betray) {
          line = `converged to ${act.final.toFixed(3)} (the 1.0 hill): the 2.0 spike died in round one: confident, wrong`;
          ctx.fillStyle = warn;
        } else {
          line = `converged to ${act.final.toFixed(3)} (true peak ${act.peak.toFixed(3)}): a third per comparison`;
          ctx.fillStyle = good;
        }
        ctx.font = '12px ui-monospace, monospace';
        ctx.fillText(line, 14, H - 12);

        statsRef.current = {
          line: done ? 'the premise was the certificate: verify it, or the precision is theater' : line,
        };
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
          new ridge
        </button>
        <span className="viz-stat">
          {snap.line || 'sending the scouts…'}
        </span>
      </div>
    </>
  );
}
