import { useEffect, useRef, useState } from 'react';
import { useCanvasLoop, isStill, holdTicks, mulberry32 } from './useCanvasLoop.js';

// The scan, live. Points are visited in polar order around the amber anchor;
// the blue chain is the stack. Watch the pops: whenever the chain bends
// clockwise, the middle point flashes red and is released forever, and by
// the sweep's end the chain has tightened into the hull, drawn green. The
// counter tells the whole complexity story: each point is pushed once and
// popped at most once, so the scan is linear after the sort.
const N = 42;
const W = 640;
const H = 300;
const SEED = 20260827;
const TICKS_PER_OP = 6;

function h32(x) {
  x = (x + 0x9e3779b9) | 0;
  x ^= x >>> 16;
  x = Math.imul(x, 0x85ebca6b);
  x ^= x >>> 13;
  x = Math.imul(x, 0xc2b2ae35);
  x ^= x >>> 16;
  return x >>> 0;
}

const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);

function makeScene(seed) {
  const rand = mulberry32(seed);
  const pts = [];
  while (pts.length < N) {
    const x = 40 + rand() * (W - 80);
    const y = 34 + rand() * (H - 92);
    pts.push([Math.round(x), Math.round(y)]);
  }
  // Anchor: lowest on screen (largest y), leftmost on ties.
  let anchor = pts[0];
  for (const p of pts) {
    if (p[1] > anchor[1] || (p[1] === anchor[1] && p[0] < anchor[0])) anchor = p;
  }
  const rest = pts.filter((p) => p !== anchor);
  rest.sort((a, b) => {
    const o = cross(anchor, a, b);
    if (o !== 0) return o < 0 ? -1 : 1; // screen y grows downward: flip
    const da = (a[0] - anchor[0]) ** 2 + (a[1] - anchor[1]) ** 2;
    const db = (b[0] - anchor[0]) ** 2 + (b[1] - anchor[1]) ** 2;
    return da - db;
  });
  // Record the op log: {push: p} and {pop: p, at: chainLenBefore}.
  const ops = [];
  const chain = [anchor];
  for (const p of rest) {
    while (chain.length >= 2 && cross(chain[chain.length - 2], chain[chain.length - 1], p) >= 0) {
      ops.push({ type: 'pop', p: chain.pop() });
    }
    chain.push(p);
    ops.push({ type: 'push', p });
  }
  while (chain.length >= 3 && cross(chain[chain.length - 2], chain[chain.length - 1], anchor) >= 0) {
    ops.push({ type: 'pop', p: chain.pop() });
  }
  return { pts, anchor, rest, ops, hull: chain };
}

export default function GrahamViz() {
  const canvasRef = useRef(null);
  const cycle = useRef(0);
  const statsRef = useRef({ pushes: 0, pops: 0, done: false });
  const [restart, setRestart] = useState(0);
  const [snap, setSnap] = useState({ pushes: 0, pops: 0, done: false });

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
        const scene = makeScene(h32(SEED + cycle.current * 7919));
        return {
          scene,
          applied: 0,
          chain: [scene.anchor],
          popsFlash: [],
          pushes: 0,
          pops: 0,
          tick: 0,
          rest: 0,
          stopAtRest: isStill(),
        };
      },
      tick: (s) => {
        const total = s.scene.ops.length * TICKS_PER_OP + 20;
        if (s.tick >= total) {
          if (s.stopAtRest) return false;
          s.rest += 1;
          if (s.rest > holdTicks(s)) {
            cycle.current += 1;
            const scene = makeScene(h32(SEED + cycle.current * 7919));
            Object.assign(s, {
              scene,
              applied: 0,
              chain: [scene.anchor],
              popsFlash: [],
              pushes: 0,
              pops: 0,
              tick: 0,
              rest: 0,
            });
          }
          return true;
        }
        const target = Math.min(Math.floor(s.tick / TICKS_PER_OP) + 1, s.scene.ops.length);
        while (s.applied < target) {
          const op = s.scene.ops[s.applied];
          if (op.type === 'push') {
            s.chain.push(op.p);
            s.pushes += 1;
          } else {
            const dropped = s.chain.pop();
            s.pops += 1;
            s.popsFlash.push({ p: dropped, from: s.chain[s.chain.length - 1], ttl: 12 });
          }
          s.applied += 1;
        }
        s.tick += 1;
        statsRef.current = { pushes: s.pushes, pops: s.pops, done: s.applied >= s.scene.ops.length };
        return true;
      },
      draw: (ctx, s) => {
        ctx.clearRect(0, 0, W, H);
        const css = getComputedStyle(document.documentElement);
        const algo = css.getPropertyValue('--algo').trim() || '#5da2ff';
        const heur = css.getPropertyValue('--heur').trim() || '#f0b94b';
        const warn = css.getPropertyValue('--warn').trim() || '#e06767';
        const path = css.getPropertyValue('--path').trim() || '#62d98a';
        const dim = css.getPropertyValue('--ink-dim').trim() || '#9aa5bd';

        const done = s.applied >= s.scene.ops.length;
        ctx.font = '11px ui-monospace, monospace';
        ctx.fillStyle = dim;
        ctx.fillText(
          done
            ? `hull found · ${s.chain.length} vertices · ${s.pushes} pushes, ${s.pops} pops: linear after the sort`
            : `sweeping by angle · pushes ${s.pushes} · pops ${s.pops}`,
          14,
          18,
        );

        for (const p of s.scene.pts) {
          ctx.fillStyle = 'rgba(255,255,255,0.35)';
          ctx.fillRect(p[0] - 1.5, p[1] - 1.5, 3, 3);
        }
        const chainColor = done ? path : algo;
        ctx.strokeStyle = chainColor;
        ctx.lineWidth = done ? 2.2 : 1.8;
        ctx.beginPath();
        s.chain.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
        if (done) ctx.closePath();
        ctx.stroke();
        if (done) {
          ctx.fillStyle = `${path}14`;
          ctx.fill();
        }
        for (const f of s.popsFlash) {
          if (f.ttl > 0) {
            ctx.strokeStyle = warn;
            ctx.lineWidth = 1.6;
            ctx.beginPath();
            ctx.moveTo(f.from[0], f.from[1]);
            ctx.lineTo(f.p[0], f.p[1]);
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(f.p[0], f.p[1], 6, 0, Math.PI * 2);
            ctx.stroke();
            f.ttl -= 1;
          }
        }
        ctx.fillStyle = heur;
        ctx.beginPath();
        ctx.arc(s.scene.anchor[0], s.scene.anchor[1], 5.5, 0, Math.PI * 2);
        ctx.fill();
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
          new points
        </button>
        <span className="viz-stat">
          {snap.done
            ? <>tight: <strong>{snap.pushes}</strong> pushes, <strong>{snap.pops}</strong> pops · every point handled at most twice</>
            : 'tying the string in sweep order…'}
        </span>
      </div>
    </>
  );
}
