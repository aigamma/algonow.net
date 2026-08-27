import { useEffect, useRef, useState } from 'react';
import { useCanvasLoop, isStill, holdTicks, mulberry32 } from './useCanvasLoop.js';

// The phantom tree, walking. Sixteen cells, and above them the arc every
// index owns: a block of length lowbit(i) ending at i. Operations arrive
// one at a time: a QUERY descends i -= lowbit(i), lighting the green arcs
// whose blocks tile the prefix; an UPDATE climbs i += lowbit(i), lighting
// amber every owner of the changed cell. The counter under each op is the
// whole complexity story: touches equal set bits, never more than log n.
const N = 16;
const W = 640;
const H = 300;
const CELL = 35;
const X0 = 40;
const BASE_Y = 196;
const SEED = 20260827;
const TICKS_PER_STEP = 12;
const OPS_PER_CYCLE = 12;

function lowbit(i) {
  return i & -i;
}

function makeOps(seed) {
  const rand = mulberry32(seed);
  const ops = [];
  for (let k = 0; k < OPS_PER_CYCLE; k++) {
    const isQuery = k % 2 === 0;
    if (isQuery) {
      let i = 1 + Math.floor(rand() * N);
      const walk = [];
      while (i > 0) {
        walk.push(i);
        i -= lowbit(i);
      }
      ops.push({ kind: 'query', at: walk[0], walk });
    } else {
      let i = 1 + Math.floor(rand() * N);
      const start = i;
      const walk = [];
      while (i <= N) {
        walk.push(i);
        i += lowbit(i);
      }
      ops.push({ kind: 'update', at: start, walk });
    }
  }
  return ops;
}

export default function FenwickViz() {
  const canvasRef = useRef(null);
  const cycle = useRef(0);
  const statsRef = useRef({ label: '', touches: 0 });
  const [restart, setRestart] = useState(0);
  const [snap, setSnap] = useState({ label: '', touches: 0 });

  useEffect(() => {
    const id = setInterval(() => setSnap({ ...statsRef.current }), 400);
    return () => clearInterval(id);
  }, []);

  useCanvasLoop(
    canvasRef,
    {
      width: W,
      height: H,
      stepMs: 40,
      init: () => ({
        ops: makeOps(SEED + cycle.current * 7919),
        tick: 0,
        rest: 0,
        stopAtRest: isStill(),
      }),
      tick: (s) => {
        const totalSteps = s.ops.reduce((a, o) => a + o.walk.length + 2, 0);
        if (s.tick >= totalSteps * TICKS_PER_STEP) {
          if (s.stopAtRest) return false;
          s.rest += 1;
          if (s.rest > holdTicks(s)) {
            cycle.current += 1;
            s.ops = makeOps(SEED + cycle.current * 7919);
            s.tick = 0;
            s.rest = 0;
          }
          return true;
        }
        s.tick += 1;
        return true;
      },
      draw: (ctx, s) => {
        ctx.clearRect(0, 0, W, H);
        const css = getComputedStyle(document.documentElement);
        const heur = css.getPropertyValue('--heur').trim() || '#f0b94b';
        const path = css.getPropertyValue('--path').trim() || '#62d98a';
        const dim = css.getPropertyValue('--ink-dim').trim() || '#9aa5bd';
        const ink = css.getPropertyValue('--ink').trim() || '#e9edf6';

        // Locate the current op and step within it.
        let step = Math.floor(s.tick / TICKS_PER_STEP);
        let op = null;
        let opIdx = 0;
        let within = 0;
        for (let k = 0; k < s.ops.length; k++) {
          const len = s.ops[k].walk.length + 2;
          if (step < len) {
            op = s.ops[k];
            opIdx = k;
            within = step;
            break;
          }
          step -= len;
        }
        const litCount = op ? Math.min(within, op.walk.length) : 0;
        const lit = op ? new Set(op.walk.slice(0, litCount)) : new Set();

        // Cells.
        for (let k = 1; k <= N; k++) {
          const x = X0 + (k - 1) * CELL;
          const isAt = op && k === op.at && litCount > 0;
          ctx.fillStyle = isAt ? `${heur}30` : 'rgba(93,162,255,0.08)';
          ctx.fillRect(x, BASE_Y, CELL - 4, 26);
          ctx.strokeStyle = isAt ? heur : '#2b3650';
          ctx.strokeRect(x + 0.5, BASE_Y + 0.5, CELL - 5, 25);
          ctx.fillStyle = dim;
          ctx.font = '11px ui-monospace, monospace';
          ctx.textAlign = 'center';
          ctx.fillText(String(k), x + (CELL - 4) / 2, BASE_Y + 17);
          ctx.textAlign = 'start';
        }
        // Ownership arcs.
        for (let i = 1; i <= N; i++) {
          const len = lowbit(i);
          const x1 = X0 + (i - len) * CELL + 2;
          const x2 = X0 + (i - 1) * CELL + CELL - 8;
          const h = 26 + Math.log2(len) * 34;
          const hot = lit.has(i);
          ctx.strokeStyle = hot
            ? op.kind === 'query'
              ? path
              : heur
            : 'rgba(93,162,255,0.28)';
          ctx.lineWidth = hot ? 2.6 : 1.1;
          ctx.beginPath();
          ctx.moveTo(x1, BASE_Y - 4);
          ctx.bezierCurveTo(x1, BASE_Y - 4 - h, x2, BASE_Y - 4 - h, x2, BASE_Y - 4);
          ctx.stroke();
        }
        // Caption.
        ctx.font = '11px ui-monospace, monospace';
        ctx.fillStyle = dim;
        if (op) {
          const verb =
            op.kind === 'query'
              ? `prefix(${op.at}): descend i −= lowbit(i)`
              : `update(${op.at}): climb i += lowbit(i)`;
          const seq = op.walk.slice(0, litCount).join(' → ') || '…';
          ctx.fillText(`op ${opIdx + 1}/${s.ops.length} · ${verb}`, 14, 24);
          ctx.fillStyle = op.kind === 'query' ? path : heur;
          ctx.fillText(`${seq}   (${litCount} touches)`, 14, 44);
          statsRef.current = { label: verb, touches: litCount };
        } else {
          ctx.fillText('the arcs are the tree · nobody built them', 14, 24);
        }
        ctx.fillStyle = dim;
        ctx.fillText('each index owns a block of length lowbit(i), drawn as its arc', 14, H - 14);
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
          new ops
        </button>
        <span className="viz-stat">
          {snap.touches > 0
            ? <>{snap.label} · <strong>{snap.touches}</strong> touches: the popcount, never more than log n</>
            : 'reading the desk numbers in binary…'}
        </span>
      </div>
    </>
  );
}
