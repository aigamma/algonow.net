import { useEffect, useRef, useState } from 'react';
import { useCanvasLoop, isStill, holdTicks, mulberry32 } from './useCanvasLoop.js';

// A 64-slot linear-probing table filling up, a few keys per tick, drawn
// as eight cache lines of eight slots. Each new key is hashed to a home
// slot and probes forward; the slots it walks flash amber and the cache
// lines it touches are outlined. The running average probes per insert
// is plotted against Knuth's 1963 curve for a hit at the current load,
// and the longest cluster is reported. The invariant checked every tick
// is that every key is reachable by probing from its home slot (the table
// is a correct dictionary), and that the number of occupied slots equals
// the number of keys inserted.
const W = 640;
const H = 300;
const SEED = 20261010;
const SLOTS = 64;
const LINE = 8;
const TARGET = 58; // fill to about 0.9

function hashOf(key) {
  // Fibonacci-style multiplicative hash on 32-bit arithmetic, top 6 bits
  return (Math.imul(key, 0x9e3779b1) >>> 0) >>> (32 - 6);
}

export function makeScene(seed) {
  const rand = mulberry32(seed);
  const keys = [];
  const seen = new Set();
  while (keys.length < TARGET) {
    const k = 1 + Math.floor(rand() * 1e6);
    if (!seen.has(k)) {
      seen.add(k);
      keys.push(k);
    }
  }
  return { keys, slots: new Array(SLOTS).fill(null), i: 0, probes: 0, walked: [], linesTouched: 0, last: 'an empty table of 64 slots, eight per cache line', done: false, ok: true, history: [] };
}

function longestCluster(slots) {
  let best = 0;
  let cur = 0;
  // start after an empty slot so a wrapped cluster is counted whole
  const start = slots.indexOf(null);
  if (start < 0) return SLOTS;
  for (let t = 1; t <= SLOTS; t += 1) {
    const s = slots[(start + t) % SLOTS];
    if (s === null) {
      best = Math.max(best, cur);
      cur = 0;
    } else cur += 1;
  }
  return Math.max(best, cur);
}

export function knuthHit(a) {
  return 0.5 * (1 + 1 / (1 - a));
}

export function sceneTick(sc) {
  if (sc.done) return true;
  if (sc.i >= sc.keys.length) {
    sc.done = true;
    const load = sc.i / SLOTS;
    sc.last = `full at load ${load.toFixed(2)}: ${(sc.probes / sc.i).toFixed(2)} probes per insert averaged over the fill (Knuth's large-table expectation is ${knuthHit(load).toFixed(2)}; a 64-slot table runs under it); longest cluster ${longestCluster(sc.slots)}`;
    return true;
  }
  const batch = sc.i < 32 ? 4 : 2;
  sc.walked = [];
  let lines = new Set();
  for (let b = 0; b < batch && sc.i < sc.keys.length; b += 1) {
    const key = sc.keys[sc.i];
    let s = hashOf(key);
    let p = 0;
    while (sc.slots[s] !== null) {
      sc.walked.push(s);
      lines.add(Math.floor(s / LINE));
      s = (s + 1) % SLOTS;
      p += 1;
    }
    sc.walked.push(s);
    lines.add(Math.floor(s / LINE));
    sc.slots[s] = key;
    sc.probes += p + 1;
    sc.i += 1;
  }
  sc.linesTouched = lines.size;
  // invariant: every key reachable by probing from its home
  let ok = true;
  for (let t = 0; t < sc.i; t += 1) {
    let s = hashOf(sc.keys[t]);
    let found = false;
    for (let q = 0; q < SLOTS; q += 1) {
      if (sc.slots[s] === sc.keys[t]) {
        found = true;
        break;
      }
      if (sc.slots[s] === null) break;
      s = (s + 1) % SLOTS;
    }
    if (!found) ok = false;
  }
  const occupied = sc.slots.filter((x) => x !== null).length;
  sc.ok = ok && occupied === sc.i;
  const load = sc.i / SLOTS;
  sc.history.push([load, sc.probes / sc.i]);
  sc.last = `${sc.i} keys, load ${load.toFixed(2)}: last insert walked ${sc.walked.length} slot${sc.walked.length === 1 ? '' : 's'} in ${lines.size} cache line${lines.size === 1 ? '' : 's'}; average ${(sc.probes / sc.i).toFixed(2)} probes per insert; longest cluster ${longestCluster(sc.slots)}`;
  return false;
}

export default function LinearProbingViz() {
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
      stepMs: 500,
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
        ctx.fillText('64 slots as eight cache lines of eight; blue: occupied, amber: the slots the last inserts probed; outlined: lines touched', 12, 18);
        const x0 = 20;
        const y0 = 40;
        const cw = 36;
        const ch = 22;
        const touchedLines = new Set(sc.walked.map((w) => Math.floor(w / LINE)));
        for (let line = 0; line < SLOTS / LINE; line += 1) {
          const y = y0 + line * (ch + 4);
          if (touchedLines.has(line)) {
            ctx.strokeStyle = heur;
            ctx.lineWidth = 2;
            ctx.strokeRect(x0 - 3, y - 3, LINE * cw + 6, ch + 6);
            ctx.lineWidth = 1;
          }
          for (let j = 0; j < LINE; j += 1) {
            const idx = line * LINE + j;
            const occupied = sc.slots[idx] !== null;
            const walked = sc.walked.includes(idx);
            ctx.fillStyle = walked ? heur : occupied ? algo : `${dim}22`;
            ctx.fillRect(x0 + j * cw, y, cw - 3, ch);
            if (occupied) {
              ctx.fillStyle = '#0b0d12';
              ctx.font = '9px ui-monospace, monospace';
              ctx.fillText(String(hashOf(sc.slots[idx])), x0 + j * cw + 3, y + 14);
              ctx.font = '11px ui-monospace, monospace';
            }
          }
          ctx.fillStyle = dim;
          ctx.fillText(`line ${line}`, x0 + LINE * cw + 8, y + 15);
        }
        ctx.fillStyle = dim;
        ctx.fillText('digits: each key’s home slot; a key right of its home has been displaced', x0, y0 + 8 * (ch + 4) + 12);
        // right: average probes vs load with Knuth's curve
        const gx = 380;
        const gy = 230;
        const gw = 230;
        const gh = 150;
        const X = (a) => gx + a * gw;
        const Y = (v) => gy - ((Math.min(v, 8) - 1) / 7) * gh;
        ctx.strokeStyle = `${dim}66`;
        ctx.strokeRect(gx, gy - gh, gw, gh);
        ctx.strokeStyle = `${good}aa`;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        for (let a = 0.02; a <= 0.95; a += 0.01) {
          // the average insert cost over a fill to load a equals Knuth's hit formula at a (that is how he derived it)
          const v = knuthHit(a);
          if (a <= 0.02) ctx.moveTo(X(a), Y(v));
          else ctx.lineTo(X(a), Y(v));
        }
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.strokeStyle = algo;
        ctx.lineWidth = 2;
        ctx.beginPath();
        sc.history.forEach(([a, v], i) => {
          if (i === 0) ctx.moveTo(X(a), Y(v));
          else ctx.lineTo(X(a), Y(v));
        });
        ctx.stroke();
        ctx.lineWidth = 1;
        ctx.fillStyle = dim;
        ctx.fillText('avg probes per insert vs load', gx, gy - gh - 6);
        ctx.fillText('green dashed: Knuth, large-table expectation', gx, gy + 14);
        for (const a of [0, 0.5, 0.9]) ctx.fillText(a.toFixed(1), X(a) - 6, gy + 26);
        for (const v of [1, 4, 8]) ctx.fillText(String(v), gx - 14, Y(v) + 3);
        ctx.fillStyle = sc.ok ? good : warn;
        ctx.fillText(sc.ok ? 'every key reachable from its home' : 'KEY LOST', gx, gy + 40);
        let line;
        if (s.done) {
          line = sc.last;
          ctx.fillStyle = good;
        } else {
          line = sc.last;
          ctx.fillStyle = ink;
        }
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
          new keys
        </button>
        <span className="viz-stat">{snap.line || 'inserting…'}</span>
      </div>
    </>
  );
}
