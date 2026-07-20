import { useEffect, useRef, useState } from 'react';
import { useCanvasLoop, prefersReducedMotion } from './useCanvasLoop.js';
import { makeGrid, makeSearch, drawSearch } from './astarModel.js';

const COLS = 32;
const ROWS = 20;
const CELL = 20;
const W = COLS * CELL;
const H = ROWS * CELL;
const SEED = 20260720;

const MODES = [
  { key: 'dijkstra', label: 'no heuristic', weight: 0 },
  { key: 'astar', label: 'manhattan · a*', weight: 1 },
  { key: 'greedy', label: '3× manhattan', weight: 3 },
];

// The live searcher. One maze at a time; switching modes re-runs the SAME
// maze under a different heuristic weight so the explored-cell counts are
// honestly comparable. When a run finishes and rests, a fresh maze arrives
// and the per-maze comparison resets.
export default function AStarViz() {
  const canvasRef = useRef(null);
  const [modeKey, setModeKey] = useState('astar');
  const [restartTick, setRestartTick] = useState(0);
  const cycleRef = useRef(0);
  const countsRef = useRef({});
  const [snap, setSnap] = useState({ explored: 0, len: null, counts: {} });

  const mode = MODES.find((m) => m.key === modeKey);

  useCanvasLoop(
    canvasRef,
    {
      width: W,
      height: H,
      stepMs: 36,
      init: () => {
        const grid = makeGrid(COLS, ROWS, SEED + cycleRef.current * 1013);
        return {
          search: makeSearch(grid, mode.weight),
          phase: 'search',
          reveal: 0,
          rest: 0,
          stopAtRest: prefersReducedMotion(),
        };
      },
      tick: (st) => {
        if (st.phase === 'search') {
          for (let k = 0; k < 3; k += 1) {
            const r = st.search.step();
            if (r === 'found') {
              st.phase = 'trace';
              st.reveal = 1;
              countsRef.current[st.search.hWeight] = {
                explored: st.search.explored,
                len: st.search.path.length,
              };
              break;
            }
            if (r === 'exhausted') {
              st.phase = 'rest';
              st.rest = 40;
              break;
            }
          }
        } else if (st.phase === 'trace') {
          st.reveal += 2;
          if (st.reveal >= st.search.path.length) {
            st.phase = 'rest';
            st.rest = 60;
            if (st.stopAtRest) return false;
          }
        } else {
          st.rest -= 1;
          if (st.rest <= 0) {
            cycleRef.current += 1;
            countsRef.current = {};
            const grid = makeGrid(COLS, ROWS, SEED + cycleRef.current * 1013);
            st.search = makeSearch(grid, mode.weight);
            st.phase = 'search';
            st.reveal = 0;
          }
        }
        return true;
      },
      draw: (ctx, st) => {
        drawSearch(ctx, st.search, CELL, st.phase === 'trace' ? st.reveal : Infinity);
      },
    },
    [modeKey, restartTick]
  );

  // Mirror the model's counters into React at a slow cadence for the stat line.
  useEffect(() => {
    const id = setInterval(() => {
      setSnap((prev) => {
        const counts = countsRef.current;
        return { ...prev, counts: { ...counts } };
      });
    }, 400);
    return () => clearInterval(id);
  }, []);

  const counts = snap.counts;
  const fmt = (w) => (counts[w] ? counts[w].explored : null);
  const dijkstra = fmt(0);
  const astar = fmt(1);
  const greedy = fmt(3);
  const cmp = [
    dijkstra != null && `dijkstra ${dijkstra}`,
    astar != null && `a* ${astar}`,
    greedy != null && `greedy ${greedy}`,
  ]
    .filter(Boolean)
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
        <button type="button" className="btn" onClick={() => {
          cycleRef.current += 1;
          countsRef.current = {};
          setRestartTick((t) => t + 1);
        }}>
          new maze
        </button>
        <span className="viz-stat">
          {cmp ? <>cells explored · {cmp}</> : 'watching the frontier…'}
        </span>
      </div>
    </>
  );
}
