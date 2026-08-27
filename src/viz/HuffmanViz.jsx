import { useEffect, useRef, useState } from 'react';
import { useCanvasLoop, isStill, holdTicks, mulberry32 } from './useCanvasLoop.js';

// The live build. Twelve symbols wait on the shelf with their frequencies;
// every dozen ticks the two lightest subtrees (flashed amber) are merged
// under a new parent, and the code tree grows upward until one root remains.
// Then each leaf shows its code length: rare symbols ended up deep and
// expensive, common ones shallow and cheap. The footer compares the result
// against a flat fixed-width code and the entropy floor, in bits per symbol.
const K = 12;
const W = 640;
const H = 300;
const LEAF_Y = 236;
const LEVEL_H = 30;
const MERGE_TICKS = 12;
const SEED = 20260827;
const LETTERS = 'etaoinshrdlu';

function makeAlphabet(seed) {
  const rand = mulberry32(seed);
  // Zipf-ish weights with jitter, heaviest first for a legible shelf.
  const freqs = Array.from({ length: K }, (_, i) =>
    Math.max(1, Math.round(90 / (i + 1.2) + rand() * 8)),
  );
  return freqs;
}

function buildPlan(freqs) {
  // Precompute the merge sequence and node geometry. Leaves sit left to
  // right in shelf order; each internal node sits at the midpoint of its
  // children, one level above the taller of them.
  const nodes = freqs.map((f, i) => ({
    f,
    x: 34 + i * 52,
    y: LEAF_Y,
    level: 0,
    leaf: i,
  }));
  const alive = new Set(nodes.map((_, i) => i));
  const merges = [];
  while (alive.size > 1) {
    const sorted = [...alive].sort((a, b) => nodes[a].f - nodes[b].f || a - b);
    const [i, j] = [sorted[0], sorted[1]];
    const level = Math.max(nodes[i].level, nodes[j].level) + 1;
    const parent = {
      f: nodes[i].f + nodes[j].f,
      x: (nodes[i].x + nodes[j].x) / 2,
      y: LEAF_Y - level * LEVEL_H,
      level,
      leaf: -1,
      kids: [i, j],
    };
    nodes.push(parent);
    const pi = nodes.length - 1;
    alive.delete(i);
    alive.delete(j);
    alive.add(pi);
    merges.push({ i, j, pi });
  }
  // Code lengths: walk from each leaf up through its ancestors.
  const parentOf = new Map();
  for (const m of merges) {
    parentOf.set(m.i, m.pi);
    parentOf.set(m.j, m.pi);
  }
  const lengths = freqs.map((_, leafIdx) => {
    let v = leafIdx;
    let depth = 0;
    while (parentOf.has(v)) {
      v = parentOf.get(v);
      depth += 1;
    }
    return depth;
  });
  return { nodes, merges, lengths };
}

function stats(freqs, lengths) {
  const total = freqs.reduce((a, b) => a + b, 0);
  const entropy = -freqs.reduce((acc, f) => acc + (f / total) * Math.log2(f / total), 0);
  const huff = freqs.reduce((acc, f, i) => acc + f * lengths[i], 0) / total;
  const fixed = Math.ceil(Math.log2(K));
  return { entropy, huff, fixed };
}

export default function HuffmanViz() {
  const canvasRef = useRef(null);
  const cycle = useRef(0);
  const statsRef = useRef(null);
  const [restart, setRestart] = useState(0);
  const [snap, setSnap] = useState(null);

  useEffect(() => {
    const id = setInterval(() => setSnap(statsRef.current), 400);
    return () => clearInterval(id);
  }, []);

  useCanvasLoop(
    canvasRef,
    {
      width: W,
      height: H,
      stepMs: 40,
      init: () => {
        const freqs = makeAlphabet(SEED + cycle.current * 7919);
        const plan = buildPlan(freqs);
        statsRef.current = stats(freqs, plan.lengths);
        return {
          freqs,
          plan,
          tick: 0,
          rest: 0,
          stopAtRest: isStill(),
        };
      },
      tick: (s) => {
        const doneAt = (s.plan.merges.length + 2) * MERGE_TICKS;
        if (s.tick >= doneAt) {
          if (s.stopAtRest) return false;
          s.rest += 1;
          if (s.rest > holdTicks(s)) {
            cycle.current += 1;
            const freqs = makeAlphabet(SEED + cycle.current * 7919);
            s.freqs = freqs;
            s.plan = buildPlan(freqs);
            statsRef.current = stats(freqs, s.plan.lengths);
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
        const algo = css.getPropertyValue('--algo').trim() || '#5da2ff';
        const heur = css.getPropertyValue('--heur').trim() || '#f0b94b';
        const path = css.getPropertyValue('--path').trim() || '#62d98a';
        const dim = css.getPropertyValue('--ink-dim').trim() || '#9aa5bd';
        const ink = css.getPropertyValue('--ink').trim() || '#e9edf6';

        const doneMerges = Math.min(Math.floor(s.tick / MERGE_TICKS), s.plan.merges.length);
        const merging = doneMerges < s.plan.merges.length ? s.plan.merges[doneMerges] : null;
        const finished = doneMerges === s.plan.merges.length;

        ctx.font = '11px ui-monospace, monospace';
        ctx.fillStyle = dim;
        ctx.fillText(
          finished
            ? 'the tree is the code · leaf depth = code length'
            : `merge ${doneMerges + 1} of ${s.plan.merges.length} · always the two lightest`,
          14,
          20,
        );

        // Edges of completed merges.
        ctx.strokeStyle = `${algo}aa`;
        ctx.lineWidth = 1.6;
        for (let m = 0; m < doneMerges; m++) {
          const { i, j, pi } = s.plan.merges[m];
          for (const child of [i, j]) {
            ctx.beginPath();
            ctx.moveTo(s.plan.nodes[pi].x, s.plan.nodes[pi].y);
            ctx.lineTo(s.plan.nodes[child].x, s.plan.nodes[child].y);
            ctx.stroke();
          }
        }
        // Nodes: leaves always; internals once created.
        for (let v = 0; v < s.plan.nodes.length; v++) {
          const node = s.plan.nodes[v];
          const isLeaf = node.leaf >= 0;
          const createdAt = isLeaf ? -1 : s.plan.merges.findIndex((m) => m.pi === v);
          if (!isLeaf && createdAt >= doneMerges) continue;
          const hot = merging && (v === merging.i || v === merging.j);
          ctx.beginPath();
          ctx.arc(node.x, node.y, isLeaf ? 13 : 10, 0, Math.PI * 2);
          ctx.fillStyle = hot ? `${heur}44` : 'rgba(255,255,255,0.05)';
          ctx.fill();
          ctx.strokeStyle = hot ? heur : isLeaf ? ink : algo;
          ctx.lineWidth = hot ? 2 : 1.2;
          ctx.stroke();
          ctx.fillStyle = hot ? heur : isLeaf ? ink : dim;
          ctx.font = isLeaf ? '12px ui-monospace, monospace' : '9px ui-monospace, monospace';
          ctx.textAlign = 'center';
          ctx.fillText(isLeaf ? LETTERS[node.leaf] : String(node.f), node.x, node.y + 3.5);
          ctx.textAlign = 'start';
        }
        // Frequencies under leaves; code lengths once finished.
        ctx.font = '10px ui-monospace, monospace';
        for (let i = 0; i < K; i++) {
          const node = s.plan.nodes[i];
          ctx.fillStyle = dim;
          ctx.textAlign = 'center';
          ctx.fillText(String(s.freqs[i]), node.x, LEAF_Y + 26);
          if (finished) {
            ctx.fillStyle = path;
            ctx.fillText(`${s.plan.lengths[i]}b`, node.x, LEAF_Y + 40);
          }
          ctx.textAlign = 'start';
        }
        if (finished && statsRef.current) {
          const { entropy, huff, fixed } = statsRef.current;
          ctx.fillStyle = dim;
          ctx.fillText(
            `bits per symbol · fixed ${fixed.toFixed(2)} · Huffman ${huff.toFixed(2)} · entropy floor ${entropy.toFixed(2)}`,
            14,
            H - 8,
          );
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
          new alphabet
        </button>
        <span className="viz-stat">
          {snap
            ? <>this alphabet: fixed <strong>{snap.fixed.toFixed(1)}</strong> · Huffman <strong>{snap.huff.toFixed(2)}</strong> · floor {snap.entropy.toFixed(2)} bits per symbol</>
            : 'weighing the alphabet…'}
        </span>
      </div>
    </>
  );
}
