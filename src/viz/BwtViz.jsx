import { useEffect, useRef, useState } from 'react';
import { useCanvasLoop, isStill, holdTicks, mulberry32 } from './useCanvasLoop.js';

// Two acts. Act one: the rotations of a small word glide from deal
// order into sorted order, the last column lifts out, and its
// letters: colored by identity: arrive pre-clustered: same letters,
// new neighbors. Act two: the meters: four bars animate the page's
// measured story: H0 raw and H0 BWT landing at exactly the same
// height (the permutation identity), then MTF-on-raw overshooting
// upward while MTF-on-BWT collapses: the transform compresses
// nothing: it makes the next stage's assumptions true.
const W = 640;
const H = 300;
const SEED = 20260827;
const SORT_TICKS = 120;
const LIFT_TICKS = 60;
const ACT1_HOLD = 60;
const BAR_TICKS = 46;
const ACT2_HOLD = 70;

const WORDS = ['banana', 'cabbage', 'baobab', 'alfalfa'];

function makeScene(seed) {
  const rand = mulberry32(seed);
  const word = WORDS[Math.floor(rand() * WORDS.length)] + '|';
  const n = word.length;
  const rots = Array.from({ length: n }, (_, i) => word.slice(i) + word.slice(0, i));
  const order = [...Array(n).keys()].sort((a, b) => (rots[a] < rots[b] ? -1 : 1));
  // startRow[r] = where rotation r sits initially (deal order), endRow = sorted pos
  const endRow = Array(n).fill(0);
  order.forEach((r, pos) => {
    endRow[r] = pos;
  });
  const last = order.map((r) => rots[r][n - 1]).join('');
  return { word, n, rots, endRow, last };
}

const BARS = [
  { label: 'H0 raw', v: 3.9, color: 'dim', note: '' },
  { label: 'H0 BWT', v: 3.9, color: 'algo', note: 'identical: a permutation' },
  { label: 'MTF(raw)', v: 4.23, color: 'warn', note: 'worse than nothing' },
  { label: 'MTF(BWT)', v: 1.36, color: 'good', note: 'the coder got smart' },
];

export default function BwtViz() {
  const canvasRef = useRef(null);
  const cycle = useRef(0);
  const statsRef = useRef({ line: '' });
  const [restart, setRestart] = useState(0);
  const [snap, setSnap] = useState({ line: '' });

  useEffect(() => {
    const id = setInterval(() => setSnap({ ...statsRef.current }), 400);
    return () => clearInterval(id);
  }, []);

  const ACT1_TOTAL = SORT_TICKS + LIFT_TICKS + ACT1_HOLD;
  const ACT2_TOTAL = BARS.length * BAR_TICKS + ACT2_HOLD;

  useCanvasLoop(
    canvasRef,
    {
      width: W,
      height: H,
      stepMs: 45,
      init: () => ({
        scene: makeScene(SEED + cycle.current * 9161),
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
              scene: makeScene(SEED + cycle.current * 9161),
              act: 0,
              tick: 0,
              rest: 0,
            });
          }
          return true;
        }
        s.tick += 1;
        if (s.tick >= (s.act === 0 ? ACT1_TOTAL : ACT2_TOTAL)) {
          s.tick = 0;
          s.act += 1;
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
        const charColor = (ch) => {
          if (ch === '|') return colors.dim;
          const hues = { a: colors.heur, b: colors.algo, n: colors.good, c: '#c589e8', g: '#e8a5c0', e: '#7dd3c0', o: '#e8c07d', l: '#8fa8e8', f: '#e88f8f' };
          return hues[ch] || '#9aa5bd';
        };

        const done = s.act >= 2;
        const actIdx = done ? 1 : s.act;

        if (actIdx === 0) {
          const sc = s.scene;
          const t = s.tick;
          const sortF = Math.min(1, t / SORT_TICKS);
          const liftF = Math.max(0, Math.min(1, (t - SORT_TICKS) / LIFT_TICKS));
          ctx.fillStyle = colors.dim;
          ctx.font = '11px ui-monospace, monospace';
          ctx.fillText(`act 1 · the rotations of “${sc.word}” glide into sorted order · the last column lifts out`, 14, 20);
          const rowY = (r) => 46 + r * 26;
          const ease = (f) => f * f * (3 - 2 * f);
          for (let r = 0; r < sc.n; r++) {
            const y = rowY(r) + (rowY(sc.endRow[r]) - rowY(r)) * ease(sortF);
            for (let j = 0; j < sc.n; j++) {
              const ch = sc.rots[r][j];
              const isLast = j === sc.n - 1;
              let x = 80 + j * 30;
              if (isLast && liftF > 0) x += 220 * ease(liftF);
              ctx.fillStyle = isLast ? charColor(ch) : '#5a647d';
              ctx.font = isLast ? 'bold 16px ui-monospace, monospace' : '15px ui-monospace, monospace';
              ctx.fillText(ch, x, y);
            }
          }
          if (liftF >= 1) {
            ctx.fillStyle = colors.dim;
            ctx.font = '11px ui-monospace, monospace';
            ctx.fillText(`last column: ${sc.last.split('').join(' ')}`, 330, 36);
          }
          let line;
          if (sortF < 1) {
            line = 'sorting rotations: rows find their shared-future neighbors';
            ctx.fillStyle = colors.dim;
          } else if (liftF < 1) {
            line = 'lifting the last column: the letter BEFORE each context';
            ctx.fillStyle = colors.heur;
          } else {
            line = `same letters as “${sc.word}”, new neighbors: the runs were bought by the sort`;
            ctx.fillStyle = colors.good;
          }
          ctx.font = '12px ui-monospace, monospace';
          ctx.fillText(line, 14, H - 12);
          statsRef.current = { line };
        } else {
          const t = done ? ACT2_TOTAL - 1 : s.tick;
          const grown = Math.min(Math.floor(t / BAR_TICKS) + 1, BARS.length);
          const frac = Math.min(1, ((t % BAR_TICKS) + 1) / (BAR_TICKS - 8));
          ctx.fillStyle = colors.dim;
          ctx.font = '11px ui-monospace, monospace';
          ctx.fillText('act 2 · the meters (measured at 21,697 chars): order-0 entropy, bits per symbol', 14, 20);
          BARS.forEach((b, i) => {
            if (i >= grown) return;
            const f = i === grown - 1 && !done ? frac : 1;
            const h = (b.v / 4.5) * 190 * f;
            ctx.fillStyle = colors[b.color];
            ctx.fillRect(70 + i * 140, 240 - h, 76, h);
            ctx.fillStyle = colors.dim;
            ctx.font = '11px ui-monospace, monospace';
            ctx.fillText(b.label, 70 + i * 140, 258);
            if (f >= 1) {
              ctx.fillStyle = colors[b.color];
              ctx.fillText(b.v.toFixed(2), 92 + i * 140, 232 - h);
              ctx.font = '10px ui-monospace, monospace';
              ctx.fillText(b.note, 60 + i * 140, 274);
            }
          });
          if (grown >= 2) {
            ctx.strokeStyle = colors.algo;
            ctx.setLineDash([4, 4]);
            ctx.beginPath();
            const hh = 240 - (3.9 / 4.5) * 190;
            ctx.moveTo(60, hh);
            ctx.lineTo(360, hh);
            ctx.stroke();
            ctx.setLineDash([]);
          }
          const line =
            grown >= 4 && (done || frac >= 1)
              ? 'the transform compressed nothing: it made the next stage smart: 3.90 → 1.36'
              : 'watch the first two bars land at the same height: the permutation identity';
          ctx.fillStyle = grown >= 4 ? colors.good : colors.dim;
          ctx.font = '12px ui-monospace, monospace';
          ctx.fillText(line, 14, H - 12);
          statsRef.current = { line };
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
          new word
        </button>
        <span className="viz-stat">
          {snap.line || 'the rotations assemble…'}
        </span>
      </div>
    </>
  );
}
