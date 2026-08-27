import { useEffect, useRef, useState } from 'react';
import { useCanvasLoop, isStill, holdTicks, mulberry32 } from './useCanvasLoop.js';

// The lanes, working. Keys stand in the base lane with coin-flipped towers
// above. Operations alternate: a SEARCH rides the top lane right (green
// trail), overshoots, takes the stairs down, and repeats to the target; an
// INSERT shows its coin flips (H H T -> tower of 3) and splices the new
// tower in amber. The visit counter under each op is the expected-log
// promise, one operation at a time.
const W = 640;
const H = 300;
const SEED = 20260827;
const TICKS_PER_MOVE = 8;
const LANE_Y = [232, 178, 124, 70];

function makeScene(seed) {
  const rand = mulberry32(seed);
  // Start with 11 keys, coin towers; script 8 ops (searches + inserts).
  const keys = [];
  let v = 4;
  while (keys.length < 11) {
    keys.push(v);
    v += 3 + Math.floor(rand() * 9);
  }
  const height = () => {
    let h = 1;
    while (h < 4 && rand() < 0.5) h += 1;
    return h;
  };
  const items = keys.map((k) => ({ k, h: height() }));
  const ops = [];
  for (let i = 0; i < 8; i++) {
    if (i % 2 === 0) {
      const target = items[Math.floor(rand() * items.length)].k;
      ops.push({ kind: 'search', target });
    } else {
      const nk = 3 + Math.floor(rand() * (v + 6));
      ops.push({ kind: 'insert', target: nk, h: height() });
    }
  }
  return { items, ops };
}

function searchPath(items, target) {
  // Returns list of {x-index in items+head, level} moves; head = -1.
  const moves = [];
  let at = -1;
  for (let lvl = 3; lvl >= 0; lvl--) {
    for (;;) {
      let nxt = -1;
      for (let j = at + 1; j < items.length; j++) {
        if (items[j].h > lvl) {
          nxt = j;
          break;
        }
      }
      if (nxt >= 0 && items[nxt].k < target) {
        at = nxt;
        moves.push({ i: at, lvl, ride: true });
      } else break;
    }
    moves.push({ i: at, lvl: lvl - 1, ride: false });
  }
  moves.pop();
  return moves;
}

export default function SkipListViz() {
  const canvasRef = useRef(null);
  const cycle = useRef(0);
  const statsRef = useRef({ opLabel: '', visits: 0 });
  const [restart, setRestart] = useState(0);
  const [snap, setSnap] = useState({ opLabel: '', visits: 0 });

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
      init: () => {
        const scene = makeScene(SEED + cycle.current * 7919);
        return {
          scene,
          items: scene.items.map((x) => ({ ...x })),
          opIdx: 0,
          moveIdx: 0,
          path: null,
          tick: 0,
          rest: 0,
          stopAtRest: isStill(),
        };
      },
      tick: (s) => {
        if (s.opIdx >= s.scene.ops.length) {
          if (s.stopAtRest) return false;
          s.rest += 1;
          if (s.rest > holdTicks(s)) {
            cycle.current += 1;
            const scene = makeScene(SEED + cycle.current * 7919);
            Object.assign(s, {
              scene,
              items: scene.items.map((x) => ({ ...x })),
              opIdx: 0,
              moveIdx: 0,
              path: null,
              tick: 0,
              rest: 0,
            });
          }
          return true;
        }
        s.tick += 1;
        if (s.path === null) {
          const op = s.scene.ops[s.opIdx];
          s.path = searchPath(s.items, op.target);
          s.moveIdx = 0;
        }
        if (s.tick % TICKS_PER_MOVE === 0) {
          s.moveIdx += 1;
          if (s.moveIdx > s.path.length + 2) {
            const op = s.scene.ops[s.opIdx];
            if (op.kind === 'insert' && !s.items.some((x) => x.k === op.target)) {
              const pos = s.items.findIndex((x) => x.k > op.target);
              const entry = { k: op.target, h: op.h, fresh: 8 };
              if (pos < 0) s.items.push(entry);
              else s.items.splice(pos, 0, entry);
            }
            s.opIdx += 1;
            s.path = null;
          }
        }
        return true;
      },
      draw: (ctx, s) => {
        ctx.clearRect(0, 0, W, H);
        const css = getComputedStyle(document.documentElement);
        const algo = css.getPropertyValue('--algo').trim() || '#5da2ff';
        const heur = css.getPropertyValue('--heur').trim() || '#f0b94b';
        const path = css.getPropertyValue('--path').trim() || '#62d98a';
        const dim = css.getPropertyValue('--ink-dim').trim() || '#9aa5bd';
        const ink = css.getPropertyValue('--ink').trim() || '#e9edf6';

        const n = s.items.length;
        const xOf = (i) => 56 + (i * (W - 96)) / Math.max(n - 1, 1);
        for (let lvl = 0; lvl < 4; lvl++) {
          ctx.strokeStyle = 'rgba(93,162,255,0.14)';
          ctx.beginPath();
          ctx.moveTo(24, LANE_Y[lvl]);
          ctx.lineTo(W - 16, LANE_Y[lvl]);
          ctx.stroke();
        }
        s.items.forEach((item, i) => {
          const fresh = item.fresh && item.fresh > 0;
          if (fresh) item.fresh -= 0.2;
          for (let lvl = 0; lvl < item.h; lvl++) {
            ctx.fillStyle = fresh ? `${heur}44` : 'rgba(93,162,255,0.12)';
            ctx.strokeStyle = fresh ? heur : `${algo}88`;
            ctx.lineWidth = 1.1;
            ctx.fillRect(xOf(i) - 12, LANE_Y[lvl] - 10, 24, 20);
            ctx.strokeRect(xOf(i) - 11.5, LANE_Y[lvl] - 9.5, 23, 19);
          }
          ctx.fillStyle = ink;
          ctx.font = '10px ui-monospace, monospace';
          ctx.textAlign = 'center';
          ctx.fillText(String(item.k), xOf(i), LANE_Y[0] + 4);
          ctx.textAlign = 'start';
        });
        // Search path so far.
        const op = s.opIdx < s.scene.ops.length ? s.scene.ops[s.opIdx] : null;
        if (op && s.path) {
          const upto = Math.min(s.moveIdx, s.path.length);
          ctx.strokeStyle = path;
          ctx.lineWidth = 2.2;
          ctx.beginPath();
          let px = 30;
          let py = LANE_Y[3];
          ctx.moveTo(px, py);
          for (let m = 0; m < upto; m++) {
            const mv = s.path[m];
            const nx = mv.i < 0 ? 30 : xOf(mv.i);
            const ny = LANE_Y[Math.max(mv.lvl, 0)];
            if (mv.ride) ctx.lineTo(nx, py);
            else {
              ctx.lineTo(px, ny);
            }
            px = mv.ride ? nx : px;
            py = ny;
          }
          ctx.stroke();
          ctx.fillStyle = dim;
          ctx.font = '11px ui-monospace, monospace';
          const visits = upto;
          const coin = op.kind === 'insert' ? ` · coin: ${'H'.repeat(op.h - 1)}T → tower ${op.h}` : '';
          ctx.fillText(
            `op ${s.opIdx + 1}/${s.scene.ops.length}: ${op.kind} ${op.target} · moves ${visits}${coin}`,
            14,
            22,
          );
          statsRef.current = { opLabel: `${op.kind} ${op.target}`, visits };
        } else {
          ctx.fillStyle = dim;
          ctx.font = '11px ui-monospace, monospace';
          ctx.fillText('the lanes rest · every tower chose its own height', 14, 22);
        }
        ctx.fillStyle = dim;
        ctx.font = '10px ui-monospace, monospace';
        ctx.fillText('ride right · overshoot · stairs down · repeat', 14, H - 10);
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
          new lanes
        </button>
        <span className="viz-stat">
          {snap.opLabel
            ? <>{snap.opLabel} in <strong>{snap.visits}</strong> moves · expected 2·log₂ n, arrival order irrelevant</>
            : 'flipping coins for tower heights…'}
        </span>
      </div>
    </>
  );
}
