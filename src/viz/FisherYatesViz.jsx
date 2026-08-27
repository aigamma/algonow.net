import { useEffect, useRef, useState } from 'react';
import { useCanvasLoop, isStill, holdTicks, mulberry32 } from './useCanvasLoop.js';

// Three acts. Act one: eight cards, the sweep itself: the unlocked
// range bracketed in amber, j flashes, the swap slides, the seat locks
// green. Acts two and three: the distribution as evidence: thousands
// of 4-card shuffles pour into 24 permutation bars: first the true
// shuffle (flat within noise), then the one-character impostor (the
// jagged skyline of its 256-path arithmetic). Same code, one range.
const W = 640;
const H = 300;
const SEED = 20260827;
const N1 = 8;
const SWAP_TICKS = 16;
const ACT1_HOLD = 30;
const HIST_TICKS = 110;
const SHUFFLES_PER_TICK = 40;
const HIST_HOLD = 50;

const PERMS = [];
(function build(arr, rest) {
  if (!rest.length) {
    PERMS.push(arr.join(''));
    return;
  }
  rest.forEach((v, i) => build([...arr, v], rest.filter((_, k) => k !== i)));
})([], [0, 1, 2, 3]);
const PERM_INDEX = new Map(PERMS.map((p, i) => [p, i]));

function makeScene(seed) {
  const rand = mulberry32(seed);
  const swaps = [];
  for (let i = N1 - 1; i >= 1; i--) {
    swaps.push({ i, j: Math.floor(rand() * (i + 1)) });
  }
  return { swaps, rand };
}

export default function FisherYatesViz() {
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
        cards: Array.from({ length: N1 }, (_, i) => i),
        counts: new Array(24).fill(0),
        total: 0,
        stopAtRest: isStill(),
      }),
      tick: (s) => {
        const act1Total = s.scene.swaps.length * SWAP_TICKS + ACT1_HOLD;
        if (s.act >= 3) {
          if (s.stopAtRest) return false;
          s.rest += 1;
          if (s.rest > holdTicks(s)) {
            cycle.current += 1;
            Object.assign(s, {
              scene: makeScene(SEED + cycle.current * 7919),
              act: 0,
              tick: 0,
              rest: 0,
              cards: Array.from({ length: N1 }, (_, i) => i),
              counts: new Array(24).fill(0),
              total: 0,
            });
          }
          return true;
        }
        s.tick += 1;
        if (s.act === 0) {
          const step = Math.floor((s.tick - 1) / SWAP_TICKS);
          if ((s.tick - 1) % SWAP_TICKS === SWAP_TICKS - 1 && step < s.scene.swaps.length) {
            const { i, j } = s.scene.swaps[step];
            [s.cards[i], s.cards[j]] = [s.cards[j], s.cards[i]];
          }
          if (s.tick >= act1Total) {
            s.act = 1;
            s.tick = 0;
            s.counts = new Array(24).fill(0);
            s.total = 0;
          }
        } else {
          if (s.tick <= HIST_TICKS) {
            const rand = s.scene.rand;
            for (let t = 0; t < SHUFFLES_PER_TICK; t++) {
              const a = [0, 1, 2, 3];
              if (s.act === 1) {
                for (let i = 3; i >= 1; i--) {
                  const j = Math.floor(rand() * (i + 1));
                  [a[i], a[j]] = [a[j], a[i]];
                }
              } else {
                for (let i = 0; i < 4; i++) {
                  const j = Math.floor(rand() * 4);
                  [a[i], a[j]] = [a[j], a[i]];
                }
              }
              s.counts[PERM_INDEX.get(a.join(''))] += 1;
              s.total += 1;
            }
          }
          if (s.tick >= HIST_TICKS + HIST_HOLD) {
            s.act += 1;
            s.tick = 0;
            if (s.act === 2) {
              s.counts = new Array(24).fill(0);
              s.total = 0;
            }
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

        const done = s.act >= 3;
        let line = '';

        if (s.act === 0) {
          const step = Math.min(Math.floor(s.tick / SWAP_TICKS), s.scene.swaps.length - 1);
          const cur = s.scene.swaps[step];
          const finished = s.tick >= s.scene.swaps.length * SWAP_TICKS;
          const lockFrom = finished ? 0 : cur.i;
          const cw = 64;
          const x0 = 60;
          for (let k = 0; k < N1; k++) {
            const x = x0 + k * (cw + 6);
            const locked = k > lockFrom || (finished && k >= lockFrom);
            const isI = !finished && k === cur.i;
            const isJ = !finished && k === cur.j;
            ctx.fillStyle = locked ? `${good}22` : isJ ? `${heur}33` : 'rgba(93,162,255,0.10)';
            ctx.strokeStyle = locked ? good : isI || isJ ? heur : algo;
            ctx.lineWidth = isI || isJ ? 2.2 : 1.2;
            ctx.fillRect(x, 110, cw, 76);
            ctx.strokeRect(x + 0.5, 110.5, cw - 1, 75);
            ctx.fillStyle = ink;
            ctx.font = '26px ui-monospace, monospace';
            ctx.textAlign = 'center';
            ctx.fillText('ABCDEFGH'[s.cards[k]], x + cw / 2, 158);
            ctx.textAlign = 'start';
          }
          if (!finished) {
            const bx = x0 - 6;
            const bw2 = (cur.i + 1) * (cw + 6);
            ctx.strokeStyle = heur;
            ctx.setLineDash([5, 4]);
            ctx.strokeRect(bx, 100, bw2, 96);
            ctx.setLineDash([]);
            ctx.fillStyle = heur;
            ctx.font = '11px ui-monospace, monospace';
            ctx.fillText(`unlocked: [0, ${cur.i}] · j = ${cur.j}`, bx + 4, 92);
          }
          ctx.fillStyle = dim;
          ctx.font = '11px ui-monospace, monospace';
          ctx.fillText('act 1 · the sweep: fill the last seat from the unlocked range, lock it, repeat', 14, 20);
          line = finished ? 'shuffled in 7 swaps: every ordering equally likely' : `seat ${cur.i}: open to positions 0..${cur.i}`;
        } else {
          const bugged = s.act === 2 || (done && true);
          const exp = s.total / 24;
          const bw2 = (W - 60) / 24;
          const scaleMax = exp * 1.6 || 1;
          for (let p = 0; p < 24; p++) {
            const h = Math.min(1, s.counts[p] / scaleMax) * 170;
            const dev = exp > 0 ? (s.counts[p] - exp) / exp : 0;
            ctx.fillStyle = bugged && Math.abs(dev) > 0.12 ? `${warn}bb` : `${algo}99`;
            ctx.fillRect(30 + p * bw2 + 1, 240 - h, bw2 - 2, h);
          }
          if (exp > 0) {
            const ey = 240 - (exp / scaleMax) * 170;
            ctx.strokeStyle = good;
            ctx.setLineDash([5, 4]);
            ctx.beginPath();
            ctx.moveTo(30, ey);
            ctx.lineTo(W - 30, ey);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.fillStyle = good;
            ctx.font = '10px ui-monospace, monospace';
            ctx.fillText('uniform', W - 78, ey - 4);
          }
          ctx.fillStyle = dim;
          ctx.font = '11px ui-monospace, monospace';
          ctx.fillText(
            s.act === 1
              ? 'act 2 · 24 permutation bars under the TRUE shuffle: flat within noise'
              : 'act 3 · the same bars under swap-anywhere [0, n−1]: the arithmetic shows',
            14,
            20,
          );
          const worst = exp > 0 ? Math.max(...s.counts.map((c) => Math.abs(c - exp) / exp)) : 0;
          line = `${s.total.toLocaleString()} shuffles · worst cell ${(worst * 100).toFixed(0)}% from uniform`;
          if (done || s.tick >= HIST_TICKS) {
            ctx.fillStyle = s.act === 1 ? good : warn;
            line =
              s.act === 1
                ? `flat: worst cell ${(worst * 100).toFixed(0)}% off over ${s.total.toLocaleString()} shuffles`
                : `jagged by design: 256 paths onto 24 cells cannot be even (worst ${(worst * 100).toFixed(0)}%)`;
          } else {
            ctx.fillStyle = ink;
          }
        }
        ctx.font = '12px ui-monospace, monospace';
        ctx.fillText(line, 14, H - 12);

        statsRef.current = {
          line: done ? 'one character apart: the range [0, i] is the whole theorem' : line,
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
          new deck
        </button>
        <span className="viz-stat">
          {snap.line || 'cutting the deck…'}
        </span>
      </div>
    </>
  );
}
