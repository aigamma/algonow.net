import { useEffect, useRef, useState } from 'react';
import { useCanvasLoop, prefersReducedMotion, mulberry32 } from './useCanvasLoop.js';

const W = 640;
const H = 400;
const B = 3;
const DEPTH = 4; // root level 0 .. leaves level 4
const N_LEAVES = B ** DEPTH; // 81
const LEVEL_Y = [26, 112, 198, 284, 370];
const SEED = 3141;

const MODES = [
  { key: 'informed', label: 'best-first order' },
  { key: 'shuffled', label: 'random order' },
  { key: 'adverse', label: 'worst-first order' },
];

// Full B-ary tree in an array: node 0 is root; children of n are n*B+1..n*B+B.
const N_NODES = (B ** (DEPTH + 1) - 1) / (B - 1); // 121
const firstLeaf = N_NODES - N_LEAVES;
const levelOf = (n) => {
  let level = 0;
  let count = 1;
  let start = 0;
  while (n >= start + count) {
    start += count;
    count *= B;
    level += 1;
  }
  return level;
};
const isMaxLevel = (level) => level % 2 === 0;

function buildTree(seed) {
  const rng = mulberry32(seed);
  const value = new Float64Array(N_NODES);
  for (let i = firstLeaf; i < N_NODES; i += 1) value[i] = Math.floor(rng() * 100);
  for (let i = firstLeaf - 1; i >= 0; i -= 1) {
    const kids = [];
    for (let k = 1; k <= B; k += 1) kids.push(value[i * B + k]);
    value[i] = isMaxLevel(levelOf(i)) ? Math.max(...kids) : Math.min(...kids);
  }
  // Node x positions: leaves evenly spaced, parents centered over children.
  const x = new Float64Array(N_NODES);
  for (let i = 0; i < N_LEAVES; i += 1) x[firstLeaf + i] = 12 + (i * (W - 24)) / (N_LEAVES - 1);
  for (let i = firstLeaf - 1; i >= 0; i -= 1) {
    let sum = 0;
    for (let k = 1; k <= B; k += 1) sum += x[i * B + k];
    x[i] = sum / B;
  }
  return { value, x, rng };
}

function childOrder(tree, node, mode) {
  const kids = [node * B + 1, node * B + 2, node * B + 3];
  if (mode === 'shuffled') {
    const r = mulberry32(SEED + node * 31);
    for (let i = kids.length - 1; i > 0; i -= 1) {
      const j = Math.floor(r() * (i + 1));
      [kids[i], kids[j]] = [kids[j], kids[i]];
    }
    return kids;
  }
  const max = isMaxLevel(levelOf(node));
  kids.sort((a, b) => (tree.value[a] - tree.value[b]) * (max ? -1 : 1));
  if (mode === 'adverse') kids.reverse();
  return kids;
}

function markPruned(state, node) {
  state.mark[node] = 3;
  if (node < firstLeaf) {
    for (let k = 1; k <= B; k += 1) markPruned(state, node * B + k);
  }
}

// Animated alpha-beta over the same tree under three child orderings. The
// ordering IS the heuristic: perfect ordering collapses the windows almost
// immediately; adverse ordering degenerates to plain minimax.
export default function MinimaxViz() {
  const canvasRef = useRef(null);
  const [modeKey, setModeKey] = useState('informed');
  const [restartTick, setRestartTick] = useState(0);
  const cycleRef = useRef(0);
  const countsRef = useRef({});
  const liveRef = useRef({ leaves: 0, alpha: -Infinity, beta: Infinity });
  const [snap, setSnap] = useState({ leaves: 0, counts: {} });

  useCanvasLoop(
    canvasRef,
    {
      width: W,
      height: H,
      stepMs: 34,
      maxTicks: 3000,
      init: () => {
        const tree = buildTree(SEED + cycleRef.current * 977);
        const mark = new Uint8Array(N_NODES); // 0 unseen 1 visiting 2 done 3 pruned
        mark[0] = 1;
        return {
          tree,
          mark,
          stack: [
            {
              node: 0,
              order: childOrder(tree, 0, modeKey),
              i: 0,
              alpha: -Infinity,
              beta: Infinity,
              best: -Infinity,
              isMax: true,
              bestChild: -1,
            },
          ],
          bestChildOf: new Int32Array(N_NODES).fill(-1),
          leaves: 0,
          phase: 'search',
          rest: 0,
          pv: [],
          stopAtRest: prefersReducedMotion(),
        };
      },
      tick: (st) => {
        if (st.phase === 'search') {
          for (let op = 0; op < 4 && st.stack.length; op += 1) {
            const top = st.stack[st.stack.length - 1];
            const cutoff = top.alpha >= top.beta;
            if (top.i >= top.order.length || cutoff) {
              if (cutoff) {
                for (let k = top.i; k < top.order.length; k += 1) {
                  markPruned(st, top.order[k]);
                }
              }
              st.mark[top.node] = 2;
              st.bestChildOf[top.node] = top.bestChild;
              st.stack.pop();
              const parent = st.stack[st.stack.length - 1];
              if (parent) {
                const v = top.best;
                if (parent.isMax ? v > parent.best : v < parent.best) {
                  parent.best = v;
                  parent.bestChild = top.node;
                }
                if (parent.isMax) parent.alpha = Math.max(parent.alpha, parent.best);
                else parent.beta = Math.min(parent.beta, parent.best);
                liveRef.current.alpha = parent.alpha;
                liveRef.current.beta = parent.beta;
              }
              continue;
            }
            const child = top.order[top.i];
            top.i += 1;
            if (child >= firstLeaf) {
              st.mark[child] = 2;
              st.leaves += 1;
              liveRef.current.leaves = st.leaves;
              const v = st.tree.value[child];
              if (top.isMax ? v > top.best : v < top.best) {
                top.best = v;
                top.bestChild = child;
              }
              if (top.isMax) top.alpha = Math.max(top.alpha, top.best);
              else top.beta = Math.min(top.beta, top.best);
            } else {
              st.mark[child] = 1;
              st.stack.push({
                node: child,
                order: childOrder(st.tree, child, modeKey),
                i: 0,
                alpha: top.alpha,
                beta: top.beta,
                best: top.isMax ? Infinity : -Infinity,
                isMax: !top.isMax,
                bestChild: -1,
              });
            }
          }
          if (!st.stack.length) {
            countsRef.current[modeKey] = st.leaves;
            let at = 0;
            st.pv = [0];
            while (at < firstLeaf && st.bestChildOf[at] >= 0) {
              at = st.bestChildOf[at];
              st.pv.push(at);
            }
            st.phase = 'rest';
            st.rest = 110;
            if (st.stopAtRest) return false;
          }
        } else {
          st.rest -= 1;
          if (st.rest <= 0) {
            cycleRef.current += 1;
            countsRef.current = {};
            const tree = buildTree(SEED + cycleRef.current * 977);
            const mark = new Uint8Array(N_NODES);
            mark[0] = 1;
            Object.assign(st, {
              tree,
              mark,
              stack: [
                {
                  node: 0,
                  order: childOrder(tree, 0, modeKey),
                  i: 0,
                  alpha: -Infinity,
                  beta: Infinity,
                  best: -Infinity,
                  isMax: true,
                  bestChild: -1,
                },
              ],
              bestChildOf: new Int32Array(N_NODES).fill(-1),
              leaves: 0,
              phase: 'search',
              pv: [],
            });
          }
        }
        return true;
      },
      draw: (ctx, st) => {
        ctx.fillStyle = '#0d1119';
        ctx.fillRect(0, 0, W, H);
        const { x } = st.tree;
        const y = (n) => LEVEL_Y[levelOf(n)];

        for (let n = 0; n < firstLeaf; n += 1) {
          for (let k = 1; k <= B; k += 1) {
            const c = n * B + k;
            const m = st.mark[c];
            ctx.strokeStyle =
              m === 3
                ? 'rgba(224, 103, 103, 0.22)'
                : m === 0
                  ? '#1b2334'
                  : m === 1
                    ? '#5da2ff'
                    : 'rgba(154, 165, 189, 0.5)';
            ctx.lineWidth = m === 1 ? 1.6 : 1;
            ctx.beginPath();
            ctx.moveTo(x[n], y(n));
            ctx.lineTo(x[c], y(c));
            ctx.stroke();
          }
        }

        if (st.pv.length > 1) {
          ctx.strokeStyle = '#62d98a';
          ctx.lineWidth = 2.4;
          ctx.beginPath();
          ctx.moveTo(x[st.pv[0]], y(st.pv[0]));
          for (let i = 1; i < st.pv.length; i += 1) ctx.lineTo(x[st.pv[i]], y(st.pv[i]));
          ctx.stroke();
        }

        for (let n = 0; n < N_NODES; n += 1) {
          const level = levelOf(n);
          const m = st.mark[n];
          const px = x[n];
          const py = y(n);
          if (n >= firstLeaf) {
            const v = st.tree.value[n] / 99;
            ctx.fillStyle =
              m === 3
                ? 'rgba(224, 103, 103, 0.25)'
                : m === 2
                  ? `rgba(233, 237, 246, ${0.25 + 0.75 * v})`
                  : '#1b2334';
            ctx.fillRect(px - 2.5, py - 2.5, 5, 5);
            continue;
          }
          const r = level === 0 ? 8 : 6;
          ctx.beginPath();
          if (isMaxLevel(level)) {
            ctx.moveTo(px, py - r);
            ctx.lineTo(px + r, py + r * 0.8);
            ctx.lineTo(px - r, py + r * 0.8);
          } else {
            ctx.moveTo(px, py + r);
            ctx.lineTo(px + r, py - r * 0.8);
            ctx.lineTo(px - r, py - r * 0.8);
          }
          ctx.closePath();
          if (m === 1) {
            ctx.fillStyle = '#5da2ff';
            ctx.fill();
          } else if (m === 3) {
            ctx.fillStyle = 'rgba(224, 103, 103, 0.3)';
            ctx.fill();
          } else {
            ctx.strokeStyle =
              m === 2
                ? isMaxLevel(level)
                  ? '#5da2ff'
                  : '#f0b94b'
                : '#232c40';
            ctx.lineWidth = 1.4;
            ctx.stroke();
          }
        }

        ctx.fillStyle = '#6b7690';
        ctx.font = '11px ui-monospace, Consolas, monospace';
        ctx.textAlign = 'left';
        ctx.fillText('▲ max', 10, 16);
        ctx.fillStyle = '#f0b94b';
        ctx.fillText('▼ min', 62, 16);
        ctx.fillStyle = '#e06767';
        ctx.fillText('× pruned', 114, 16);
      },
    },
    [modeKey, restartTick]
  );

  useEffect(() => {
    const id = setInterval(() => {
      setSnap({ leaves: liveRef.current.leaves, counts: { ...countsRef.current } });
    }, 400);
    return () => clearInterval(id);
  }, []);

  const done = MODES.filter((m) => snap.counts[m.key] != null)
    .map((m) => `${m.key} ${snap.counts[m.key]}`)
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
          new tree
        </button>
        <span className="viz-stat">
          leaves seen <b>{snap.leaves}</b> / {N_LEAVES}
          {done ? <> · {done}</> : null}
        </span>
      </div>
    </>
  );
}
