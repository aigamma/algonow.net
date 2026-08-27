import { useEffect, useRef, useState } from 'react';
import { useCanvasLoop, isStill, holdTicks, mulberry32 } from './useCanvasLoop.js';

// Two acts on one table of 16 buckets x 4 slots. Act one: fingerprints
// stream in; a full pair of homes triggers the cuckoo chain: the
// evicted print hops to ITS other home (computable from the
// fingerprint alone), red-flashing each shove, and the load meter
// climbs past ninety percent. Act two: churn: members leave (their
// one slot clears, nobody else is touched), newcomers reuse the
// space, and the banner keeps the unit's guarantee: one fingerprint
// out, zero collateral.
const W = 640;
const H = 300;
const SEED = 20260827;
const NB = 16;
const BS = 4;
const HOP_TICKS = 6;
const INSERTS_A1 = 58;
const DELETES_A2 = 20;
const INSERTS_A2 = 12;
const END_HOLD = 60;

function simulate(seed) {
  const rand = mulberry32(seed);
  const buckets = Array.from({ length: NB }, () => []);
  const events = []; // {kind:'hop', from, to, chain} | {kind:'place', b} | {kind:'delete', b, slot}
  const itemHome = new Map();

  const mkItem = (id) => {
    const i1 = Math.floor(rand() * NB);
    const fpH = Math.floor(rand() * NB);
    const hue = Math.floor(rand() * 360);
    return { id, i1, i2: i1 ^ fpH, fpH, hue };
  };

  const insert = (it) => {
    for (const b of [it.i1, it.i2]) {
      if (buckets[b].length < BS) {
        buckets[b].push(it);
        events.push({ kind: 'place', b, item: it, chain: 0 });
        return true;
      }
    }
    let b = rand() < 0.5 ? it.i1 : it.i2;
    let cur = it;
    let chain = 0;
    for (let k = 0; k < 40; k++) {
      const j = Math.floor(rand() * buckets[b].length);
      const evicted = buckets[b][j];
      buckets[b][j] = cur;
      chain += 1;
      events.push({ kind: 'evict', b, placed: cur, evicted, chain });
      cur = evicted;
      b = cur.i1 === b ? cur.i2 : cur.i1; // the other home, from the print
      if (buckets[b].length < BS) {
        buckets[b].push(cur);
        events.push({ kind: 'place', b, item: cur, chain });
        return true;
      }
    }
    return false;
  };

  for (let i = 0; i < INSERTS_A1; i++) insert(mkItem(i));
  const act1End = events.length;
  const loadA1 = buckets.reduce((a, b) => a + b.length, 0) / (NB * BS);

  // Churn: delete random residents, then insert newcomers.
  for (let d = 0; d < DELETES_A2; d++) {
    const occupied = [];
    buckets.forEach((bk, bi) => bk.forEach((_, si) => occupied.push([bi, si])));
    const [bi, si] = occupied[Math.floor(rand() * occupied.length)];
    const gone = buckets[bi].splice(si, 1)[0];
    events.push({ kind: 'delete', b: bi, item: gone });
  }
  for (let i = 0; i < INSERTS_A2; i++) insert(mkItem(1000 + i));
  const loadEnd = buckets.reduce((a, b) => a + b.length, 0) / (NB * BS);

  return { events, act1End, loadA1, loadEnd };
}

export default function CuckooViz() {
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
        sim: simulate(SEED + cycle.current * 4483),
        tick: 0,
        rest: 0,
        stopAtRest: isStill(),
      }),
      tick: (s) => {
        const total = s.sim.events.length * HOP_TICKS + END_HOLD;
        if (s.tick >= total) {
          if (s.stopAtRest) return false;
          s.rest += 1;
          if (s.rest > holdTicks(s)) {
            cycle.current += 1;
            Object.assign(s, {
              sim: simulate(SEED + cycle.current * 4483),
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
        const heur = css.getPropertyValue('--heur').trim() || '#f0b94b';
        const good = css.getPropertyValue('--path').trim() || '#62d98a';
        const warn = css.getPropertyValue('--warn').trim() || '#e2606c';
        const dim = css.getPropertyValue('--ink-dim').trim() || '#9aa5bd';

        const sim = s.sim;
        const shown = Math.min(Math.floor(s.tick / HOP_TICKS), sim.events.length);
        const inAct2 = shown > sim.act1End;

        // Replay events up to `shown` to get the visible table.
        const table = Array.from({ length: NB }, () => []);
        let lastEvent = null;
        for (let e = 0; e < shown; e++) {
          const ev = sim.events[e];
          lastEvent = ev;
          if (ev.kind === 'place') {
            table[ev.b].push(ev.item);
          } else if (ev.kind === 'evict') {
            const j = table[ev.b].findIndex((x) => x.id === ev.evicted.id);
            if (j >= 0) table[ev.b][j] = ev.placed;
          } else if (ev.kind === 'delete') {
            const j = table[ev.b].findIndex((x) => x.id === ev.item.id);
            if (j >= 0) table[ev.b].splice(j, 1);
          }
        }

        // The table: 16 buckets in a row, 4 slots stacked.
        const bx = (b) => 26 + b * 37;
        table.forEach((bk, b) => {
          ctx.strokeStyle = '#2a3450';
          ctx.strokeRect(bx(b), 70, 30, 4 * 22 + 6);
          for (let sIdx = 0; sIdx < BS; sIdx++) {
            const y = 74 + sIdx * 22;
            const it = bk[sIdx];
            if (it) {
              ctx.fillStyle = `hsl(${it.hue} 45% 55%)`;
              ctx.fillRect(bx(b) + 3, y, 24, 18);
            } else {
              ctx.strokeStyle = '#232c44';
              ctx.strokeRect(bx(b) + 3, y, 24, 18);
            }
          }
          ctx.fillStyle = dim;
          ctx.font = '9px ui-monospace, monospace';
          ctx.fillText(b.toString(16), bx(b) + 11, 178);
        });

        // Flash for the current event.
        if (lastEvent && s.tick % HOP_TICKS < HOP_TICKS - 1) {
          const color =
            lastEvent.kind === 'evict' ? warn : lastEvent.kind === 'delete' ? good : heur;
          ctx.strokeStyle = color;
          ctx.lineWidth = 2.2;
          ctx.strokeRect(bx(lastEvent.b) - 2, 68, 34, 96);
        }

        // Load meter.
        const count = table.reduce((a, b) => a + b.length, 0);
        const load = count / (NB * BS);
        ctx.fillStyle = '#2a3450';
        ctx.fillRect(26, 200, 585, 9);
        ctx.fillStyle = load > 0.9 ? warn : heur;
        ctx.fillRect(26, 200, 585 * load, 9);
        ctx.fillStyle = dim;
        ctx.font = '11px ui-monospace, monospace';
        ctx.fillText(`load ${(load * 100).toFixed(0)}% · ${count}/${NB * BS} slots`, 26, 226);

        ctx.fillStyle = dim;
        ctx.fillText(
          inAct2
            ? 'act 2 · churn: members leave (one slot each, nobody touched), newcomers reuse the space'
            : 'act 1 · fingerprints stream in; full homes trigger the cuckoo chain',
          14,
          20,
        );

        let line;
        if (!lastEvent) {
          line = 'the nest is empty…';
          ctx.fillStyle = dim;
        } else if (lastEvent.kind === 'evict') {
          line = `kick ${lastEvent.chain}: evicted print hops to ITS other home: i ⊕ hash(fp), no item needed`;
          ctx.fillStyle = warn;
        } else if (lastEvent.kind === 'delete') {
          line = 'delete: one fingerprint out, zero collateral: every neighbor untouched';
          ctx.fillStyle = good;
        } else if (shown >= sim.events.length) {
          line = `settled at ${(sim.loadEnd * 100).toFixed(0)}% after churn: members always found: the referee's guarantee`;
          ctx.fillStyle = good;
        } else {
          line = lastEvent.chain > 0 ? `chain of ${lastEvent.chain} resolved: everyone rehoused` : 'placed first try: a free slot in one of its two homes';
          ctx.fillStyle = heur;
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
          new nest
        </button>
        <span className="viz-stat">
          {snap.line || 'the nest is empty…'}
        </span>
      </div>
    </>
  );
}
