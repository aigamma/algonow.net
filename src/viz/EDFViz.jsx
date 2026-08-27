import { useEffect, useRef, useState } from 'react';
import { useCanvasLoop, isStill, holdTicks, mulberry32 } from './useCanvasLoop.js';

// The classic pair, run twice. Tasks (C=2, T=5) and (C=4, T=7): 97.1%
// of one CPU. Act one: rate-monotonic (fixed: the 5-tick task always
// outranks): the 7-tick task's first job dies at t=7, red X, and the
// same X returns every hyperperiod. Act two: the SAME tasks under EDF:
// the ranks reshuffle by deadline and all 12 jobs of the 35-tick
// hyperperiod land green. One Gantt, two priority rules.
const W = 640;
const H = 300;
const SEED = 20260827;
const TASKS = [
  { C: 2, T: 5, name: 'A (2 of every 5)' },
  { C: 4, T: 7, name: 'B (4 of every 7)' },
];
const HYPER = 35;
const TICK_ANIM = 7;
const ACT_HOLD = 60;

function simulate(policy) {
  const n = TASKS.length;
  const remaining = new Array(n).fill(0);
  const deadline = new Array(n).fill(0);
  const timeline = []; // per tick: running task index or -1
  const events = []; // {t, task, kind: 'miss'|'meet'}
  for (let t = 0; t < HYPER; t++) {
    TASKS.forEach((task, i) => {
      if (t % task.T === 0) {
        if (t > 0) {
          events.push({ t, task: i, kind: remaining[i] > 0 ? 'miss' : 'meet' });
        }
        remaining[i] = task.C;
        deadline[i] = t + task.T;
      }
    });
    const ready = [];
    for (let i = 0; i < n; i++) if (remaining[i] > 0) ready.push(i);
    let run = -1;
    if (ready.length) {
      run =
        policy === 'edf'
          ? ready.reduce((a, b) => (deadline[a] <= deadline[b] ? a : b))
          : ready.reduce((a, b) => (TASKS[a].T <= TASKS[b].T ? a : b));
      remaining[run] -= 1;
    }
    timeline.push(run);
  }
  TASKS.forEach((task, i) => {
    events.push({ t: HYPER, task: i, kind: remaining[i] > 0 ? 'miss' : 'meet' });
  });
  return { timeline, events };
}

function makeScene(seed) {
  mulberry32(seed)(); // cycle entropy unused: the instance is canonical
  return { rm: simulate('rm'), edf: simulate('edf') };
}

export default function EDFViz() {
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
        const total = HYPER * TICK_ANIM + ACT_HOLD;
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
        const algo = css.getPropertyValue('--algo').trim() || '#5da2ff';
        const heur = css.getPropertyValue('--heur').trim() || '#f0b94b';
        const good = css.getPropertyValue('--path').trim() || '#62d98a';
        const warn = css.getPropertyValue('--warn').trim() || '#e2606c';
        const dim = css.getPropertyValue('--ink-dim').trim() || '#9aa5bd';
        const ink = css.getPropertyValue('--ink').trim() || '#e9edf6';

        const done = s.act >= 2;
        const actIdx = done ? 1 : s.act;
        const run = actIdx === 0 ? s.scene.rm : s.scene.edf;
        const upTo = done
          ? HYPER
          : Math.min(Math.floor(s.tick / TICK_ANIM), HYPER);

        const x0 = 46;
        const cw = (W - x0 - 20) / HYPER;
        const rowY = [90, 170];
        const rowH = 34;
        const colors = [heur, algo];

        // Grid and releases.
        TASKS.forEach((task, i) => {
          ctx.fillStyle = dim;
          ctx.font = '11px ui-monospace, monospace';
          ctx.fillText(task.name, x0, rowY[i] - 8);
          ctx.strokeStyle = '#232c40';
          ctx.strokeRect(x0, rowY[i], HYPER * cw, rowH);
          for (let t = 0; t <= HYPER; t += task.T) {
            const x = x0 + t * cw;
            ctx.strokeStyle = `${colors[i]}77`;
            ctx.beginPath();
            ctx.moveTo(x, rowY[i] - 4);
            ctx.lineTo(x, rowY[i] + rowH + 4);
            ctx.stroke();
          }
        });
        // Executed ticks.
        for (let t = 0; t < upTo; t++) {
          const r = run.timeline[t];
          if (r >= 0) {
            ctx.fillStyle = `${colors[r]}bb`;
            ctx.fillRect(x0 + t * cw + 1, rowY[r] + 3, cw - 2, rowH - 6);
          }
        }
        // Deadline verdicts.
        run.events.forEach((ev) => {
          if (ev.t > upTo) return;
          const x = x0 + ev.t * cw;
          const y = rowY[ev.task];
          if (ev.kind === 'miss') {
            ctx.strokeStyle = warn;
            ctx.lineWidth = 2.4;
            ctx.beginPath();
            ctx.moveTo(x - 6, y - 16);
            ctx.lineTo(x + 6, y - 4);
            ctx.moveTo(x + 6, y - 16);
            ctx.lineTo(x - 6, y - 4);
            ctx.stroke();
          } else {
            ctx.strokeStyle = good;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(x - 6, y - 10);
            ctx.lineTo(x - 2, y - 5);
            ctx.lineTo(x + 6, y - 16);
            ctx.stroke();
          }
        });

        const misses = run.events.filter((e) => e.t <= upTo && e.kind === 'miss').length;
        ctx.fillStyle = dim;
        ctx.font = '11px ui-monospace, monospace';
        ctx.fillText(
          actIdx === 0
            ? 'act 1 · rate-monotonic: task A ALWAYS outranks (fixed priority) · U = 97.1%'
            : 'act 2 · the same tasks under EDF: rank = whose deadline is nearest',
          14,
          20,
        );
        let line = `t = ${upTo}/${HYPER} · deadline misses: ${misses}`;
        if (done || upTo >= HYPER) {
          ctx.fillStyle = actIdx === 0 ? warn : good;
          line =
            actIdx === 0
              ? `rate-monotonic drops task B: ${misses} miss(es) per hyperperiod, forever`
              : 'EDF: every one of the 12 jobs lands · same CPU, same tasks, different priority';
        } else {
          ctx.fillStyle = ink;
        }
        ctx.font = '12px ui-monospace, monospace';
        ctx.fillText(line, 14, H - 30);
        ctx.fillStyle = dim;
        ctx.font = '10px ui-monospace, monospace';
        ctx.fillText('vertical lines = releases and deadlines · ✓ met · ✗ missed', 14, H - 12);

        statsRef.current = {
          line: done ? 'the priority is the whole difference: 97.1% scheduled, or dropped' : line,
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
          replay
        </button>
        <span className="viz-stat">
          {snap.line || 'releasing the first jobs…'}
        </span>
      </div>
    </>
  );
}
