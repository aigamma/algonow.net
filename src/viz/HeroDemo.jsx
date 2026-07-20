import { useRef } from 'react';
import { useCanvasLoop, prefersReducedMotion } from './useCanvasLoop.js';
import { makeGrid, makeSearch, drawSearch } from './astarModel.js';

const COLS = 16;
const ROWS = 11;
const CELL = 20;

// The homepage's ambient solver: A* × Manhattan quietly solving small mazes
// on loop. No controls; the catalog below is where the interaction lives.
export default function HeroDemo() {
  const canvasRef = useRef(null);
  const cycle = useRef(0);

  useCanvasLoop(
    canvasRef,
    {
      width: COLS * CELL,
      height: ROWS * CELL,
      stepMs: 55,
      init: () => ({
        search: makeSearch(makeGrid(COLS, ROWS, 4242 + cycle.current * 271), 1),
        phase: 'search',
        reveal: 0,
        rest: 0,
        stopAtRest: prefersReducedMotion(),
      }),
      tick: (st) => {
        if (st.phase === 'search') {
          const r = st.search.step();
          if (r === 'found') {
            st.phase = 'trace';
            st.reveal = 1;
          } else if (r === 'exhausted') {
            st.phase = 'rest';
            st.rest = 30;
          }
        } else if (st.phase === 'trace') {
          st.reveal += 1;
          if (st.reveal >= st.search.path.length) {
            st.phase = 'rest';
            st.rest = 45;
            if (st.stopAtRest) return false;
          }
        } else {
          st.rest -= 1;
          if (st.rest <= 0) {
            cycle.current += 1;
            st.search = makeSearch(makeGrid(COLS, ROWS, 4242 + cycle.current * 271), 1);
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
    []
  );

  return (
    <div className="hero-demo">
      <canvas
        ref={canvasRef}
        style={{ aspectRatio: `${COLS * CELL} / ${ROWS * CELL}` }}
        aria-hidden="true"
      />
      <div className="demo-caption">
        <span className="legend">
          <i>settled</i>
          <i className="lg-heur">frontier</i>
          <i className="lg-path">path</i>
        </span>
        <span>a* × manhattan, live</span>
      </div>
    </div>
  );
}
