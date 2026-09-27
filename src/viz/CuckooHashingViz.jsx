import { useEffect, useRef, useState } from 'react';
import { useCanvasLoop, isStill, holdTicks, mulberry32 } from './useCanvasLoop.js';

// Two tables of 20 slots each. One key inserted per tick: it lands in
// its first table's slot if free; otherwise it kicks the occupant to
// that key's slot in the other table, and so on (amber arrows trace
// the chain). A chain longer than the limit is a cycle: the tables
// flash red and everything is rehashed with fresh functions. The
// counters track the load, the longest chain, the rehashes, and the
// fact that every lookup probes at most two slots.
const W = 640;
const H = 300;
const SEED = 20260926;
const SIZE = 20;
const MAX_KICKS = 24;
const TARGET = 21;

function hashPair(rand) {
  const a = [1 + Math.floor(rand() * 1e9), 1 + Math.floor(rand() * 1e9)];
  const b = [Math.floor(rand() * 1e9), Math.floor(rand() * 1e9)];
  return (i, key) => Math.abs(((a[i] % 100003) * key + b[i]) % 1000003) % SIZE;
}

export function makeScene(seed) {
  const rand = mulberry32(seed);
  const keys = [];
  while (keys.length < TARGET) {
    const k = 100 + Math.floor(rand() * 900);
    if (!keys.includes(k)) keys.push(k);
  }
  return { rand, keys, next: 0, t: [new Array(SIZE).fill(null), new Array(SIZE).fill(null)], h: hashPair(rand), chain: [], rehashes: 0, longest: 0, count: 0, flash: 0, done: false, gaveUp: false, lastLookupProbes: 0 };
}

function place(sc, key) {
  // returns the chain of (table, slot) visited; null in the last entry means success
  const chain = [];
  let cur = key;
  let table = 0;
  for (let step = 0; step < MAX_KICKS; step++) {
    const slot = sc.h(table, cur);
    chain.push({ table, slot, key: cur });
    if (sc.t[table][slot] === null) {
      sc.t[table][slot] = cur;
      return { chain, ok: true };
    }
    const evicted = sc.t[table][slot];
    sc.t[table][slot] = cur;
    cur = evicted;
    table = 1 - table;
  }
  return { chain, ok: false, homeless: cur };
}

export function lookupProbes(sc, key) {
  if (sc.t[0][sc.h(0, key)] === key) return 1;
  return 2;
}

export function invariantOk(sc) {
  let n = 0;
  for (let i = 0; i < 2; i++) for (let s = 0; s < SIZE; s++) {
    const k = sc.t[i][s];
    if (k === null) continue;
    n += 1;
    if (sc.h(i, k) !== s) return false;
  }
  return n === sc.count;
}

export function sceneTick(sc) {
  if (sc.done) return true;
  sc.flash = Math.max(0, sc.flash - 1);
  if (sc.next >= sc.keys.length) {
    sc.done = true;
    return true;
  }
  const key = sc.keys[sc.next];
  const r = place(sc, key);
  sc.chain = r.chain;
  sc.longest = Math.max(sc.longest, r.chain.length - 1);
  if (r.ok) {
    sc.count += 1;
    sc.next += 1;
    sc.lastLookupProbes = lookupProbes(sc, key);
    return false;
  }
  // cycle: rehash with fresh functions, bounded attempts
  const keys = [];
  for (let i = 0; i < 2; i++) for (const k of sc.t[i]) if (k !== null) keys.push(k);
  keys.push(r.homeless);
  for (let attempt = 0; attempt < 8; attempt++) {
    sc.rehashes += 1;
    sc.flash = 3;
    sc.t = [new Array(SIZE).fill(null), new Array(SIZE).fill(null)];
    sc.h = hashPair(sc.rand);
    let failed = false;
    for (const k of keys) {
      if (!place(sc, k).ok) {
        failed = true;
        break;
      }
    }
    if (!failed) {
      sc.count = keys.length;
      sc.next += 1;
      return false;
    }
  }
  sc.gaveUp = true;
  sc.done = true;
  return true;
}

export default function CuckooHashingViz() {
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
      stepMs: 520,
      init: () => ({ scene: makeScene(SEED + cycle.current * 7919), done: false, rest: 0, stopAtRest: isStill() }),
      tick: (s) => {
        if (s.done) {
          if (s.stopAtRest) return false;
          s.rest += 1;
          if (s.rest > holdTicks(s)) {
            cycle.current += 1;
            Object.assign(s, { scene: makeScene(SEED + cycle.current * 7919), done: false, rest: 0 });
          }
          return true;
        }
        if (sceneTick(s.scene)) s.done = true;
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
        ctx.font = '11px ui-monospace, monospace';
        ctx.fillStyle = dim;
        ctx.fillText(`two tables of ${SIZE} slots, one key per tick toward load ${(TARGET / (2 * SIZE)).toFixed(3)}; a key lives in slot h₁ of table 1 or slot h₂ of table 2`, 12, 18);
        const cw = 28;
        const x0 = 40;
        const rows = [60, 150];
        for (let i = 0; i < 2; i++) {
          ctx.fillStyle = dim;
          ctx.fillText(`T${i + 1}`, 12, rows[i] + 18);
          for (let sIdx = 0; sIdx < SIZE; sIdx++) {
            const x = x0 + sIdx * cw;
            const k = sc.t[i][sIdx];
            ctx.fillStyle = sc.flash > 0 ? `${warn}44` : k === null ? `${dim}22` : `${algo}55`;
            ctx.fillRect(x, rows[i], cw - 3, 28);
            ctx.strokeStyle = `${dim}55`;
            ctx.strokeRect(x, rows[i], cw - 3, 28);
            if (k !== null) {
              ctx.fillStyle = ink;
              ctx.font = '9px ui-monospace, monospace';
              ctx.fillText(String(k), x + 3, rows[i] + 18);
              ctx.font = '11px ui-monospace, monospace';
            }
          }
        }
        // the last chain
        if (sc.chain.length > 0 && sc.flash === 0) {
          ctx.strokeStyle = heur;
          ctx.lineWidth = 2;
          for (let j = 0; j < sc.chain.length; j++) {
            const c = sc.chain[j];
            const cx = x0 + c.slot * cw + (cw - 3) / 2;
            const cy = rows[c.table] + 14;
            ctx.beginPath();
            ctx.arc(cx, cy, 15, 0, Math.PI * 2);
            ctx.stroke();
            if (j > 0) {
              const p = sc.chain[j - 1];
              const px = x0 + p.slot * cw + (cw - 3) / 2;
              const py = rows[p.table] + 14;
              ctx.beginPath();
              ctx.moveTo(px, py + (c.table > p.table ? 15 : -15));
              ctx.lineTo(cx, cy + (c.table > p.table ? -15 : 15));
              ctx.stroke();
            }
          }
          ctx.lineWidth = 1;
        }
        ctx.fillStyle = dim;
        ctx.fillText(`inserted ${sc.count} of ${TARGET}: load ${(sc.count / (2 * SIZE)).toFixed(3)}; last chain ${Math.max(0, sc.chain.length - 1)} kicks; longest ${sc.longest}; rehashes ${sc.rehashes}`, 12, 212);
        ctx.fillStyle = heur;
        ctx.fillText(sc.flash > 0 ? 'cycle detected: fresh hash functions, everything reinserted' : 'amber: the kick chain of the last insert, alternating tables until an empty slot', 12, 232);
        ctx.fillStyle = algo;
        ctx.fillText(`lookup of the last key: ${sc.lastLookupProbes} probe${sc.lastLookupProbes === 1 ? '' : 's'} (never more than 2, whatever the chain cost)`, 12, 252);
        let line;
        if (s.done) {
          line = sc.gaveUp
            ? `past load 0.5 the rehashes cascaded and the table gave up at ${sc.count} keys: the two-table cliff`
            : `${sc.count} keys at load ${(sc.count / (2 * SIZE)).toFixed(3)}: longest kick chain ${sc.longest}, ${sc.rehashes} rehash${sc.rehashes === 1 ? '' : 'es'}, every lookup at most 2 probes`;
          ctx.fillStyle = sc.gaveUp ? warn : good;
        } else {
          line = 'insertion pays in kicks so that lookup never pays at all';
          ctx.fillStyle = ink;
        }
        ctx.fillText(line, 12, H - 8);
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
          new keys
        </button>
        <span className="viz-stat">{snap.line || 'inserting…'}</span>
      </div>
    </>
  );
}
