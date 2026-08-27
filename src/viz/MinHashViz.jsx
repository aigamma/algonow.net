import { useEffect, useRef, useState } from 'react';
import { useCanvasLoop, isStill, holdTicks, mulberry32 } from './useCanvasLoop.js';

// The lottery, watched. Two overlapping sets as dot clouds: A-only
// blue, B-only amber, shared green. Each round, every element draws a
// fresh random ticket and the lowest ticket in the room flashes: if the
// winner is green (shared), the two sets report the same minimum: a
// hit. The running fraction of hits converges to the true Jaccard,
// marked on the meter. The theorem is not narrated: it is played.
const W = 640;
const H = 300;
const SEED = 20260827;
const ROUNDS = 48;
const TICKS_PER_ROUND = 8;

const CA = [180, 152, 92];
const CB = [292, 152, 92];

function inC(c, x, y) {
  return (x - c[0]) ** 2 + (y - c[1]) ** 2 < c[2] * c[2];
}

function makeScene(seed) {
  const rand = mulberry32(seed);
  const dots = [];
  const place = (kind, count) => {
    let placed = 0;
    let guard = 0;
    while (placed < count && guard < 5_000) {
      guard += 1;
      const x = 60 + rand() * 340;
      const y = 40 + rand() * 224;
      const a = inC(CA, x, y);
      const b = inC(CB, x, y);
      const ok =
        (kind === 'a' && a && !b) ||
        (kind === 'b' && b && !a) ||
        (kind === 'shared' && a && b);
      if (ok) {
        dots.push({ x, y, kind });
        placed += 1;
      }
    }
  };
  place('a', 14);
  place('shared', 8);
  place('b', 12);
  const nShared = dots.filter((d) => d.kind === 'shared').length;
  const trueJ = nShared / dots.length;
  const rounds = [];
  for (let r = 0; r < ROUNDS; r++) {
    let minV = Infinity;
    let winner = 0;
    dots.forEach((d, i) => {
      const v = rand();
      if (v < minV) {
        minV = v;
        winner = i;
      }
    });
    rounds.push({ winner, hit: dots[winner].kind === 'shared' });
  }
  return { dots, trueJ, rounds };
}

export default function MinHashViz() {
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
        tick: 0,
        rest: 0,
        stopAtRest: isStill(),
      }),
      tick: (s) => {
        const total = ROUNDS * TICKS_PER_ROUND + 50;
        if (s.tick >= total) {
          if (s.stopAtRest) return false;
          s.rest += 1;
          if (s.rest > holdTicks(s)) {
            cycle.current += 1;
            Object.assign(s, {
              scene: makeScene(SEED + cycle.current * 7919),
              tick: 0,
              rest: 0,
            });
          }
          return true;
        }
        s.tick += 1;
        return true;
      },
      draw: (ctx, s) => {
        ctx.clearRect(0, 0, W, H);
        const css = getComputedStyle(document.documentElement);
        const algo = css.getPropertyValue('--algo').trim() || '#5da2ff';
        const heur = css.getPropertyValue('--heur').trim() || '#f0b94b';
        const good = css.getPropertyValue('--path').trim() || '#62d98a';
        const dim = css.getPropertyValue('--ink-dim').trim() || '#9aa5bd';
        const ink = css.getPropertyValue('--ink').trim() || '#e9edf6';
        const sc = s.scene;

        const roundIdx = Math.min(Math.floor(s.tick / TICKS_PER_ROUND), ROUNDS - 1);
        const within = s.tick - roundIdx * TICKS_PER_ROUND;
        const finished = s.tick >= ROUNDS * TICKS_PER_ROUND;
        const doneRounds = finished ? ROUNDS : roundIdx;
        const hits = sc.rounds.slice(0, doneRounds + (finished ? 0 : 0)).filter((r) => r.hit).length;
        const est = doneRounds > 0 ? hits / doneRounds : 0;

        // The two set circles.
        ctx.strokeStyle = `${algo}66`;
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.arc(CA[0], CA[1], CA[2], 0, Math.PI * 2);
        ctx.stroke();
        ctx.strokeStyle = `${heur}66`;
        ctx.beginPath();
        ctx.arc(CB[0], CB[1], CB[2], 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = dim;
        ctx.font = '12px ui-monospace, monospace';
        ctx.fillText('A', CA[0] - CA[2] + 6, CA[1] - CA[2] + 18);
        ctx.fillText('B', CB[0] + CB[2] - 16, CB[1] - CB[2] + 18);

        // Dots.
        const colors = { a: algo, b: heur, shared: good };
        sc.dots.forEach((d, i) => {
          ctx.fillStyle = colors[d.kind];
          ctx.beginPath();
          ctx.arc(d.x, d.y, 4, 0, Math.PI * 2);
          ctx.fill();
        });

        // The round's winner flash.
        if (!finished && within >= 2) {
          const win = sc.dots[sc.rounds[roundIdx].winner];
          ctx.strokeStyle = sc.rounds[roundIdx].hit ? good : ink;
          ctx.lineWidth = 2.2;
          ctx.beginPath();
          ctx.arc(win.x, win.y, 9 + (within % 4), 0, Math.PI * 2);
          ctx.stroke();
        }

        // The estimate meter.
        const mx = 470;
        const my = 46;
        const mh = 190;
        ctx.strokeStyle = '#2a3450';
        ctx.strokeRect(mx, my, 26, mh);
        const ty = my + mh - sc.trueJ * mh;
        ctx.strokeStyle = good;
        ctx.setLineDash([4, 3]);
        ctx.beginPath();
        ctx.moveTo(mx - 6, ty);
        ctx.lineTo(mx + 32, ty);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = good;
        ctx.font = '10px ui-monospace, monospace';
        ctx.fillText(`true J = ${sc.trueJ.toFixed(3)}`, mx + 38, ty + 3);
        const ey = my + mh - est * mh;
        ctx.fillStyle = heur;
        ctx.fillRect(mx + 1, ey, 24, my + mh - ey);
        ctx.fillStyle = ink;
        ctx.font = '11px ui-monospace, monospace';
        ctx.fillText(`Ĵ = ${est.toFixed(3)}`, mx + 38, Math.max(ey + 3, my + 12));

        ctx.fillStyle = dim;
        ctx.font = '11px ui-monospace, monospace';
        ctx.fillText('every card draws a ticket · the room’s lowest flashes · green winner = shared minimum', 14, 16);
        let line = `lottery ${Math.min(doneRounds + 1, ROUNDS)}/${ROUNDS} · shared wins ${hits}`;
        if (finished) {
          ctx.fillStyle = good;
          line = `${ROUNDS} lotteries: Ĵ = ${est.toFixed(3)} against a true ${sc.trueJ.toFixed(3)}: the theorem, played out`;
        } else {
          ctx.fillStyle = ink;
        }
        ctx.font = '12px ui-monospace, monospace';
        ctx.fillText(line, 14, H - 12);

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
          new clubs
        </button>
        <span className="viz-stat">
          {snap.line || 'printing lottery tickets…'}
        </span>
      </div>
    </>
  );
}
