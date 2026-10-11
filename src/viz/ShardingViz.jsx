import { useEffect, useRef, useState } from 'react';
import { useCanvasLoop, isStill, holdTicks, mulberry32 } from './useCanvasLoop.js';

// Keys stream into N shards by h(key) mod N (left) and onto a consistent
// hashing ring with virtual nodes (right). Halfway through, one shard is
// added: modulo re-homes about N/(N+1) of every key (red), the ring about
// 1/(N+1), all of them onto the new shard. Checked every tick: every key is
// on exactly one shard in both schemes, the modulo move fraction sits within
// six standard errors of N/(N+1), and every ring move lands on the new node.
const W = 640;
const H = 300;
const SEED = 20261010;
const BATCH = 40;
const TOTAL = 2400;
const V = 48;

function mix(x) {
  let h = x >>> 0;
  h ^= h >>> 16;
  h = Math.imul(h, 0x7feb352d);
  h ^= h >>> 15;
  h = Math.imul(h, 0x846ca68b);
  h ^= h >>> 16;
  return h >>> 0;
}

function ringPoints(n) {
  const pts = [];
  for (let s = 0; s < n; s += 1) for (let v = 0; v < V; v += 1) pts.push({ p: mix(s * 1000003 + v * 7919 + 12345), s });
  pts.sort((a, b) => a.p - b.p);
  return pts;
}

function ringOwner(pts, key) {
  const h = mix(key ^ 0x9e3779b9);
  let lo = 0;
  let hi = pts.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (pts[mid].p < h) lo = mid + 1;
    else hi = mid;
  }
  return pts[lo % pts.length].s;
}

export function makeScene(seed) {
  const rand = mulberry32(seed);
  const n = 6 + Math.floor(rand() * 4);
  return {
    rand, n, n0: n, keys: [], mod: [], ring: [], pts: ringPoints(n), phase: 'fill', resharded: false,
    movedMod: 0, movedRing: 0, flash: 0, ticks: 0, ok: true, done: false,
    last: `${n} shards; keys arrive ${BATCH} per tick; one shard joins at ${TOTAL / 2} keys`,
  };
}

function loads(assign, n) {
  const out = new Array(n).fill(0);
  for (const s of assign) out[s] += 1;
  return out;
}

export function sceneTick(sc) {
  if (sc.done) return true;
  sc.ticks += 1;
  if (sc.flash > 0) {
    sc.flash -= 1;
    return false;
  }
  if (!sc.resharded && sc.keys.length >= TOTAL / 2) {
    const n = sc.n;
    const newPts = ringPoints(n + 1);
    let mm = 0;
    let mr = 0;
    for (let i = 0; i < sc.keys.length; i += 1) {
      const a = mix(sc.keys[i]) % (n + 1);
      if (a !== sc.mod[i]) mm += 1;
      sc.mod[i] = a;
      const b = ringOwner(newPts, sc.keys[i]);
      if (b !== sc.ring[i]) {
        mr += 1;
        if (b !== n) sc.ok = false;
      }
      sc.ring[i] = b;
    }
    const total = sc.keys.length;
    const theory = n / (n + 1);
    const se = Math.sqrt((theory * (1 - theory)) / total);
    if (Math.abs(mm / total - theory) > 6 * se + 0.005) sc.ok = false;
    if (mr / total > 2.5 / (n + 1)) sc.ok = false;
    sc.movedMod = mm;
    sc.movedRing = mr;
    sc.n = n + 1;
    sc.pts = newPts;
    sc.resharded = true;
    sc.flash = 6;
    sc.last = `shard ${n} joins: modulo re-homed ${mm} of ${total} keys (${((100 * mm) / total).toFixed(1)}%, theory ${(100 * theory).toFixed(1)}%); the ring moved ${mr} (${((100 * mr) / total).toFixed(1)}%, theory ${(100 / (n + 1)).toFixed(1)}%), all onto the new shard`;
    return false;
  }
  for (let i = 0; i < BATCH; i += 1) {
    const k = Math.floor(sc.rand() * 4294967296) >>> 0;
    sc.keys.push(k);
    sc.mod.push(mix(k) % sc.n);
    sc.ring.push(ringOwner(sc.pts, k));
  }
  const lm = loads(sc.mod, sc.n);
  const lr = loads(sc.ring, sc.n);
  const sum = (a) => a.reduce((x, y) => x + y, 0);
  if (sum(lm) !== sc.keys.length || sum(lr) !== sc.keys.length) sc.ok = false;
  if (sc.keys.length >= TOTAL) {
    sc.done = true;
    const mean = sc.keys.length / sc.n;
    sc.last = `done: ${sc.keys.length} keys on ${sc.n} shards; modulo heaviest ${(Math.max(...lm) / mean).toFixed(2)} x mean, ring ${(Math.max(...lr) / mean).toFixed(2)} x; the add moved ${sc.movedMod} keys by modulo and ${sc.movedRing} on the ring; invariants held: ${sc.ok ? 'yes' : 'NO'}`;
    return true;
  }
  sc.last = `${sc.keys.length} keys on ${sc.n} shards; modulo loads ${Math.min(...lm)} to ${Math.max(...lm)}, ring ${Math.min(...lr)} to ${Math.max(...lr)}`;
  return false;
}

export function summarize(sc) {
  return { ok: sc.ok, n0: sc.n0, keys: sc.keys.length, movedMod: sc.movedMod, movedRing: sc.movedRing };
}

export default function ShardingViz() {
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
      init: () => ({ scene: makeScene(SEED + cycle.current * 7919), done: false, rest: 0, stopAtRest: isStill() }),
      tick: (s) => {
        if (s.done) {
          if (s.stopAtRest) return false;
          s.rest += 1;
          if (s.rest > holdTicks(s) * 2) {
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
        ctx.fillText('left: shard = h(key) mod N (amber); right: consistent hashing ring (blue); red: keys re-homed when a shard joins', 12, 18);
        const panel = (x0, assign, color, label, moved) => {
          const ld = loads(assign, sc.n);
          const bw = Math.floor(280 / sc.n);
          const scale = 150 / Math.max(TOTAL / sc.n0, 1);
          for (let i = 0; i < sc.n; i += 1) {
            const h = ld[i] * scale;
            const x = x0 + i * bw;
            ctx.fillStyle = i === sc.n - 1 && sc.resharded ? good : color;
            ctx.fillRect(x, 220 - h, bw - 3, h);
            if (sc.flash > 0 && moved > 0 && sc.resharded) {
              ctx.fillStyle = warn;
              const share = i === sc.n - 1 ? h : (h * moved) / Math.max(1, assign.length - ld[sc.n - 1]);
              ctx.fillRect(x, 220 - Math.min(h, share), bw - 3, Math.min(h, share));
            }
            ctx.fillStyle = dim;
            ctx.fillText(String(ld[i]), x, 232);
          }
          ctx.fillStyle = color;
          ctx.fillText(label, x0, 46);
          if (sc.resharded) {
            ctx.fillStyle = warn;
            ctx.fillText(`moved by the add: ${moved} (${((100 * moved) / Math.max(1, TOTAL / 2)).toFixed(1)}%)`, x0, 60);
          }
        };
        panel(20, sc.mod, heur, `modulo: theory N/(N+1) = ${(100 * sc.n0 / (sc.n0 + 1)).toFixed(1)}% move`, sc.movedMod);
        panel(340, sc.ring, algo, `ring, ${V} virtual nodes: theory 1/(N+1) = ${(100 / (sc.n0 + 1)).toFixed(1)}%`, sc.movedRing);
        ctx.fillStyle = sc.ok ? good : warn;
        ctx.fillText(sc.ok ? 'invariants: every key on one shard in both schemes; modulo moves N/(N+1); ring moves only onto the new shard' : 'INVARIANT BROKEN', 12, 258);
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
          new cluster
        </button>
        <span className="viz-stat">{snap.line || 'routing…'}</span>
      </div>
    </>
  );
}
