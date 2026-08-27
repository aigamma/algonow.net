import { useEffect, useRef, useState } from 'react';
import { useCanvasLoop, isStill, holdTicks, mulberry32 } from './useCanvasLoop.js';

// Two acts of one instruction stream. Act one: the machine, cycle
// by cycle: instructions issue in order into reservation stations,
// registers hold values or TAGS naming their future producer, the
// common data bus broadcasts one result per cycle and every
// waiting station snoops it. Act two: the race: serial execution,
// out-of-order WITHOUT renaming, and Tomasulo, run on the same
// loop: the no-rename bar finishes BEHIND plain serial: the
// machinery without names loses to no machinery at all.
const W = 640;
const H = 300;
const SEED = 20260827;
const LAT = { add: 2, sub: 2, mul: 10, div: 20 };
const CYCLE_TICKS = 8;
const END_HOLD = 70;

function applyOp(op, a, b) {
  if (op === 'add') return (a + b) % 1000000000;
  if (op === 'sub') return (a - b + 1000000000) % 1000000000;
  if (op === 'mul') return (a * b) % 1000000000;
  return (a * 7 + b * 3 + 1) % 1000000000;
}

export function runSequential(prog, regs0) {
  const regs = regs0.slice();
  for (const [dst, op, s1, s2] of prog) regs[dst] = applyOp(op, regs[s1], regs[s2]);
  return regs;
}

// Mirror of the python simulator, with per-cycle snapshots.
export function runTomasulo(prog, regs0, renaming, snap) {
  const regs = regs0.slice();
  const tagOf = new Array(8).fill(null);
  const stations = new Map();
  let sid = 0;
  let pc = 0;
  let cycle = 0;
  let inflightReads = [];
  const rsFree = (op) => {
    const pool = op === 'mul' || op === 'div' ? 'mul' : 'add';
    const cap = pool === 'mul' ? 2 : 3;
    let used = 0;
    for (const s of stations.values()) if (s.pool === pool) used += 1;
    return used < cap;
  };
  const snaps = [];
  while (pc < prog.length || stations.size) {
    cycle += 1;
    if (cycle > 100000) throw new Error('runaway');
    let event = '';
    const finished = [...stations.values()].filter((s) => s.state === 'exec' && s.doneAt <= cycle);
    finished.sort((a, b) => a.order - b.order);
    if (finished.length) {
      const w = finished[0];
      const val = applyOp(w.op, w.v1, w.v2);
      for (const s of stations.values()) {
        if (s.q1 === w.id) {
          s.q1 = null;
          s.v1 = val;
        }
        if (s.q2 === w.id) {
          s.q2 = null;
          s.v2 = val;
        }
      }
      if (tagOf[w.dst] === w.id) {
        regs[w.dst] = val;
        tagOf[w.dst] = null;
      }
      stations.delete(w.id);
      event = `CDB: S${w.id} broadcasts ${val} → r${w.dst} and snoopers`;
    }
    for (const s of stations.values()) {
      if (s.state === 'wait' && s.q1 === null && s.q2 === null) {
        s.state = 'exec';
        s.doneAt = cycle + LAT[s.op];
      }
    }
    if (pc < prog.length) {
      const [dst, op, s1, s2] = prog[pc];
      let can = rsFree(op);
      if (can && !renaming) {
        if (tagOf[dst] !== null) can = false;
        if (inflightReads.some(([, srcs]) => srcs.includes(dst))) can = false;
      }
      if (can) {
        sid += 1;
        const st = {
          id: sid,
          order: pc,
          op,
          dst,
          pool: op === 'mul' || op === 'div' ? 'mul' : 'add',
          state: 'wait',
          doneAt: null,
          q1: tagOf[s1],
          v1: tagOf[s1] === null ? regs[s1] : null,
          q2: tagOf[s2],
          v2: tagOf[s2] === null ? regs[s2] : null,
        };
        tagOf[dst] = sid;
        stations.set(sid, st);
        inflightReads.push([sid, [s1, s2]]);
        pc += 1;
        if (!event) event = `issue: I${pc} → S${sid}`;
      } else if (!event) {
        event = 'issue stalled';
      }
    }
    inflightReads = inflightReads.filter(([id]) => stations.has(id));
    if (snap) {
      snaps.push({
        cycle,
        pc,
        event,
        regs: regs.slice(),
        tags: tagOf.slice(),
        st: [...stations.values()].map((s) => ({
          id: s.id,
          op: s.op,
          pool: s.pool,
          state: s.state,
          q1: s.q1,
          q2: s.q2,
          doneAt: s.doneAt,
        })),
      });
    }
  }
  return { regs, cycle, snaps };
}

export const CLIENT = [
  [1, 'mul', 0, 2],
  [1, 'add', 1, 3],
  [4, 'mul', 0, 5],
  [4, 'add', 4, 3],
  [6, 'mul', 0, 7],
  [6, 'add', 6, 3],
  [2, 'mul', 0, 2],
  [2, 'add', 2, 3],
];
const REGS0 = [3, 10, 20, 5, 30, 40, 50, 60];

export function makeScene(seed) {
  const rand = mulberry32(seed);
  // Vary the initial registers per cycle for freshness; program fixed.
  const regs0 = REGS0.map((v) => v + Math.floor(rand() * 9));
  const ooo = runTomasulo(CLIENT, regs0, true, true);
  const off = runTomasulo(CLIENT, regs0, false, false);
  const serial = CLIENT.reduce((a, [, op]) => a + LAT[op], 0);
  const seq = runSequential(CLIENT, regs0);
  return { regs0, ooo, off, serial, seq };
}

export default function TomasuloViz() {
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
        act: 0,
        tick: 0,
        rest: 0,
        stopAtRest: isStill(),
      }),
      tick: (s) => {
        if (s.act >= 2) {
          if (s.stopAtRest) return false;
          s.rest += 1;
          if (s.rest > holdTicks(s)) {
            cycle.current += 1;
            Object.assign(s, {
              scene: makeScene(SEED + cycle.current * 7919),
              act: 0,
              tick: 0,
              rest: 0,
            });
          }
          return true;
        }
        s.tick += 1;
        const len =
          s.act === 0
            ? s.scene.ooo.snaps.length * CYCLE_TICKS + END_HOLD
            : s.scene.off.cycle * 3 + END_HOLD;
        if (s.tick >= len) {
          // Hold the finished act for the full rest before the next
          // act begins: every burst of motion earns its two minutes.
          s.tick = len;
          s.actRest = (s.actRest || 0) + 1;
          if (s.actRest > holdTicks(s)) {
            s.tick = 0;
            s.act += 1;
            s.actRest = 0;
          }
        }
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

        const done = s.act >= 2;
        const actIdx = done ? 1 : s.act;
        ctx.fillStyle = dim;
        ctx.font = '11px ui-monospace, monospace';

        if (actIdx === 0) {
          const snaps = sc.ooo.snaps;
          const ci = Math.min(done ? snaps.length - 1 : Math.floor(s.tick / CYCLE_TICKS), snaps.length - 1);
          const sn = snaps[ci];
          const finished = done || ci >= snaps.length - 1;
          ctx.fillText('act 1 · the machine: issue in order, wait on tags, execute on data, broadcast on the bus', 14, 20);

          // Program listing.
          CLIENT.forEach((inst, i) => {
            const [dst, op, s1, s2] = inst;
            ctx.fillStyle = i < sn.pc ? dim : ink;
            ctx.font = '10px ui-monospace, monospace';
            ctx.fillText(`${i < sn.pc ? '·' : '▸'} r${dst}=${op}(r${s1},r${s2})`, 14, 48 + i * 16);
          });

          // Reservation stations.
          ctx.fillStyle = dim;
          ctx.fillText('reservation stations', 190, 40);
          const slots = [...sn.st];
          for (let k = 0; k < 5; k++) {
            const y = 48 + k * 26;
            const st = slots[k];
            ctx.strokeStyle = st ? (st.state === 'exec' ? heur : warn) : 'rgba(154,165,189,0.3)';
            ctx.lineWidth = st ? 2 : 1;
            ctx.strokeRect(190, y, 210, 20);
            if (st) {
              ctx.fillStyle = st.state === 'exec' ? heur : warn;
              ctx.font = '10px ui-monospace, monospace';
              const w1 = st.q1 === null ? 'ok' : `S${st.q1}?`;
              const w2 = st.q2 === null ? 'ok' : `S${st.q2}?`;
              ctx.fillText(
                `S${st.id} ${st.op} [${w1},${w2}] ${st.state === 'exec' ? `t-${Math.max(0, st.doneAt - sn.cycle)}` : 'WAIT'}`,
                196,
                y + 14,
              );
            }
          }

          // Register file with tags.
          ctx.fillStyle = dim;
          ctx.fillText('registers: value or the TAG of their future', 190, 196);
          for (let r = 0; r < 8; r++) {
            const x = 190 + r * 55;
            const tagged = sn.tags[r] !== null;
            ctx.strokeStyle = tagged ? heur : 'rgba(154,165,189,0.35)';
            ctx.lineWidth = tagged ? 2 : 1;
            ctx.strokeRect(x, 204, 48, 22);
            ctx.fillStyle = tagged ? heur : ink;
            ctx.font = '9px ui-monospace, monospace';
            ctx.fillText(tagged ? `←S${sn.tags[r]}` : String(sn.regs[r] % 100000), x + 4, 219);
          }

          let line;
          if (finished) {
            line = `done in ${sc.ooo.cycle} cycles · registers equal the in-order interpreter, every one`;
            ctx.fillStyle = good;
          } else {
            line = `cycle ${sn.cycle}: ${sn.event || '…'}`;
            ctx.fillStyle = sn.event.startsWith('CDB') ? good : sn.event.startsWith('issue s') ? warn : ink;
          }
          ctx.font = '12px ui-monospace, monospace';
          ctx.fillText(line, 14, H - 12);
          statsRef.current = { line };
        } else {
          const t = done ? sc.off.cycle : Math.min(Math.floor(s.tick / 3), sc.off.cycle);
          ctx.fillText('act 2 · the race, in counted cycles: same loop, three machines', 14, 20);
          const lanes = [
            { label: `serial: ${sc.serial}`, total: sc.serial, color: dim },
            { label: `OoO, renaming OFF: ${sc.off.cycle}`, total: sc.off.cycle, color: warn },
            { label: `Tomasulo: ${sc.ooo.cycle}`, total: sc.ooo.cycle, color: good },
          ];
          const X = (c) => 30 + (c / sc.off.cycle) * 560;
          lanes.forEach((ln, i) => {
            const y = 70 + i * 56;
            ctx.fillStyle = ln.color;
            ctx.font = '11px ui-monospace, monospace';
            ctx.fillText(ln.label, 30, y - 8);
            ctx.strokeStyle = 'rgba(154,165,189,0.3)';
            ctx.strokeRect(30, y, 560, 16);
            ctx.fillStyle = ln.color;
            ctx.globalAlpha = 0.6;
            ctx.fillRect(30, y, Math.min(X(Math.min(t, ln.total)) - 30, 560), 16);
            ctx.globalAlpha = 1;
            if (t >= ln.total) {
              ctx.fillStyle = ln.color;
              ctx.fillText('done', X(ln.total) + 6, y + 13);
            }
          });
          // The twist marker: serial's finish line crossing the no-rename lane.
          ctx.strokeStyle = dim;
          ctx.setLineDash([3, 3]);
          ctx.beginPath();
          ctx.moveTo(X(sc.serial), 60);
          ctx.lineTo(X(sc.serial), 200);
          ctx.stroke();
          ctx.setLineDash([]);

          let line;
          if (done || t >= sc.off.cycle) {
            line = `renaming OFF finished ${sc.off.cycle - sc.serial} cycles BEHIND plain serial: names were the whole dividend`;
            ctx.fillStyle = warn;
          } else {
            line = `cycle ${t}: adds hide under multiplies in the green lane`;
            ctx.fillStyle = ink;
          }
          ctx.font = '12px ui-monospace, monospace';
          ctx.fillText(line, 14, H - 12);
          statsRef.current = {
            line: done
              ? 'dependencies are physics: names are bookkeeping: rename the bookkeeping away'
              : line,
          };
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
          new registers
        </button>
        <span className="viz-stat">
          {snap.line || 'filling the stations…'}
        </span>
      </div>
    </>
  );
}
