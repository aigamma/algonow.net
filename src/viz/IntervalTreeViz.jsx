import { useEffect, useRef, useState } from 'react';
import { useCanvasLoop, isStill, holdTicks, mulberry32 } from './useCanvasLoop.js';

// The registry, stabbed. Fourteen bookings as bars on a timeline; the
// balanced tree beneath, each node wearing its max-end label. A query
// line drops at x: the walk descends, pruned subtrees grey out with a
// red "max < x" stamp, visited nodes flash amber, and the bookings
// containing x glow green on the timeline. Two stabs per cycle: one
// mid-crowd, one late where the long-lived booking is the whole story.
const W = 640;
const H = 300;
const SEED = 20260827;
const N = 14;
const EVENT_TICKS = 9;
const QUERY_HOLD = 55;

function build(ivs) {
  const s = [...ivs].sort((a, b) => a[0] - b[0]);
  const make = (lo, hi) => {
    if (lo > hi) return null;
    const mid = (lo + hi) >> 1;
    const node = { lo: s[mid][0], hi: s[mid][1], id: mid };
    node.left = make(lo, mid - 1);
    node.right = make(mid + 1, hi);
    node.maxend = Math.max(node.hi, node.left?.maxend ?? -1, node.right?.maxend ?? -1);
    return node;
  };
  return { root: make(0, s.length - 1), sorted: s };
}

function stabEvents(root, x) {
  const events = [];
  const hits = [];
  const rec = (node) => {
    if (!node) return;
    if (node.maxend < x) {
      events.push({ type: 'prune', node });
      return;
    }
    events.push({ type: 'visit', node });
    rec(node.left);
    if (node.lo <= x) {
      if (node.hi >= x) {
        events.push({ type: 'hit', node });
        hits.push(node.id);
      }
      rec(node.right);
    }
  };
  rec(root);
  return { events, hits };
}

function layout(root) {
  let slot = 0;
  const nodes = [];
  const rec = (node, depth) => {
    if (!node) return;
    rec(node.left, depth + 1);
    node.x = 40 + slot * ((W - 80) / (N - 1));
    node.y = 150 + depth * 40;
    slot += 1;
    nodes.push(node);
    rec(node.right, depth + 1);
  };
  rec(root, 0);
  return nodes;
}

function makeScene(seed) {
  const rand = mulberry32(seed);
  const ivs = [];
  for (let i = 0; i < N - 1; i++) {
    const lo = 5 + Math.floor(rand() * 75);
    ivs.push([lo, lo + 3 + Math.floor(rand() * 16)]);
  }
  ivs.push([8, 96]); // the long-lived resident
  const { root, sorted } = build(ivs);
  const nodes = layout(root);
  const queries = [30 + Math.floor(rand() * 20), 88 + Math.floor(rand() * 8)].map((x) => ({
    x,
    ...stabEvents(root, x),
  }));
  return { root, sorted, nodes, queries };
}

export default function IntervalTreeViz() {
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
        scene: makeScene(SEED + cycle.current * 7919),
        tick: 0,
        rest: 0,
        stopAtRest: isStill(),
      }),
      tick: (s) => {
        const total = s.scene.queries.reduce(
          (t, q) => t + q.events.length * EVENT_TICKS + QUERY_HOLD,
          0,
        );
        if (s.tick >= total) {
          if (s.stopAtRest) return false;
          s.rest += 1;
          if (s.rest > holdTicks(s)) {
            cycle.current += 1;
            Object.assign(s, {
              scene: makeScene(SEED + cycle.current * 7919),
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
        const warn = css.getPropertyValue('--warn').trim() || '#e2606c';
        const dim = css.getPropertyValue('--ink-dim').trim() || '#9aa5bd';
        const ink = css.getPropertyValue('--ink').trim() || '#e9edf6';
        const sc = s.scene;

        // Locate query + event position.
        let t = s.tick;
        let qi = 0;
        for (; qi < sc.queries.length; qi++) {
          const span = sc.queries[qi].events.length * EVENT_TICKS + QUERY_HOLD;
          if (t < span) break;
          t -= span;
        }
        const done = qi >= sc.queries.length;
        const q = sc.queries[Math.min(qi, sc.queries.length - 1)];
        const evDone = done
          ? q.events.length
          : Math.min(Math.floor(t / EVENT_TICKS) + 1, q.events.length);
        const finished = done || t >= q.events.length * EVENT_TICKS;

        const state = new Map(); // node.id -> 'visit'|'prune'|'hit'
        for (let e = 0; e < evDone; e++) {
          const ev = q.events[e];
          const prev = state.get(ev.node.id);
          if (ev.type === 'hit' || prev !== 'hit') state.set(ev.node.id, ev.type);
        }

        const X = (v) => 30 + (v / 100) * (W - 60);
        // Timeline bars: stack by simple lanes.
        const lanes = [];
        sc.sorted.forEach(([lo, hi], id) => {
          let l = 0;
          while (l < lanes.length && lanes[l] > lo) l += 1;
          if (l === lanes.length) lanes.push(0);
          lanes[l] = hi;
          const y = 34 + l * 13;
          const isHit = finished && q.hits.includes(id);
          ctx.fillStyle = isHit ? good : `${algo}77`;
          ctx.fillRect(X(lo), y, Math.max(2, X(hi) - X(lo)), 9);
        });
        // The query line.
        ctx.strokeStyle = heur;
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 4]);
        ctx.beginPath();
        ctx.moveTo(X(q.x), 26);
        ctx.lineTo(X(q.x), 126);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = heur;
        ctx.font = '10px ui-monospace, monospace';
        ctx.fillText(`x = ${q.x}`, X(q.x) + 4, 24);

        // The tree.
        sc.nodes.forEach((n) => {
          [n.left, n.right].forEach((c) => {
            if (!c) return;
            ctx.strokeStyle = '#2a3450';
            ctx.beginPath();
            ctx.moveTo(n.x, n.y);
            ctx.lineTo(c.x, c.y);
            ctx.stroke();
          });
        });
        sc.nodes.forEach((n) => {
          const st = state.get(n.id);
          ctx.fillStyle =
            st === 'hit'
              ? `${good}44`
              : st === 'prune'
                ? `${warn}22`
                : st === 'visit'
                  ? `${heur}22`
                  : 'rgba(93,162,255,0.08)';
          ctx.strokeStyle =
            st === 'hit' ? good : st === 'prune' ? warn : st === 'visit' ? heur : `${algo}66`;
          ctx.lineWidth = st ? 1.8 : 1;
          ctx.beginPath();
          ctx.arc(n.x, n.y, 10, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = st === 'prune' ? warn : dim;
          ctx.font = '8px ui-monospace, monospace';
          ctx.textAlign = 'center';
          ctx.fillText(String(n.maxend), n.x, n.y + 22);
          ctx.textAlign = 'start';
        });

        const visits = [...state.values()].filter((v) => v !== 'prune').length;
        const prunes = [...state.values()].filter((v) => v === 'prune').length;
        ctx.fillStyle = dim;
        ctx.font = '11px ui-monospace, monospace';
        ctx.fillText(
          `stab x = ${q.x} · node labels are subtree max-end · red = pruned by certificate`,
          14,
          16,
        );
        let line = `visited ${visits} · pruned ${prunes} subtree(s) · ${N} intervals`;
        if (finished) {
          ctx.fillStyle = good;
          line = `${q.hits.length} booking(s) contain ${q.x}: found visiting ${visits} of ${N} nodes`;
        } else {
          ctx.fillStyle = ink;
        }
        ctx.font = '12px ui-monospace, monospace';
        ctx.fillText(line, 14, H - 10);

        statsRef.current = {
          line: done ? 'the label is a certificate of absence: skip what cannot answer' : line,
        };
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
          new registry
        </button>
        <span className="viz-stat">
          {snap.line || 'labeling the drawers…'}
        </span>
      </div>
    </>
  );
}
