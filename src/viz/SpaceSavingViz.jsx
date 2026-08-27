import { useEffect, useRef, useState } from 'react';
import { useCanvasLoop, isStill, holdTicks, mulberry32 } from './useCanvasLoop.js';

// Two acts on twelve seats. Bars are counters, sorted live: the solid
// blue span is count minus error (witnessed marks), the pale span is
// the inherited wristband. Act one streams Zipf traffic: the head
// bars grow long and almost entirely solid while the bottom seats
// churn: red eviction flashes, newcomers inheriting pale tails. Act
// two streams uniform traffic: the same machinery, and the bars come
// out nearly all wristband: a ranked table of placeholders,
// confessing.
const W = 640;
const H = 300;
const SEED = 20260827;
const M = 12;
const ITEMS_PER_ACT = 150;
const ITEM_TICKS = 4;
const END_HOLD = 64;

function makeScene(seed) {
  const rand = mulberry32(seed);
  const zipfCum = [];
  let acc = 0;
  for (let r = 0; r < 300; r++) {
    acc += 1 / Math.pow(r + 1, 1.15);
    zipfCum.push(acc);
  }
  const total = zipfCum[zipfCum.length - 1];
  const drawZipf = () => {
    const u = rand() * total;
    let lo = 0;
    let hi = zipfCum.length - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (zipfCum[mid] < u) lo = mid + 1;
      else hi = mid;
    }
    return lo;
  };
  const acts = [
    {
      note: 'act 1 · Zipf traffic: the head outruns the churn',
      items: Array.from({ length: ITEMS_PER_ACT }, drawZipf),
      bad: false,
    },
    {
      note: 'act 2 · uniform traffic: same machinery, nothing to find',
      items: Array.from({ length: ITEMS_PER_ACT }, () => Math.floor(rand() * 300)),
      bad: true,
    },
  ];
  // Precompute per-step table snapshots for each act.
  acts.forEach((act) => {
    const count = new Map();
    const err = new Map();
    act.frames = act.items.map((x) => {
      let evicted = null;
      if (count.has(x)) {
        count.set(x, count.get(x) + 1);
      } else if (count.size < M) {
        count.set(x, 1);
        err.set(x, 0);
      } else {
        let victim = null;
        let vmin = Infinity;
        count.forEach((c, k) => {
          if (c < vmin) {
            vmin = c;
            victim = k;
          }
        });
        evicted = victim;
        count.delete(victim);
        err.delete(victim);
        count.set(x, vmin + 1);
        err.set(x, vmin);
      }
      const rows = [...count.entries()]
        .map(([k, c]) => ({ item: k, count: c, err: err.get(k) }))
        .sort((a, b) => b.count - a.count);
      return { rows, incoming: x, evicted };
    });
  });
  return { acts };
}

export default function SpaceSavingViz() {
  const canvasRef = useRef(null);
  const cycle = useRef(0);
  const statsRef = useRef({ line: '' });
  const [restart, setRestart] = useState(0);
  const [snap, setSnap] = useState({ line: '' });

  useEffect(() => {
    const id = setInterval(() => setSnap({ ...statsRef.current }), 400);
    return () => clearInterval(id);
  }, []);

  const ACT_TOTAL = ITEMS_PER_ACT * ITEM_TICKS + END_HOLD;

  useCanvasLoop(
    canvasRef,
    {
      width: W,
      height: H,
      stepMs: 45,
      init: () => ({
        scene: makeScene(SEED + cycle.current * 8887),
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
              scene: makeScene(SEED + cycle.current * 8887),
              act: 0,
              tick: 0,
              rest: 0,
            });
          }
          return true;
        }
        s.tick += 1;
        if (s.tick >= ACT_TOTAL) {
          // Hold the finished act for the full rest before the next
          // act begins: every burst of motion earns its two minutes.
          s.tick = ACT_TOTAL;
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

        const done = s.act >= 2;
        const actIdx = done ? 1 : s.act;
        const act = s.scene.acts[actIdx];
        const tick = done ? ACT_TOTAL - 1 : s.tick;
        const step = Math.min(Math.floor(tick / ITEM_TICKS), ITEMS_PER_ACT - 1);
        const finished = tick >= ITEMS_PER_ACT * ITEM_TICKS;
        const frame = act.frames[step];
        const maxC = Math.max(...frame.rows.map((r) => r.count), 1);

        ctx.fillStyle = dim;
        ctx.font = '11px ui-monospace, monospace';
        ctx.fillText(act.note, 14, 20);
        ctx.fillText('solid: witnessed (count − err) · pale: inherited wristband', 14, 36);

        frame.rows.forEach((r, i) => {
          const y = 48 + i * 17;
          const w = (r.count / maxC) * 430;
          const werr = (r.err / maxC) * 430;
          ctx.fillStyle = algo;
          ctx.fillRect(140, y, Math.max(1, w - werr), 12);
          ctx.fillStyle = '#3a4560';
          ctx.fillRect(140 + Math.max(1, w - werr), y, werr, 12);
          const justIn = !finished && r.item === frame.incoming;
          ctx.fillStyle = justIn ? heur : dim;
          ctx.font = '10px ui-monospace, monospace';
          ctx.fillText(`#${r.item}`, 100, y + 10);
          ctx.fillText(`${r.count}${r.err ? `±${r.err}` : ''}`, 578, y + 10);
        });

        if (!finished && frame.evicted !== null) {
          ctx.fillStyle = warn;
          ctx.font = '11px ui-monospace, monospace';
          ctx.fillText(`evicted #${frame.evicted}: the newcomer inherits its tally`, 140, 268);
        }

        let line;
        if (!finished) {
          line = `item ${step + 1}/${ITEMS_PER_ACT} arrives: #${frame.incoming}`;
          ctx.fillStyle = dim;
        } else {
          const top3 = frame.rows.slice(0, 3);
          const frac = top3.map((r) => (r.count ? r.err / r.count : 0));
          const worst = Math.max(...frac);
          if (act.bad) {
            line = `top seats ${Math.round(worst * 100)}% wristband: placeholders, confessing: no head exists`;
            ctx.fillStyle = warn;
          } else {
            line = `head bars nearly all solid (worst top-3 wristband ${Math.round(worst * 100)}%): real measurement`;
            ctx.fillStyle = good;
          }
        }
        ctx.font = '12px ui-monospace, monospace';
        ctx.fillText(line, 14, H - 12);

        statsRef.current = {
          line: done ? 'rank by count, trust by the gap' : line,
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
          new stream
        </button>
        <span className="viz-stat">
          {snap.line || 'the seats fill…'}
        </span>
      </div>
    </>
  );
}
