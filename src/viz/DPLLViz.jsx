import { useEffect, useRef, useState } from 'react';
import { useCanvasLoop, isStill, holdTicks, mulberry32 } from './useCanvasLoop.js';

// Two acts of one formula. Act one: DPLL with unit propagation on a
// random 3-SAT instance near the threshold: amber decisions, blue
// forced literals cascading after each one, red conflict flashes,
// backtracks rewinding the trail, until a verdict. Act two: the
// ablation: the SAME instance, the SAME branching rule, propagation
// switched off: nothing to watch but the node counter grinding
// through a search tree several times larger, batch by batch. The
// difference between the two counters is what the heuristic is.
const W = 640;
const H = 300;
const SEED = 20260827;
const NV = 16;
const NC = 67;
const END_HOLD = 70;
const BATCH = 30;

function makeInstance(seed) {
  const rand = mulberry32(seed);
  const cls = [];
  for (let i = 0; i < NC; i++) {
    const vs = [];
    while (vs.length < 3) {
      const v = 1 + Math.floor(rand() * NV);
      if (!vs.includes(v)) vs.push(v);
    }
    cls.push(vs.map((v) => (rand() < 0.5 ? v : -v)));
  }
  return cls;
}

function litTrue(assign, l) {
  const v = assign[Math.abs(l)];
  return v !== 0 && (l > 0) === (v > 0);
}
function litFalse(assign, l) {
  const v = assign[Math.abs(l)];
  return v !== 0 && (l > 0) !== (v > 0);
}

function clauseStates(cls, assign) {
  return cls.map((cl) => {
    if (cl.some((l) => litTrue(assign, l))) return 1; // satisfied
    if (cl.every((l) => litFalse(assign, l))) return 2; // conflict
    return 0; // alive
  });
}

function pickBranch(cls, assign) {
  let bestLen = null;
  const counts = new Map();
  for (const cl of cls) {
    const live = [];
    let sat = false;
    for (const l of cl) {
      if (litTrue(assign, l)) {
        sat = true;
        break;
      }
      if (assign[Math.abs(l)] === 0) live.push(l);
    }
    if (sat || live.length === 0) continue;
    if (bestLen === null || live.length < bestLen) {
      bestLen = live.length;
      counts.clear();
    }
    if (live.length === bestLen) for (const l of live) counts.set(l, (counts.get(l) || 0) + 1);
  }
  let best = null;
  let bc = -1;
  for (const [l, c] of counts) {
    if (c > bc || (c === bc && Math.abs(l) < Math.abs(best))) {
      best = l;
      bc = c;
    }
  }
  return best;
}

// DPLL with an event recorder: each event snapshots the assignment
// (1 decision, 2 propagated, sign = value) so drawing is a replay.
export function runDPLL(cls, useUP) {
  const assign = new Array(NV + 1).fill(0);
  const kind = new Array(NV + 1).fill(0);
  const events = [];
  let decisions = 0;
  const snap = (tag, extra) =>
    events.push({ tag, assign: assign.slice(), kind: kind.slice(), decisions, ...extra });

  function propagate(trail) {
    let changed = true;
    while (changed) {
      changed = false;
      for (let ci = 0; ci < cls.length; ci++) {
        const cl = cls[ci];
        let live = null;
        let nLive = 0;
        let sat = false;
        for (const l of cl) {
          if (litTrue(assign, l)) {
            sat = true;
            break;
          }
          if (assign[Math.abs(l)] === 0) {
            live = l;
            nLive += 1;
            if (nLive > 1) break;
          }
        }
        if (sat || nLive > 1) continue;
        if (nLive === 0) {
          snap('conflict', { clause: ci });
          return false;
        }
        const v = Math.abs(live);
        assign[v] = live > 0 ? 1 : -1;
        kind[v] = 2;
        trail.push(v);
        snap('prop', { clause: ci, var: v });
        changed = true;
      }
    }
    return true;
  }

  function rec() {
    const trail = [];
    if (useUP) {
      if (!propagate(trail)) {
        for (const v of trail) {
          assign[v] = 0;
          kind[v] = 0;
        }
        return null;
      }
    } else {
      for (let ci = 0; ci < cls.length; ci++) {
        if (cls[ci].every((l) => litFalse(assign, l))) return null;
      }
    }
    const states = clauseStates(cls, assign);
    if (states.every((s) => s === 1)) {
      snap('sat', {});
      return assign.slice();
    }
    const lit = pickBranch(cls, assign);
    if (lit === null) {
      for (const v of trail) {
        assign[v] = 0;
        kind[v] = 0;
      }
      return null;
    }
    for (const val of [lit > 0 ? 1 : -1, lit > 0 ? -1 : 1]) {
      const v = Math.abs(lit);
      if (assign[v] !== 0) break;
      decisions += 1;
      assign[v] = val;
      kind[v] = 1;
      if (useUP) snap('decide', { var: v });
      const res = rec();
      if (res) return res;
      assign[v] = 0;
      kind[v] = 0;
      if (useUP) snap('undo', { var: v });
    }
    for (const v of trail) {
      assign[v] = 0;
      kind[v] = 0;
    }
    return null;
  }

  const model = rec();
  if (!model) snap('unsat', {});
  return { model, events, decisions };
}

export function makeScene(seed) {
  // Deterministic seed search: a watchable act 1 needs a run with
  // some real backtracking but a bounded reel.
  for (let k = 0; k < 60; k++) {
    const cls = makeInstance(seed + k * 131);
    const up = runDPLL(cls, true);
    if (up.decisions >= 12 && up.decisions <= 45 && up.events.length <= 260) {
      const bare = runDPLL(cls, false);
      if (bare.decisions >= 4 * up.decisions) {
        return { cls, up, bare, pick: k };
      }
    }
  }
  // Fallback: first instance regardless (never reached in verified
  // cycles; keeps the viz total under any seed drift).
  const cls = makeInstance(seed);
  return { cls, up: runDPLL(cls, true), bare: runDPLL(cls, false), pick: -1 };
}

export default function DPLLViz() {
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
            ? s.scene.up.events.length + END_HOLD
            : Math.ceil(s.scene.bare.decisions / BATCH) + END_HOLD;
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
          const evs = sc.up.events;
          const ei = Math.min(done ? evs.length - 1 : s.tick, evs.length - 1);
          const ev = evs[ei];
          ctx.fillText('act 1 · DPLL with unit propagation: decide amber, the cascade forces blue', 14, 20);

          // Variable strip.
          for (let v = 1; v <= NV; v++) {
            const x = 14 + (v - 1) * 38;
            const a = ev.assign[v];
            const k = ev.kind[v];
            ctx.fillStyle = a === 0 ? 'rgba(154,165,189,0.12)' : k === 1 ? heur : algo;
            ctx.globalAlpha = a === 0 ? 1 : 0.85;
            ctx.fillRect(x, 34, 32, 18);
            ctx.globalAlpha = 1;
            ctx.fillStyle = a === 0 ? dim : '#10141f';
            ctx.font = '10px ui-monospace, monospace';
            ctx.fillText(a === 0 ? `x${v}` : `${a > 0 ? '' : '¬'}x${v}`, x + 4, 47);
          }

          // Clause wall.
          const states = clauseStates(sc.cls, ev.assign);
          const cols = 12;
          for (let ci = 0; ci < NC; ci++) {
            const cx = 14 + (ci % cols) * 51;
            const cy = 66 + Math.floor(ci / cols) * 28;
            const st = states[ci];
            const flash = (ev.tag === 'conflict' || ev.tag === 'prop') && ev.clause === ci;
            ctx.fillStyle =
              st === 2 ? warn : st === 1 ? 'rgba(98,217,138,0.18)' : 'rgba(154,165,189,0.10)';
            ctx.fillRect(cx, cy, 46, 22);
            if (flash) {
              ctx.strokeStyle = ev.tag === 'conflict' ? warn : algo;
              ctx.lineWidth = 2;
              ctx.strokeRect(cx - 1, cy - 1, 48, 24);
            }
          }

          let line;
          if (done || ev.tag === 'sat' || ev.tag === 'unsat') {
            const verdict = sc.up.model ? 'SAT: model found' : 'UNSAT: proven';
            line = `${verdict} · ${sc.up.decisions} decisions with propagation`;
            ctx.fillStyle = good;
          } else {
            const what =
              ev.tag === 'decide'
                ? `decide x${ev.var}`
                : ev.tag === 'prop'
                  ? `clause ${ev.clause} forces x${ev.var}`
                  : ev.tag === 'conflict'
                    ? `clause ${ev.clause} empty: CONFLICT, backtrack`
                    : ev.tag === 'undo'
                      ? `undo x${ev.var}`
                      : '…';
            line = `${what} · decisions ${ev.decisions}`;
            ctx.fillStyle = ev.tag === 'conflict' ? warn : ink;
          }
          ctx.font = '12px ui-monospace, monospace';
          ctx.fillText(line, 14, H - 12);
          statsRef.current = { line: done ? statsRef.current.line : line };
        } else {
          // Act 2: the ablation counter.
          const total = sc.bare.decisions;
          const steps = Math.ceil(total / BATCH);
          const t = done ? steps : Math.min(s.tick, steps);
          const count = Math.min(total, t * BATCH);
          ctx.fillText('act 2 · the same formula, the same branching: propagation OFF', 14, 20);

          const frac = count / total;
          ctx.fillStyle = 'rgba(226,96,108,0.18)';
          ctx.fillRect(40, 110, (W - 80) * frac, 44);
          ctx.strokeStyle = warn;
          ctx.lineWidth = 1.6;
          ctx.strokeRect(40, 110, W - 80, 44);
          ctx.fillStyle = warn;
          ctx.font = '22px ui-monospace, monospace';
          ctx.fillText(`${count.toLocaleString()} nodes`, 60, 140);
          ctx.font = '12px ui-monospace, monospace';
          ctx.fillStyle = dim;
          ctx.fillText(`act 1 with propagation: ${sc.up.decisions} decisions`, 60, 180);

          const finishedAct = done || t >= steps;
          let line;
          if (finishedAct) {
            const ratio = (total / Math.max(1, sc.up.decisions)).toFixed(0);
            line = `${total.toLocaleString()} nodes vs ${sc.up.decisions}: ${ratio}x: the cascade of forced moves WAS the solver`;
            ctx.fillStyle = warn;
          } else {
            line = `grinding the guess-only tree: ${count.toLocaleString()} nodes and counting…`;
            ctx.fillStyle = ink;
          }
          ctx.font = '12px ui-monospace, monospace';
          ctx.fillText(line, 14, H - 12);
          statsRef.current = {
            line: done
              ? `same verdict both times: propagation cut the tree ${(total / Math.max(1, sc.up.decisions)).toFixed(0)}x`
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
          new formula
        </button>
        <span className="viz-stat">
          {snap.line || 'dealing the clauses…'}
        </span>
      </div>
    </>
  );
}
