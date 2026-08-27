import { useEffect, useRef, useState } from 'react';
import { useCanvasLoop, isStill, holdTicks, mulberry32 } from './useCanvasLoop.js';

// One continuous deal. Cards fly from the deck strip onto the piles:
// leftmost pile whose top beats them, or a fresh pile at the right:
// each landing records its amber backpointer at deal time. When the
// deck empties, the chase runs: backpointers light up from the last
// pile's top, one card per pile, and the witness reads forward in
// green: piles = LIS, the deal was the proof.
const W = 640;
const H = 300;
const SEED = 20260827;
const N = 18;
const DEAL_TICKS = 16;
const CHASE_TICKS = 22;
const END_HOLD = 66;

function dealOnce(seed) {
  const rand = mulberry32(seed);
  const vals = [];
  const used = new Set();
  while (vals.length < N) {
    const v = 10 + Math.floor(rand() * 89);
    if (!used.has(v)) {
      used.add(v);
      vals.push(v);
    }
  }
  // Run the deal, recording placements and backpointers.
  const piles = []; // arrays of {v, idx}
  const events = [];
  const parent = Array(N).fill(-1);
  const topIdx = [];
  vals.forEach((v, i) => {
    let k = 0;
    while (k < piles.length && piles[k][piles[k].length - 1].v < v) k++;
    if (k === piles.length) piles.push([]);
    piles[k].push({ v, idx: i });
    parent[i] = k > 0 ? topIdx[k - 1] : -1;
    topIdx[k] = i;
    events.push({ v, i, pile: k, depth: piles[k].length - 1, parent: parent[i] });
  });
  // The witness chain (indices), chased from the last pile's top.
  const chain = [];
  let cur = topIdx[topIdx.length - 1];
  while (cur !== -1) {
    chain.push(cur);
    cur = parent[cur];
  }
  chain.reverse();
  return { vals, events, nPiles: piles.length, chain };
}

function makeScene(seed) {
  // Keep the table legible: retry deterministically until the deal
  // lands between 4 and 8 piles (both bounds fit the canvas).
  for (let bump = 0; bump < 50; bump++) {
    const sc = dealOnce(seed + bump * 131);
    if (sc.nPiles >= 4 && sc.nPiles <= 8) return sc;
  }
  return dealOnce(seed);
}

export default function LisViz() {
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
        scene: makeScene(SEED + cycle.current * 7013),
        tick: 0,
        rest: 0,
        stopAtRest: isStill(),
      }),
      tick: (s) => {
        const total =
          N * DEAL_TICKS + s.scene.chain.length * CHASE_TICKS + END_HOLD;
        if (s.tick >= total) {
          if (s.stopAtRest) return false;
          s.rest += 1;
          if (s.rest > holdTicks(s)) {
            cycle.current += 1;
            Object.assign(s, {
              scene: makeScene(SEED + cycle.current * 7013),
              tick: 0,
              rest: 0,
            });
          }
          return true;
        }
        s.tick += 1;
        return true;
      },
      draw: (ctx, s) => {
        ctx.clearRect(0, 0, W, H);
        const css = getComputedStyle(document.documentElement);
        const algo = css.getPropertyValue('--algo').trim() || '#5da2ff';
        const heur = css.getPropertyValue('--heur').trim() || '#f0b94b';
        const good = css.getPropertyValue('--path').trim() || '#62d98a';
        const dim = css.getPropertyValue('--ink-dim').trim() || '#9aa5bd';

        const sc = s.scene;
        const dealt = Math.min(Math.floor(s.tick / DEAL_TICKS), N);
        const dealing = dealt < N;
        const chased = dealing
          ? 0
          : Math.min(
              Math.floor((s.tick - N * DEAL_TICKS) / CHASE_TICKS),
              sc.chain.length,
            );
        const chaseDone = !dealing && chased >= sc.chain.length;
        const chainSet = new Set(sc.chain.slice(0, chased));

        // Deck strip: undealt values.
        ctx.font = '11px ui-monospace, monospace';
        for (let i = dealt; i < Math.min(N, dealt + 8); i++) {
          ctx.fillStyle = i === dealt ? heur : '#3a4560';
          ctx.fillText(String(sc.vals[i]), 20 + (i - dealt) * 34, 30);
        }
        ctx.fillStyle = dim;
        ctx.fillText('the deck →', 300, 30);

        // Piles: cards laid down so far.
        const pos = new Map(); // idx -> {x, y}
        const pileX = (k) => 40 + k * 72;
        const cardY = (d) => 62 + d * 32;
        for (let e = 0; e < dealt; e++) {
          const ev = sc.events[e];
          pos.set(ev.i, { x: pileX(ev.pile), y: cardY(ev.depth) });
        }
        // Backpointer arcs for chased chain links.
        for (let c = 1; c < chased; c++) {
          const a = pos.get(sc.chain[c - 1]);
          const b = pos.get(sc.chain[c]);
          if (a && b) {
            ctx.strokeStyle = heur;
            ctx.lineWidth = 1.7;
            ctx.setLineDash([5, 4]);
            ctx.beginPath();
            ctx.moveTo(b.x + 12, b.y + 12);
            ctx.quadraticCurveTo((a.x + b.x) / 2 + 12, Math.max(a.y, b.y) + 40, a.x + 24, a.y + 14);
            ctx.stroke();
            ctx.setLineDash([]);
          }
        }
        for (let e = 0; e < dealt; e++) {
          const ev = sc.events[e];
          const p = pos.get(ev.i);
          const onChain = chainSet.has(ev.i);
          const justDealt = dealing && e === dealt - 1;
          ctx.fillStyle = '#1d2740';
          ctx.fillRect(p.x, p.y, 44, 28);
          ctx.strokeStyle = onChain ? good : justDealt ? heur : '#40507a';
          ctx.lineWidth = onChain || justDealt ? 2.2 : 1.3;
          ctx.strokeRect(p.x, p.y, 44, 28);
          ctx.fillStyle = onChain ? good : dim;
          ctx.font = '13px ui-monospace, monospace';
          ctx.fillText(String(ev.v), p.x + 12, p.y + 19);
        }

        ctx.fillStyle = dim;
        ctx.font = '11px ui-monospace, monospace';
        ctx.fillText('leftmost pile whose top beats the card · piles only decrease', 14, H - 34);

        let line;
        if (dealing) {
          const ev = dealt > 0 ? sc.events[dealt - 1] : null;
          line = ev
            ? `card ${ev.v}: ${ev.depth === 0 ? `founds pile ${ev.pile + 1}` : `lands on pile ${ev.pile + 1}`} · piles: ${Math.max(...sc.events.slice(0, dealt).map((x) => x.pile)) + 1}`
            : 'the deal begins…';
          ctx.fillStyle = heur;
        } else if (!chaseDone) {
          line = `the chase: backpointers light one card per pile (${chased}/${sc.chain.length})`;
          ctx.fillStyle = heur;
        } else {
          const wit = sc.chain.map((i) => sc.vals[i]).join(' ');
          line = `${sc.nPiles} piles = LIS ${sc.nPiles} · witness ${wit}: the deal was the proof`;
          ctx.fillStyle = good;
        }
        ctx.font = '12px ui-monospace, monospace';
        ctx.fillText(line, 14, H - 12);

        statsRef.current = { line };
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
          {snap.line || 'the deal begins…'}
        </span>
      </div>
    </>
  );
}
