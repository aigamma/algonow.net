import { useEffect, useRef, useState } from 'react';
import { useCanvasLoop, prefersReducedMotion, mulberry32 } from './useCanvasLoop.js';

const W = 640;
const H = 400;
const N = 14;
const SEED = 140514;

const MODES = [
  { key: 'bounded', label: 'with the bound' },
  { key: 'enumerate', label: 'enumerate everything' },
];

function makeInstance(seed) {
  const rng = mulberry32(seed);
  const items = [];
  for (let i = 0; i < N; i += 1) {
    items.push({ w: 5 + Math.floor(rng() * 21), v: 8 + Math.floor(rng() * 53) });
  }
  items.sort((a, b) => b.v / b.w - a.v / a.w);
  const capacity = Math.floor(items.reduce((s, it) => s + it.w, 0) * 0.4);
  const maxDensity = items[0].v / items[0].w;
  return { items, capacity, maxDensity };
}

function fractionalBound(items, i, weightLeft, value) {
  let bound = value;
  for (let k = i; k < items.length; k += 1) {
    if (items[k].w <= weightLeft) {
      weightLeft -= items[k].w;
      bound += items[k].v;
    } else {
      bound += items[k].v * (weightLeft / items[k].w);
      break;
    }
  }
  return bound;
}

// Animated depth-first branch and bound. The left column is the item list in
// density order with the current path's include/exclude marks; the right
// meters show packed weight against capacity and packed value against both
// the best bag so far (green) and the current subtree's optimistic ceiling
// (amber). When the amber ceiling drops to the green line, the subtree dies.
export default function KnapsackViz() {
  const canvasRef = useRef(null);
  const [modeKey, setModeKey] = useState('bounded');
  const [restartTick, setRestartTick] = useState(0);
  const cycleRef = useRef(0);
  const countsRef = useRef({});
  const liveRef = useRef({ nodes: 0, pruned: 0, best: 0 });
  const [snap, setSnap] = useState({ nodes: 0, pruned: 0, best: 0, counts: {} });

  useCanvasLoop(
    canvasRef,
    {
      width: W,
      height: H,
      stepMs: 40,
      maxTicks: 40000,
      init: () => {
        const inst = makeInstance(SEED + cycleRef.current * 449);
        return {
          ...inst,
          // Explicit DFS: stage 0 = try include, 1 = try exclude, 2 = retreat.
          stack: [{ i: 0, stage: 0 }],
          decision: new Int8Array(N).fill(-1), // -1 undecided, 1 in, 0 out
          weight: 0,
          value: 0,
          best: 0,
          bestSet: new Int8Array(N),
          bound: 0,
          nodes: 0,
          pruned: 0,
          flash: 0,
          phase: 'search',
          rest: 0,
          stopAtRest: prefersReducedMotion(),
        };
      },
      tick: (st) => {
        if (st.phase === 'search') {
          const budget = st.nodes > 3000 ? 120 : st.nodes > 600 ? 24 : 5;
          for (let op = 0; op < budget && st.phase === 'search'; op += 1) {
            const top = st.stack[st.stack.length - 1];
            if (!top) {
              countsRef.current[modeKey] = { nodes: st.nodes, pruned: st.pruned };
              st.phase = 'rest';
              st.rest = 100;
              st.decision.set(st.bestSet);
              if (st.stopAtRest) return false;
              break;
            }
            if (top.stage === 0) {
              st.nodes += 1;
              if (st.value > st.best) {
                st.best = st.value;
                st.bestSet.fill(0);
                for (let k = 0; k < N; k += 1) if (st.decision[k] === 1) st.bestSet[k] = 1;
              }
              st.bound = fractionalBound(st.items, top.i, st.capacity - st.weight, st.value);
              if (top.i === N) {
                st.stack.pop();
                continue;
              }
              if (modeKey === 'bounded' && st.bound <= st.best) {
                st.pruned += 1;
                st.flash = 7;
                st.stack.pop();
                continue;
              }
              top.stage = 1;
              if (st.items[top.i].w <= st.capacity - st.weight) {
                st.decision[top.i] = 1;
                st.weight += st.items[top.i].w;
                st.value += st.items[top.i].v;
                st.stack.push({ i: top.i + 1, stage: 0 });
              }
            } else if (top.stage === 1) {
              top.stage = 2;
              if (st.decision[top.i] === 1) {
                st.weight -= st.items[top.i].w;
                st.value -= st.items[top.i].v;
              }
              st.decision[top.i] = 0;
              st.stack.push({ i: top.i + 1, stage: 0 });
            } else {
              st.decision[top.i] = -1;
              st.stack.pop();
            }
          }
          liveRef.current = { nodes: st.nodes, pruned: st.pruned, best: st.best };
          if (st.flash > 0) st.flash -= 1;
        } else {
          st.rest -= 1;
          if (st.rest <= 0) {
            cycleRef.current += 1;
            countsRef.current = {};
            const inst = makeInstance(SEED + cycleRef.current * 449);
            Object.assign(st, {
              ...inst,
              stack: [{ i: 0, stage: 0 }],
              decision: new Int8Array(N).fill(-1),
              weight: 0,
              value: 0,
              best: 0,
              bestSet: new Int8Array(N),
              bound: 0,
              nodes: 0,
              pruned: 0,
              flash: 0,
              phase: 'search',
            });
          }
        }
        return true;
      },
      draw: (ctx, st) => {
        ctx.fillStyle = '#0d1119';
        ctx.fillRect(0, 0, W, H);
        const done = st.phase === 'rest';

        // Item list: one row per item, width by weight, brightness by density.
        const rowH = 25;
        const top0 = 22;
        ctx.font = '11px ui-monospace, Consolas, monospace';
        for (let k = 0; k < N; k += 1) {
          const it = st.items[k];
          const y = top0 + k * rowH;
          const bw = (it.w / 26) * 210;
          const density = it.v / it.w / st.maxDensity;
          const d = done ? (st.bestSet[k] ? 1 : 0) : st.decision[k];
          ctx.fillStyle =
            d === 1
              ? done
                ? 'rgba(98, 217, 138, 0.85)'
                : 'rgba(93, 162, 255, 0.85)'
              : d === 0
                ? 'rgba(107, 118, 144, 0.18)'
                : `rgba(233, 237, 246, ${0.15 + 0.4 * density})`;
          ctx.fillRect(30, y, bw, rowH - 7);
          ctx.fillStyle = d === 0 && !done ? '#3a4358' : '#9aa5bd';
          ctx.textAlign = 'left';
          ctx.textBaseline = 'middle';
          ctx.fillText(`${String(it.v).padStart(2)}pts`, 34 + bw, y + (rowH - 7) / 2);
        }
        ctx.fillStyle = '#6b7690';
        ctx.textAlign = 'left';
        ctx.fillText('items, densest first', 30, 12);

        // Capacity meter.
        const meterH = 330;
        const my = 40;
        ctx.fillStyle = '#161d2c';
        ctx.fillRect(360, my, 44, meterH);
        const wf = Math.min(1, st.weight / st.capacity);
        ctx.fillStyle = done ? '#62d98a' : '#5da2ff';
        ctx.fillRect(360, my + meterH * (1 - wf), 44, meterH * wf);
        ctx.strokeStyle = '#232c40';
        ctx.strokeRect(360, my, 44, meterH);
        ctx.fillStyle = '#9aa5bd';
        ctx.textAlign = 'center';
        ctx.fillText('weight', 382, my + meterH + 16);
        ctx.fillText(`${st.weight}/${st.capacity}`, 382, my - 10);

        // Value meter with best (green) and ceiling (amber) marks.
        const vmax = fractionalBound(st.items, 0, st.capacity, 0) * 1.05;
        ctx.fillStyle = '#161d2c';
        ctx.fillRect(470, my, 44, meterH);
        const vy = (val) => my + meterH * (1 - Math.min(1, val / vmax));
        ctx.fillStyle = 'rgba(93, 162, 255, 0.6)';
        ctx.fillRect(470, vy(st.value), 44, my + meterH - vy(st.value));
        ctx.strokeStyle = '#62d98a';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(462, vy(st.best));
        ctx.lineTo(522, vy(st.best));
        ctx.stroke();
        if (!done) {
          ctx.strokeStyle = st.flash > 0 ? '#e06767' : '#f0b94b';
          ctx.lineWidth = st.flash > 0 ? 3 : 2;
          ctx.beginPath();
          ctx.moveTo(462, vy(st.bound));
          ctx.lineTo(522, vy(st.bound));
          ctx.stroke();
        }
        ctx.strokeStyle = '#232c40';
        ctx.lineWidth = 1;
        ctx.strokeRect(470, my, 44, meterH);
        ctx.fillStyle = '#9aa5bd';
        ctx.fillText('value', 492, my + meterH + 16);
        ctx.fillText(`best ${st.best}`, 492, my - 10);

        ctx.textAlign = 'left';
        ctx.fillStyle = '#f0b94b';
        ctx.fillText('– ceiling (bound)', 540, my + 8);
        ctx.fillStyle = '#62d98a';
        ctx.fillText('– best bag', 540, my + 26);
        if (st.flash > 0) {
          ctx.fillStyle = '#e06767';
          ctx.fillText('discarded', 540, my + 48);
        }
      },
    },
    [modeKey, restartTick]
  );

  useEffect(() => {
    const id = setInterval(() => {
      setSnap({ ...liveRef.current, counts: { ...countsRef.current } });
    }, 400);
    return () => clearInterval(id);
  }, []);

  const done = MODES.filter((m) => snap.counts[m.key])
    .map((m) => `${m.key} ${snap.counts[m.key].nodes.toLocaleString()} nodes`)
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
            countsRef.current = {};
            setRestartTick((t) => t + 1);
          }}
        >
          new items
        </button>
        <span className="viz-stat">
          {done || (
            <>
              nodes <b>{snap.nodes.toLocaleString()}</b> · discarded{' '}
              <b>{snap.pruned}</b> · best <b>{snap.best}</b>
            </>
          )}
        </span>
      </div>
    </>
  );
}
