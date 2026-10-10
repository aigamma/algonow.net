import { useEffect, useRef, useState } from 'react';
import { useCanvasLoop, isStill, holdTicks } from './useCanvasLoop.js';

// An eight-block cache as 8 x 1, 4 x 2, or 2 x 4 (sets x ways) per cycle,
// three arrays one cache size apart, one access per tick; each decision is
// checked against an independent per-set LRU reference.
const W = 640;
const H = 300;
const SEED = 20261010;
const BLOCK = 64;
const BLOCKS = 8;
const CAPACITY = BLOCKS * BLOCK;
const ADDRESS_BITS = 16;
const BASE = 0x4000;

const log2 = (n) => Math.round(Math.log2(n));

function buildTrace() {
  const t = [];
  for (let p = 0; p < 2; p += 1) {
    for (let i = 0; i < 16; i += 1) {
      t.push({ stream: 'A', address: BASE + i * 8 });
      t.push({ stream: 'B', address: BASE + CAPACITY + i * 8 });
      t.push({ stream: 'C', address: BASE + 2 * CAPACITY + i * 8 });
    }
  }
  return t;
}

function makeCache(ways) {
  const sets = BLOCKS / ways;
  return {
    ways,
    sets,
    offsetBits: log2(BLOCK),
    indexBits: log2(sets),
    tags: Array.from({ length: sets }, () => Array(ways).fill(null)),
    stamp: Array.from({ length: sets }, () => Array(ways).fill(0)),
    clock: 0,
  };
}

function split(c, address) {
  return {
    offset: address & (BLOCK - 1),
    index: (address >> c.offsetBits) & (c.sets - 1),
    tag: address >> (c.offsetBits + c.indexBits),
  };
}

function join(c, f) {
  return (f.tag << (c.offsetBits + c.indexBits)) | (f.index << c.offsetBits) | f.offset;
}

function access(c, address) {
  const f = split(c, address);
  const line = c.tags[f.index];
  c.clock += 1;
  const w = line.indexOf(f.tag);
  if (w >= 0) {
    c.stamp[f.index][w] = c.clock;
    return { hit: true, way: w, fields: f, evicted: null };
  }
  let victim = line.indexOf(null);
  let evicted = null;
  if (victim < 0) {
    const st = c.stamp[f.index];
    victim = st.indexOf(Math.min(...st));
    evicted = line[victim];
  }
  line[victim] = f.tag;
  c.stamp[f.index][victim] = c.clock;
  return { hit: false, way: victim, fields: f, evicted };
}

// independent reference: per-set Map of block to last use, LRU by scan
function referenceAccess(r, address) {
  const block = Math.floor(address / BLOCK);
  const set = block % r.sets;
  r.t += 1;
  if (!r.map.has(set)) r.map.set(set, new Map());
  const s = r.map.get(set);
  if (s.has(block)) {
    s.set(block, r.t);
    return true;
  }
  if (s.size >= r.ways) {
    let oldest = null;
    let oldestT = Infinity;
    for (const [b, t] of s) if (t < oldestT) { oldestT = t; oldest = b; }
    s.delete(oldest);
  }
  s.set(block, r.t);
  return false;
}

export function makeScene(seed) {
  const ways = [1, 2, 4][Math.abs(seed) % 3];
  return {
    ways,
    cache: makeCache(ways),
    ref: { ways, sets: BLOCKS / ways, map: new Map(), t: 0 },
    trace: buildTrace(),
    i: 0,
    hits: 0,
    misses: 0,
    compares: 0,
    firstTouches: new Set(),
    lastResult: null,
    done: false,
    ok: true,
    last: `${BLOCKS / ways} sets x ${ways} ways; three arrays one cache size apart, two passes`,
  };
}

export function sceneTick(sc) {
  if (sc.done) return true;
  const n = sc.trace.length;
  if (sc.i >= n) {
    const expected = sc.ways < 4 ? n : sc.firstTouches.size;
    sc.ok = sc.ok && sc.misses === expected && sc.hits + sc.misses === n;
    sc.done = true;
    sc.last = `done: ${sc.misses} misses of ${n} (${sc.ways < 4 ? 'every access' : `${sc.firstTouches.size} first touches`}), ${sc.compares} tag compares; reference agreed: ${sc.ok ? 'yes' : 'NO'}`;
    return true;
  }
  const { stream, address } = sc.trace[sc.i];
  const res = access(sc.cache, address);
  const refHit = referenceAccess(sc.ref, address);
  sc.compares += sc.ways;
  sc.firstTouches.add(Math.floor(address / BLOCK));
  if (res.hit) sc.hits += 1; else sc.misses += 1;
  sc.ok = sc.ok && res.hit === refHit && join(sc.cache, res.fields) === address;
  sc.lastResult = { ...res, stream, address };
  sc.i += 1;
  const f = res.fields;
  sc.last = `${stream}[${((address - BASE) % CAPACITY) / 8}]: tag ${f.tag} index ${f.index} offset ${f.offset}; way ${res.way}: ${res.hit ? 'HIT' : `MISS${res.evicted !== null ? `, evicts tag ${res.evicted}` : ''}`}`;
  return false;
}

export default function SetAssociativeCacheViz() {
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
      stepMs: 380,
      init: () => ({ scene: makeScene(SEED + cycle.current), done: false, rest: 0, stopAtRest: isStill() }),
      tick: (s) => {
        if (s.done) {
          if (s.stopAtRest) return false;
          s.rest += 1;
          if (s.rest > holdTicks(s) * 2) {
            cycle.current += 1;
            Object.assign(s, { scene: makeScene(SEED + cycle.current), done: false, rest: 0 });
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
        const c = sc.cache;
        const res = sc.lastResult;
        ctx.font = '11px ui-monospace, monospace';
        ctx.fillStyle = dim;
        ctx.fillText(`${c.sets} sets x ${c.ways} way${c.ways > 1 ? 's' : ''}, one access per tick; the index (amber) picks the set`, 12, 18);
        const gx = 20;
        const gy = 40;
        const cellW = Math.min(110, 300 / c.ways);
        const cellH = Math.min(26, 200 / c.sets);
        for (let si = 0; si < c.sets; si += 1) {
          const y = gy + si * (cellH + 4);
          ctx.fillStyle = dim;
          ctx.fillText(`set ${si}`, gx, y + cellH - 8);
          for (let w = 0; w < c.ways; w += 1) {
            const x = gx + 44 + w * (cellW + 4);
            const tag = c.tags[si][w];
            const isTarget = res && res.fields.index === si && res.way === w;
            ctx.fillStyle = tag === null ? `${dim}22` : `${algo}44`;
            if (isTarget) ctx.fillStyle = res.hit ? `${good}99` : `${warn}99`;
            ctx.fillRect(x, y, cellW, cellH);
            if (res && res.fields.index === si) {
              ctx.strokeStyle = heur;
              ctx.lineWidth = 2;
              ctx.strokeRect(x - 1, y - 1, cellW + 2, cellH + 2);
              ctx.lineWidth = 1;
            }
            ctx.fillStyle = tag === null ? dim : ink;
            ctx.fillText(tag === null ? 'empty' : `tag ${tag}`, x + 6, y + cellH - 8);
          }
        }
        const ax = 400;
        const ay = 52;
        ctx.fillStyle = dim;
        ctx.fillText('address bits: tag | index | offset', ax, ay - 10);
        if (res) {
          const f = res.fields;
          const tagBits = ADDRESS_BITS - c.indexBits - c.offsetBits;
          const per = 220 / ADDRESS_BITS;
          const bits = res.address.toString(2).padStart(ADDRESS_BITS, '0');
          for (let k = 0; k < ADDRESS_BITS; k += 1) {
            ctx.fillStyle = k < tagBits ? algo : k < tagBits + c.indexBits ? heur : dim;
            ctx.globalAlpha = bits[k] === '1' ? 1 : 0.35;
            ctx.fillRect(ax + k * per, ay, per - 1.5, 18);
            ctx.globalAlpha = 1;
          }
          ctx.fillStyle = algo;
          ctx.fillText(`tag ${f.tag} (${tagBits} bits)`, ax, ay + 34);
          ctx.fillStyle = heur;
          ctx.fillText(`index ${f.index} (${c.indexBits} bit${c.indexBits === 1 ? '' : 's'})`, ax, ay + 50);
          ctx.fillStyle = dim;
          ctx.fillText(`offset ${f.offset} (${c.offsetBits} bits)`, ax, ay + 66);
          ctx.fillStyle = res.hit ? good : warn;
          ctx.fillText(res.hit ? `HIT in way ${res.way}` : `MISS, fills way ${res.way}${res.evicted !== null ? ` (evicts tag ${res.evicted})` : ''}`, ax, ay + 90);
        }
        ctx.fillStyle = ink;
        ctx.fillText(`access ${sc.i} of ${sc.trace.length}: hits ${sc.hits}, misses ${sc.misses}`, ax, ay + 114);
        ctx.fillStyle = dim;
        ctx.fillText(`tag compares ${sc.compares} (${c.ways} per access)`, ax, ay + 130);
        ctx.fillText('the file: 6,144 of 6,144 miss at 1 and 2 ways', ax, ay + 154);
        ctx.fillStyle = sc.ok ? good : warn;
        ctx.fillText(sc.ok ? 'reference agrees on every access' : 'INVARIANT BROKEN', ax, ay + 184);
        const line = sc.last;
        ctx.fillStyle = s.done ? (sc.ok ? good : warn) : ink;
        ctx.fillText(line.length > 96 ? `${line.slice(0, 95)}…` : line, 12, H - 6);
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
          another organization
        </button>
        <span className="viz-stat">{snap.line || 'looking up…'}</span>
      </div>
    </>
  );
}
