import { useEffect, useRef, useState } from 'react';
import { useCanvasLoop, isStill, holdTicks, mulberry32 } from './useCanvasLoop.js';

// The ring, twice. Eight nodes own arcs of the circle (key = first node
// clockwise). Act one: one pin each: lopsided arcs; the departing
// node's single big arc flashes red and falls to ONE neighbor. Act two:
// forty pins each: confetti arcs, level loads; the same departure
// scatters its slivers to many heirs. All percentages on screen are
// computed from the actual arc geometry, and the mod-N comparison line
// states its exact (N-1)/N.
const W = 640;
const H = 300;
const SEED = 20260827;
const NODES = 'ABCDEFGH'.split('');
const VICTIM = 3; // node D
const COLORS = ['#5da2ff', '#f0b94b', '#62d98a', '#e2606c', '#a58bff', '#4fd1c5', '#f687b3', '#9ae66e'];
const PHASES = [46, 34, 22, 34, 56]; // build, hold, flash, transfer, verdict

function buildRing(rand, vnodes, nodes) {
  const pts = [];
  nodes.forEach((nd, ni) => {
    for (let v = 0; v < vnodes; v++) {
      pts.push({ t: rand(), ni });
    }
  });
  pts.sort((a, b) => a.t - b.t);
  // Arc (prev, this] belongs to this point's node.
  const arcs = pts.map((p, i) => {
    const prev = i === 0 ? pts[pts.length - 1].t - 1 : pts[i - 1].t;
    return { a0: prev, a1: p.t, ni: p.ni };
  });
  return arcs;
}

function makeActs(seed) {
  const acts = [];
  for (const vnodes of [1, 40]) {
    // One shared random stream per act so both acts differ but are
    // stable within a cycle; node pin positions are the whole story.
    const rand = mulberry32(seed * 31 + vnodes);
    const arcs = buildRing(rand, vnodes, NODES);
    const victimShare = arcs
      .filter((a) => a.ni === VICTIM)
      .reduce((s, a) => s + (a.a1 - a.a0), 0);
    // Heirs: for each victim arc, the next arc clockwise not owned by
    // the victim inherits it.
    const heirs = new Set();
    arcs.forEach((a, i) => {
      if (a.ni !== VICTIM) return;
      for (let j = 1; j <= arcs.length; j++) {
        const nxt = arcs[(i + j) % arcs.length];
        if (nxt.ni !== VICTIM) {
          heirs.add(nxt.ni);
          break;
        }
      }
    });
    acts.push({ vnodes, arcs, victimShare, heirs: [...heirs] });
  }
  return acts;
}

export default function ConsistentHashViz() {
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
        acts: makeActs(SEED + cycle.current * 7919),
        act: 0,
        tick: 0,
        rest: 0,
        stopAtRest: isStill(),
      }),
      tick: (s) => {
        const total = PHASES.reduce((a, b) => a + b, 0);
        if (s.act >= s.acts.length) {
          if (s.stopAtRest) return false;
          s.rest += 1;
          if (s.rest > holdTicks(s)) {
            cycle.current += 1;
            Object.assign(s, {
              acts: makeActs(SEED + cycle.current * 7919),
              act: 0,
              tick: 0,
              rest: 0,
            });
          }
          return true;
        }
        s.tick += 1;
        if (s.tick >= total) {
          // Hold the finished act for the full rest before the next
          // act begins: every burst of motion earns its two minutes.
          s.tick = total;
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
        const warn = css.getPropertyValue('--warn').trim() || '#e2606c';
        const dim = css.getPropertyValue('--ink-dim').trim() || '#9aa5bd';
        const ink = css.getPropertyValue('--ink').trim() || '#e9edf6';

        const done = s.act >= s.acts.length;
        const actIdx = done ? s.acts.length - 1 : s.act;
        const act = s.acts[actIdx];
        const tick = done ? PHASES.reduce((a, b) => a + b, 0) : s.tick;
        let phase = 0;
        let t = tick;
        while (phase < PHASES.length - 1 && t >= PHASES[phase]) {
          t -= PHASES[phase];
          phase += 1;
        }

        const cx = 172;
        const cy = 160;
        const R = 96;
        const angOf = (frac) => frac * Math.PI * 2 - Math.PI / 2;

        const buildFrac = phase === 0 ? t / PHASES[0] : 1;
        const transferFrac = phase < 3 ? 0 : phase === 3 ? t / PHASES[3] : 1;
        const flashing = phase === 2;

        act.arcs.forEach((arc) => {
          const isVictim = arc.ni === VICTIM;
          let color = COLORS[arc.ni];
          if (isVictim && flashing && Math.floor(t / 4) % 2 === 0) color = warn;
          if (isVictim && transferFrac >= 1) {
            // Fully inherited: draw in the heir's color.
            const idx = act.arcs.indexOf(arc);
            for (let j = 1; j <= act.arcs.length; j++) {
              const nxt = act.arcs[(idx + j) % act.arcs.length];
              if (nxt.ni !== VICTIM) {
                color = COLORS[nxt.ni];
                break;
              }
            }
          } else if (isVictim && transferFrac > 0) {
            color = warn;
          }
          const span = arc.a1 - arc.a0;
          const a0 = angOf(arc.a0);
          const a1 = angOf(arc.a0 + span * buildFrac);
          ctx.strokeStyle = color;
          ctx.globalAlpha = isVictim && transferFrac > 0 && transferFrac < 1 ? 0.55 : 1;
          ctx.lineWidth = 18;
          ctx.beginPath();
          ctx.arc(cx, cy, R, a0 + 0.004, a1 - 0.004);
          ctx.stroke();
          ctx.globalAlpha = 1;
        });

        // Legend and stats.
        NODES.forEach((nd, ni) => {
          const x = 352 + (ni % 4) * 66;
          const y = 44 + Math.floor(ni / 4) * 22;
          const gone = ni === VICTIM && phase >= 3;
          ctx.fillStyle = gone ? '#3a4664' : COLORS[ni];
          ctx.fillRect(x, y - 9, 10, 10);
          ctx.fillStyle = gone ? '#3a4664' : dim;
          ctx.font = '11px ui-monospace, monospace';
          ctx.fillText(nd + (gone ? ' ✕' : ''), x + 15, y);
        });

        ctx.fillStyle = dim;
        ctx.font = '11px ui-monospace, monospace';
        ctx.fillText(
          `act ${actIdx + 1}/2 · ${act.vnodes} pin${act.vnodes > 1 ? 's' : ''} per node`,
          14,
          20,
        );
        const pct = (act.victimShare * 100).toFixed(1);
        const lines = [];
        if (phase >= 1) {
          const shares = NODES.map((_, ni) =>
            act.arcs.filter((a) => a.ni === ni).reduce((sm, a) => sm + (a.a1 - a.a0), 0),
          );
          const maxShare = Math.max(...shares);
          lines.push(`largest territory: ${(maxShare * 100).toFixed(1)}% (fair: 12.5%)`);
        }
        if (phase >= 2) lines.push(`node D departs: its ${pct}% must move`);
        if (phase >= 4) {
          lines.push(
            `heir${act.heirs.length > 1 ? 's' : ''}: ${act.heirs.length} neighbor${act.heirs.length > 1 ? 's' : ''} inherit${act.heirs.length > 1 ? '' : 's'} it all`,
          );
          lines.push('mod-N would move 87.5% (= (N−1)/N)');
        }
        ctx.fillStyle = ink;
        ctx.font = '12px ui-monospace, monospace';
        lines.forEach((ln, i) => ctx.fillText(ln, 352, 108 + i * 24));

        ctx.fillStyle = dim;
        ctx.font = '10px ui-monospace, monospace';
        ctx.fillText('key = first pin clockwise · arc length = key share', 14, H - 10);

        const line =
          phase >= 4
            ? act.vnodes === 1
              ? `one pin: ${pct}% falls on ONE heir`
              : `${act.vnodes} pins: ${pct}% scatters to ${act.heirs.length} heirs`
            : `building the ring (${act.vnodes} pin${act.vnodes > 1 ? 's' : ''}/node)…`;
        statsRef.current = {
          line: done ? 'same departure, two fates: the hats decide who inherits' : line,
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
          new fleet
        </button>
        <span className="viz-stat">
          {snap.line || 'hashing pins onto the circle…'}
        </span>
      </div>
    </>
  );
}
