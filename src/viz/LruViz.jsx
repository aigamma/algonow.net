import { useEffect, useRef, useState } from 'react';
import { useCanvasLoop, isStill, holdTicks, mulberry32 } from './useCanvasLoop.js';

// The live comparison. One request stream, two 12-slot caches: the top one
// evicts by recency (LRU), the bottom one is Belady's clairvoyant, which
// reads the future of the very same stream. The stream mixes a hot set of
// regulars with periodic conga-line scans of cold items; watch the scans
// flush LRU's hooks (red evictions ripple across) while the clairvoyant
// simply refuses to house items it knows won't return. Green flash = hit,
// red = eviction. The counters are honest hit rates.
const K = 12;
const W = 640;
const H = 230;
const SLOT_W = 44;
const SLOT_H = 30;
const SEED = 20260827;
const TRACE_LEN = 560;

function h32(x) {
  x = (x + 0x9e3779b9) | 0;
  x ^= x >>> 16;
  x = Math.imul(x, 0x85ebca6b);
  x ^= x >>> 13;
  x = Math.imul(x, 0xc2b2ae35);
  x ^= x >>> 16;
  return x >>> 0;
}

const LABELS = 'ABCDEFGHJKMNPQRSTUVWXYZ'.split('');

function makeTrace(seed) {
  const rand = mulberry32(seed);
  const trace = [];
  let scanId = 100;
  while (trace.length < TRACE_LEN) {
    // A stretch of hot-set traffic over ~9 regulars...
    const stretch = 40 + Math.floor(rand() * 30);
    for (let i = 0; i < stretch; i++) {
      trace.push(Math.floor(rand() * rand() * 9));
    }
    // ...then a conga line of 16 cold one-timers.
    for (let i = 0; i < 16; i++) trace.push(scanId++);
  }
  return trace.slice(0, TRACE_LEN);
}

function labelOf(id) {
  return id < 100 ? LABELS[id] : String(id % 100).padStart(2, '0');
}

function makeLru() {
  return {
    name: 'LRU · evicts the coldest',
    order: [], // least recent first
    hits: 0,
    seen: 0,
    flash: new Map(),
    request(x) {
      this.seen += 1;
      const i = this.order.indexOf(x);
      if (i >= 0) {
        this.order.splice(i, 1);
        this.order.push(x);
        this.hits += 1;
        this.flash.set(x, 'hit');
        return;
      }
      if (this.order.length >= K) {
        this.flash.set(this.order[0], 'evict');
        this.order.shift();
      }
      this.order.push(x);
    },
  };
}

function makeBelady(trace) {
  const n = trace.length;
  const nxt = new Array(n).fill(Infinity);
  const seen = new Map();
  for (let i = n - 1; i >= 0; i--) {
    nxt[i] = seen.has(trace[i]) ? seen.get(trace[i]) : Infinity;
    seen.set(trace[i], i);
  }
  return {
    name: 'Belady · reads the future',
    resident: new Map(), // item -> next use
    order: [],
    nxt,
    i: 0,
    hits: 0,
    seen: 0,
    flash: new Map(),
    request(x) {
      const pos = this.i;
      this.i += 1;
      this.seen += 1;
      if (this.resident.has(x)) {
        this.resident.set(x, this.nxt[pos]);
        this.hits += 1;
        this.flash.set(x, 'hit');
        return;
      }
      if (this.resident.size >= K) {
        let victim = null;
        let far = -1;
        for (const [item, at] of this.resident) {
          if (at > far) {
            far = at;
            victim = item;
          }
        }
        this.resident.delete(victim);
        this.order = this.order.filter((v) => v !== victim);
        this.flash.set(victim, 'evict');
      }
      this.resident.set(x, this.nxt[pos]);
      this.order.push(x);
    },
  };
}

function drawCache(ctx, cache, y0, colors) {
  const { path, warn, dim, ink } = colors;
  const rate = cache.seen ? cache.hits / cache.seen : 0;
  ctx.fillStyle = dim;
  ctx.font = '11px ui-monospace, monospace';
  ctx.fillText(
    `${cache.name} · hits ${cache.hits}/${cache.seen} (${(rate * 100).toFixed(0)}%)`,
    14,
    y0 + 12,
  );
  const items = cache.order.slice(-K);
  for (let s = 0; s < K; s++) {
    const x = 14 + s * (SLOT_W + 7);
    const y = y0 + 20;
    const item = items[s];
    const state = item !== undefined ? cache.flash.get(item) : undefined;
    ctx.fillStyle = 'rgba(255,255,255,0.04)';
    ctx.fillRect(x, y, SLOT_W, SLOT_H);
    ctx.strokeStyle = state === 'hit' ? path : 'rgba(255,255,255,0.14)';
    ctx.lineWidth = state === 'hit' ? 1.8 : 1;
    ctx.strokeRect(x + 0.5, y + 0.5, SLOT_W - 1, SLOT_H - 1);
    if (item !== undefined) {
      ctx.fillStyle = item < 100 ? ink : dim;
      ctx.font = '13px ui-monospace, monospace';
      ctx.textAlign = 'center';
      ctx.fillText(labelOf(item), x + SLOT_W / 2, y + 20);
      ctx.textAlign = 'start';
    }
  }
  for (const [item, state] of cache.flash) {
    if (state === 'evict') {
      // A brief red tick under the rail where something was thrown out.
      ctx.fillStyle = warn;
      ctx.fillRect(14, y0 + 20 + SLOT_H + 4, K * (SLOT_W + 7) - 7, 2);
    }
  }
  cache.flash.clear();
}

export default function LruViz() {
  const canvasRef = useRef(null);
  const cycle = useRef(0);
  const statsRef = useRef({ lru: 0, opt: 0 });
  const [restart, setRestart] = useState(0);
  const [snap, setSnap] = useState({ lru: 0, opt: 0 });

  useEffect(() => {
    const id = setInterval(() => setSnap({ ...statsRef.current }), 400);
    return () => clearInterval(id);
  }, []);

  useCanvasLoop(
    canvasRef,
    {
      width: W,
      height: H,
      stepMs: 55,
      init: () => {
        const trace = makeTrace(h32(SEED + cycle.current * 7919));
        return {
          trace,
          lru: makeLru(),
          opt: makeBelady(trace),
          at: 0,
          rest: 0,
          stopAtRest: isStill(),
        };
      },
      tick: (s) => {
        if (s.at >= s.trace.length) {
          if (s.stopAtRest) return false;
          s.rest += 1;
          if (s.rest > holdTicks(s)) {
            cycle.current += 1;
            const trace = makeTrace(h32(SEED + cycle.current * 7919));
            Object.assign(s, {
              trace,
              lru: makeLru(),
              opt: makeBelady(trace),
              at: 0,
              rest: 0,
            });
          }
          return true;
        }
        const x = s.trace[s.at];
        s.at += 1;
        s.lru.request(x);
        s.opt.request(x);
        statsRef.current = {
          lru: s.lru.seen ? s.lru.hits / s.lru.seen : 0,
          opt: s.opt.seen ? s.opt.hits / s.opt.seen : 0,
        };
        return true;
      },
      draw: (ctx, s) => {
        ctx.clearRect(0, 0, W, H);
        const css = getComputedStyle(document.documentElement);
        const colors = {
          path: css.getPropertyValue('--path').trim() || '#62d98a',
          warn: css.getPropertyValue('--warn').trim() || '#e06767',
          dim: css.getPropertyValue('--ink-dim').trim() || '#9aa5bd',
          ink: css.getPropertyValue('--ink').trim() || '#e9edf6',
        };
        ctx.font = '11px ui-monospace, monospace';
        ctx.fillStyle = colors.dim;
        if (s.at < s.trace.length) {
          const x = s.trace[s.at - 1];
          const kind = x !== undefined && x >= 100 ? ' (conga line)' : '';
          if (x !== undefined) {
            ctx.fillText(`request: ${labelOf(x)}${kind}`, 14, 16);
          }
        } else {
          ctx.fillText('stream finished · same requests, two futures', 14, 16);
        }
        drawCache(ctx, s.lru, 28, colors);
        drawCache(ctx, s.opt, 128, colors);
      },
    },
    [restart],
  );

  const gap = ((snap.opt - snap.lru) * 100).toFixed(0);

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
          new stream
        </button>
        <span className="viz-stat">
          {snap.opt > 0
            ? <>same stream · the clairvoyant is <strong>{gap} points</strong> ahead: the price of not knowing the future</>
            : 'opening the coat check…'}
        </span>
      </div>
    </>
  );
}
