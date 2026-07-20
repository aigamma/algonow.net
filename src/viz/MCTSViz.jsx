import { useEffect, useRef, useState } from 'react';
import { useCanvasLoop, prefersReducedMotion, mulberry32 } from './useCanvasLoop.js';

const W = 640;
const H = 400;
const DEPTH = 6; // binary tree, 127 slots, 64 leaves
const N_NODES = 2 ** (DEPTH + 1) - 1;
const FIRST_LEAF = N_NODES - 2 ** DEPTH;
const SIMS = 420;
const SEED = 60420;

const MODES = [
  { key: 'greedy', label: 'c = 0 · pure greed', c: 0 },
  { key: 'balanced', label: 'c = 1.4 · ucb1', c: 1.4 },
  { key: 'explore', label: 'c = 3 · restless', c: 3 },
];

const levelOf = (n) => Math.floor(Math.log2(n + 1));

function layout() {
  const x = new Float64Array(N_NODES);
  const leaves = 2 ** DEPTH;
  for (let i = 0; i < leaves; i += 1) x[FIRST_LEAF + i] = 10 + (i * (W - 20)) / (leaves - 1);
  for (let n = FIRST_LEAF - 1; n >= 0; n -= 1) x[n] = (x[2 * n + 1] + x[2 * n + 2]) / 2;
  return x;
}
const X = layout();
const Y = [22, 82, 142, 202, 262, 322, 380];

function makeArena(seed) {
  const rng = mulberry32(seed);
  const leafP = new Float64Array(N_NODES);
  for (let n = FIRST_LEAF; n < N_NODES; n += 1) leafP[n] = 0.12 + rng() * 0.72;
  // The branch of the root holding the single best leaf is the one a sound
  // search should come to prefer; its visit share is the score we report.
  let bestLeaf = FIRST_LEAF;
  for (let n = FIRST_LEAF; n < N_NODES; n += 1) if (leafP[n] > leafP[bestLeaf]) bestLeaf = n;
  let up = bestLeaf;
  while (up > 2) up = Math.floor((up - 1) / 2);
  return { leafP, bestRootChild: up, rng };
}

// One growing tree per cycle, replayed under three exploration constants.
// Node size tracks visits, node tint tracks measured win rate; each tick is
// one full simulation: amber selection path, expansion, random descent to a
// leaf, green or red result washing back up the path.
export default function MCTSViz() {
  const canvasRef = useRef(null);
  const [modeKey, setModeKey] = useState('balanced');
  const [restartTick, setRestartTick] = useState(0);
  const cycleRef = useRef(0);
  const sharesRef = useRef({});
  const liveRef = useRef({ sims: 0, share: 0 });
  const [snap, setSnap] = useState({ sims: 0, share: 0, shares: {} });

  const mode = MODES.find((m) => m.key === modeKey);

  useCanvasLoop(
    canvasRef,
    {
      width: W,
      height: H,
      stepMs: 42,
      maxTicks: SIMS + 10,
      init: () => {
        const arena = makeArena(SEED + cycleRef.current * 331);
        return {
          ...arena,
          visits: new Float64Array(N_NODES),
          wins: new Float64Array(N_NODES),
          open: (() => {
            const o = new Uint8Array(N_NODES);
            o[0] = 1;
            return o;
          })(),
          sims: 0,
          path: null,
          result: 0,
          endLeaf: -1,
          flashTtl: 0,
          phase: 'grow',
          rest: 0,
          stopAtRest: prefersReducedMotion(),
        };
      },
      tick: (st) => {
        if (st.phase === 'grow') {
          // Selection: descend while both children are open, by UCB1.
          const path = [0];
          let n = 0;
          while (n < FIRST_LEAF) {
            const l = 2 * n + 1;
            const r = 2 * n + 2;
            if (!st.open[l] || !st.open[r]) {
              // Expansion: open an unvisited child.
              const pick = !st.open[l] && !st.open[r] ? (st.rng() < 0.5 ? l : r) : !st.open[l] ? l : r;
              st.open[pick] = 1;
              path.push(pick);
              n = pick;
              break;
            }
            const ucb = (ch) =>
              st.wins[ch] / st.visits[ch] +
              mode.c * Math.sqrt(Math.log(st.visits[n]) / st.visits[ch]);
            n = ucb(l) >= ucb(r) ? l : r;
            path.push(n);
          }
          // Rollout: random walk to a leaf.
          let walk = n;
          while (walk < FIRST_LEAF) walk = 2 * walk + 1 + (st.rng() < 0.5 ? 0 : 1);
          const result = st.rng() < st.leafP[walk] ? 1 : 0;
          for (const p of path) {
            st.visits[p] += 1;
            st.wins[p] += result;
          }
          st.sims += 1;
          st.path = path;
          st.result = result;
          st.endLeaf = walk;
          st.flashTtl = 4;
          const share = st.visits[st.bestRootChild] / Math.max(1, st.visits[0]);
          liveRef.current = { sims: st.sims, share };
          if (st.sims >= SIMS) {
            sharesRef.current[modeKey] = Math.round(share * 100);
            st.phase = 'rest';
            st.rest = 100;
            if (st.stopAtRest) return false;
          }
        } else {
          st.rest -= 1;
          if (st.rest <= 0) {
            cycleRef.current += 1;
            sharesRef.current = {};
            const arena = makeArena(SEED + cycleRef.current * 331);
            Object.assign(st, {
              ...arena,
              visits: new Float64Array(N_NODES),
              wins: new Float64Array(N_NODES),
              open: (() => {
                const o = new Uint8Array(N_NODES);
                o[0] = 1;
                return o;
              })(),
              sims: 0,
              path: null,
              endLeaf: -1,
              flashTtl: 0,
              phase: 'grow',
            });
          }
        }
        return true;
      },
      draw: (ctx, st) => {
        ctx.fillStyle = '#0d1119';
        ctx.fillRect(0, 0, W, H);
        const y = (n) => Y[levelOf(n)];
        const maxV = Math.max(1, st.visits[0]);

        for (let n = 0; n < FIRST_LEAF; n += 1) {
          if (!st.open[n]) continue;
          for (const ch of [2 * n + 1, 2 * n + 2]) {
            if (!st.open[ch]) continue;
            const wgt = Math.sqrt(st.visits[ch] / maxV);
            ctx.strokeStyle = `rgba(154, 165, 189, ${0.12 + 0.5 * wgt})`;
            ctx.lineWidth = 0.8 + 2.4 * wgt;
            ctx.beginPath();
            ctx.moveTo(X[n], y(n));
            ctx.lineTo(X[ch], y(ch));
            ctx.stroke();
          }
        }

        if (st.path && st.flashTtl > 0) {
          ctx.strokeStyle = 'rgba(240, 185, 75, 0.85)';
          ctx.lineWidth = 1.8;
          ctx.beginPath();
          ctx.moveTo(X[st.path[0]], y(st.path[0]));
          for (let i = 1; i < st.path.length; i += 1) ctx.lineTo(X[st.path[i]], y(st.path[i]));
          ctx.lineTo(X[st.endLeaf], y(st.endLeaf));
          ctx.stroke();
          ctx.fillStyle = st.result ? '#62d98a' : '#e06767';
          ctx.beginPath();
          ctx.arc(X[st.endLeaf], y(st.endLeaf), 4, 0, Math.PI * 2);
          ctx.fill();
        }

        for (let n = 0; n < N_NODES; n += 1) {
          if (!st.open[n] || st.visits[n] === 0) continue;
          const winrate = st.wins[n] / st.visits[n];
          const r = 2 + 9 * Math.sqrt(st.visits[n] / maxV);
          const g = Math.round(120 + 100 * winrate);
          const rd = Math.round(200 - 120 * winrate);
          ctx.fillStyle = `rgba(${rd}, ${g}, 140, ${0.35 + 0.5 * winrate})`;
          ctx.beginPath();
          ctx.arc(X[n], y(n), r, 0, Math.PI * 2);
          ctx.fill();
        }

        // Faint markers for the still-closed leaves, so the frontier reads
        // as territory not yet earned.
        ctx.fillStyle = 'rgba(35, 44, 64, 0.8)';
        for (let n = FIRST_LEAF; n < N_NODES; n += 1) {
          if (!st.open[n] || st.visits[n] === 0) {
            ctx.fillRect(X[n] - 1, y(n) - 1, 2, 2);
          }
        }

        ctx.fillStyle = '#6b7690';
        ctx.font = '11px ui-monospace, Consolas, monospace';
        ctx.textAlign = 'left';
        ctx.fillText(`simulations ${st.sims}/${SIMS}`, 10, 14);
      },
    },
    [modeKey, restartTick]
  );

  useEffect(() => {
    const id = setInterval(() => {
      setSnap({ ...liveRef.current, shares: { ...sharesRef.current } });
    }, 400);
    return () => clearInterval(id);
  }, []);

  const done = MODES.filter((m) => snap.shares[m.key] != null)
    .map((m) => `${m.key} ${snap.shares[m.key]}%`)
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
            sharesRef.current = {};
            setRestartTick((t) => t + 1);
          }}
        >
          new game
        </button>
        <span className="viz-stat">
          {done ? (
            <>best-branch share · {done}</>
          ) : (
            <>
              sims <b>{snap.sims}</b> · best branch <b>{Math.round(snap.share * 100)}%</b>
            </>
          )}
        </span>
      </div>
    </>
  );
}
