import { useEffect, useRef, useState } from 'react';
import { useCanvasLoop, isStill, holdTicks, mulberry32 } from './useCanvasLoop.js';

// Two acts, one task set, one hyperperiod of 100ms. Act one crowns
// the "important" 100ms telemetry: its 25ms burst walls off the CPU
// and the 5ms sensor collects red misses from its first deadline.
// Act two runs the same three tasks under the rate rule: the sensor
// steals 1ms slices, the control law weaves, the telemetry fills the
// gaps and still lands at 54 of 100: every deadline met. Same tasks,
// same demand: only the priority table changed.
const W = 640;
const H = 300;
const SEED = 20260827;
const TASKS = [
  { T: 5, C: 1, name: 'sensor 5ms', color: 'heur' },
  { T: 20, C: 6, name: 'control 20ms', color: 'algo' },
  { T: 100, C: 25, name: 'telemetry 100ms', color: 'slate' },
];
const HYPER = 100;
const TIME_TICKS = 3;
const END_HOLD = 64;

function simulate(priorityOf) {
  const order = TASKS.map((_, i) => i).sort((a, b) => priorityOf(a) - priorityOf(b));
  const remaining = [0, 0, 0];
  const runAt = Array(HYPER).fill(-1);
  const misses = [];
  for (let t = 0; t < HYPER; t++) {
    TASKS.forEach((task, i) => {
      if (t % task.T === 0) {
        if (remaining[i] > 0) misses.push({ t, task: i });
        remaining[i] = task.C;
      }
    });
    const run = order.find((i) => remaining[i] > 0);
    if (run !== undefined) {
      remaining[run] -= 1;
      runAt[t] = run;
    }
  }
  TASKS.forEach((task, i) => {
    if (remaining[i] > 0) misses.push({ t: HYPER, task: i });
  });
  return { runAt, misses };
}

function makeScene() {
  return {
    acts: [
      {
        ...simulate((i) => [2, 1, 0][i]),
        note: 'act 1 · priorities by importance: telemetry crowned',
        bad: true,
      },
      {
        ...simulate((i) => TASKS[i].T),
        note: 'act 2 · the rate rule: shorter period wins',
        bad: false,
      },
    ],
  };
}

export default function RateMonotonicViz() {
  const canvasRef = useRef(null);
  const cycle = useRef(0);
  const statsRef = useRef({ line: '' });
  const [restart, setRestart] = useState(0);
  const [snap, setSnap] = useState({ line: '' });

  useEffect(() => {
    const id = setInterval(() => setSnap({ ...statsRef.current }), 400);
    return () => clearInterval(id);
  }, []);

  const ACT_TOTAL = HYPER * TIME_TICKS + END_HOLD;

  useCanvasLoop(
    canvasRef,
    {
      width: W,
      height: H,
      stepMs: 45,
      init: () => ({
        scene: makeScene(),
        seedBump: mulberry32(SEED + cycle.current)(),
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
              scene: makeScene(),
              act: 0,
              tick: 0,
              rest: 0,
            });
          }
          return true;
        }
        s.tick += 1;
        if (s.tick >= ACT_TOTAL) {
          s.tick = 0;
          s.act += 1;
        }
        return true;
      },
      draw: (ctx, s) => {
        ctx.clearRect(0, 0, W, H);
        const css = getComputedStyle(document.documentElement);
        const palette = {
          heur: css.getPropertyValue('--heur').trim() || '#f0b94b',
          algo: css.getPropertyValue('--algo').trim() || '#5da2ff',
          slate: '#3e6f8e',
        };
        const good = css.getPropertyValue('--path').trim() || '#62d98a';
        const warn = css.getPropertyValue('--warn').trim() || '#e2606c';
        const dim = css.getPropertyValue('--ink-dim').trim() || '#9aa5bd';

        const done = s.act >= 2;
        const actIdx = done ? 1 : s.act;
        const act = s.scene.acts[actIdx];
        const tick = done ? ACT_TOTAL - 1 : s.tick;
        const now = Math.min(Math.floor(tick / TIME_TICKS), HYPER);

        const X = (t) => 76 + (t / HYPER) * 540;
        const laneY = (i) => 66 + i * 52;

        ctx.fillStyle = dim;
        ctx.font = '11px ui-monospace, monospace';
        ctx.fillText(act.note, 14, 20);

        // Lanes with release ticks.
        TASKS.forEach((task, i) => {
          const y = laneY(i);
          ctx.fillStyle = dim;
          ctx.font = '10px ui-monospace, monospace';
          ctx.fillText(task.name, 8, y + 12);
          ctx.strokeStyle = '#2a3450';
          ctx.strokeRect(X(0), y, 540, 18);
          for (let t = 0; t <= HYPER; t += task.T) {
            ctx.strokeStyle = '#40507a';
            ctx.beginPath();
            ctx.moveTo(X(t), y - 4);
            ctx.lineTo(X(t), y + 22);
            ctx.stroke();
          }
        });

        // Execution blocks up to now.
        for (let t = 0; t < now; t++) {
          const r = act.runAt[t];
          if (r < 0) continue;
          ctx.fillStyle = palette[TASKS[r].color];
          ctx.fillRect(X(t), laneY(r) + 1, 540 / HYPER + 0.4, 16);
        }

        // Misses that have happened by now.
        let missCount = 0;
        act.misses.forEach((m) => {
          if (m.t <= now) {
            missCount += 1;
            const y = laneY(m.task);
            ctx.strokeStyle = warn;
            ctx.lineWidth = 1.8;
            ctx.beginPath();
            ctx.moveTo(X(m.t) - 5, y - 2);
            ctx.lineTo(X(m.t) + 5, y + 8);
            ctx.moveTo(X(m.t) + 5, y - 2);
            ctx.lineTo(X(m.t) - 5, y + 8);
            ctx.stroke();
          }
        });

        // Playhead.
        if (now < HYPER) {
          ctx.strokeStyle = dim;
          ctx.beginPath();
          ctx.moveTo(X(now), 52);
          ctx.lineTo(X(now), 226);
          ctx.stroke();
        }

        ctx.fillStyle = dim;
        ctx.font = '10px ui-monospace, monospace';
        ctx.fillText('ticks mark releases (and deadlines): U = 0.75 in both acts', 76, 244);

        let line;
        if (now < HYPER) {
          line = `t = ${now}ms · misses so far: ${missCount}`;
          ctx.fillStyle = missCount ? warn : dim;
        } else if (act.bad) {
          line = `${act.misses.length} deadline misses at U = 0.75: the sensor starved under the crown`;
          ctx.fillStyle = warn;
        } else {
          line = 'zero misses: responses [1, 8, 54], matching the RTA fixpoints exactly';
          ctx.fillStyle = good;
        }
        ctx.font = '12px ui-monospace, monospace';
        ctx.fillText(line, 14, H - 12);

        statsRef.current = {
          line: done ? 'same tasks, same demand: only the priority table changed' : line,
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
          {snap.line || 'the hyperperiod begins…'}
        </span>
      </div>
    </>
  );
}
