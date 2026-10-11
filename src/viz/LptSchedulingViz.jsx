import { useEffect, useRef, useState } from 'react';
import { useCanvasLoop, isStill, holdTicks, mulberry32 } from './useCanvasLoop.js';

// Graham's LPT rule on a seeded instance, one job per tick: jobs sorted
// longest first, each placed on the least loaded of three machines, drawn as
// Gantt bars. The invariant checked every tick is that the placed job went to
// a machine whose load was the minimum and that every job is placed at most
// once; at the end the makespan is at least both lower bounds and at most
// (4/3 - 1/(3m)) times the exact optimum found by brute force.
const W = 640;
const H = 300;
const SEED = 20261010;
const M = 3;

function exactOpt(jobs, m) {
  let best = Infinity;
  const n = jobs.length;
  const total = m ** n;
  for (let code = 0; code < total; code += 1) {
    const loads = new Array(m).fill(0);
    let c = code;
    for (let i = 0; i < n; i += 1) {
      loads[c % m] += jobs[i];
      c = Math.floor(c / m);
    }
    const mk = Math.max(...loads);
    if (mk < best) best = mk;
  }
  return best;
}

function listMakespan(jobs, m) {
  const loads = new Array(m).fill(0);
  for (const p of jobs) {
    const k = loads.indexOf(Math.min(...loads));
    loads[k] += p;
  }
  return Math.max(...loads);
}

export function makeScene(seed) {
  const rand = mulberry32(seed);
  const n = 7 + Math.floor(rand() * 3); // 7 to 9 jobs
  const jobs = Array.from({ length: n }, () => 2 + Math.floor(rand() * 19));
  const order = jobs.map((p, i) => i).sort((a, b) => jobs[b] - jobs[a]);
  const total = jobs.reduce((a, b) => a + b, 0);
  const lb = Math.max(Math.max(...jobs), Math.ceil(total / M));
  return {
    jobs, order, i: 0, loads: new Array(M).fill(0), rows: Array.from({ length: M }, () => []), placed: new Set(),
    lb, opt: exactOpt(jobs, M), arrival: listMakespan(jobs, M), done: false, ok: true,
    last: `${n} jobs on ${M} machines, sorted longest first; lower bound ${lb}`,
  };
}

export function sceneTick(sc) {
  if (sc.done) return true;
  if (sc.i >= sc.jobs.length) {
    const mk = Math.max(...sc.loads);
    const bound = 4 / 3 - 1 / (3 * M);
    sc.ok = sc.ok && sc.placed.size === sc.jobs.length && mk >= sc.lb && mk >= sc.opt && mk <= bound * sc.opt + 1e-9;
    sc.done = true;
    sc.last = `done: LPT makespan ${mk}, optimum ${sc.opt} (ratio ${(mk / sc.opt).toFixed(3)}, bound ${bound.toFixed(3)}), arrival order ${sc.arrival}; invariants held: ${sc.ok ? 'yes' : 'NO'}`;
    return true;
  }
  const j = sc.order[sc.i];
  const minLoad = Math.min(...sc.loads);
  const k = sc.loads.indexOf(minLoad);
  if (sc.placed.has(j)) sc.ok = false;
  sc.placed.add(j);
  sc.rows[k].push(j);
  sc.loads[k] += sc.jobs[j];
  sc.ok = sc.ok && sc.loads[k] - sc.jobs[j] === minLoad;
  sc.i += 1;
  sc.last = `job ${sc.i} of ${sc.jobs.length}: length ${sc.jobs[j]} to machine ${k + 1} (load was ${minLoad}, the minimum); loads ${sc.loads.join(' ')}`;
  return false;
}

export default function LptSchedulingViz() {
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
        ctx.fillText('longest job first, each to the least loaded machine; amber = the job just placed, dashed = lower bound and optimum', 12, 18);
        const total = sc.jobs.reduce((a, b) => a + b, 0);
        const scale = 420 / Math.max(total / 2, 1);
        const x0 = 110;
        for (let k = 0; k < M; k += 1) {
          const y = 48 + k * 44;
          ctx.fillStyle = dim;
          ctx.fillText(`machine ${k + 1}`, 12, y + 20);
          let t = 0;
          sc.rows[k].forEach((j, idx) => {
            const w = sc.jobs[j] * scale;
            const isLast = idx === sc.rows[k].length - 1 && j === sc.order[sc.i - 1] && !s.done;
            ctx.fillStyle = isLast ? heur : algo;
            ctx.globalAlpha = 0.85;
            ctx.fillRect(x0 + t * scale + 1, y, Math.max(w - 2, 1), 30);
            ctx.globalAlpha = 1;
            ctx.fillStyle = '#0b1020';
            ctx.font = '10px ui-monospace, monospace';
            if (w > 16) ctx.fillText(String(sc.jobs[j]), x0 + t * scale + 4, y + 19);
            t += sc.jobs[j];
          });
          ctx.font = '11px ui-monospace, monospace';
          ctx.fillStyle = dim;
          ctx.fillText(String(sc.loads[k]), x0 + sc.loads[k] * scale + 6, y + 20);
        }
        const mark = (v, color, label, yText) => {
          ctx.strokeStyle = color;
          ctx.setLineDash([3, 3]);
          ctx.beginPath();
          ctx.moveTo(x0 + v * scale, 40);
          ctx.lineTo(x0 + v * scale, 180);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.fillStyle = color;
          ctx.fillText(label, x0 + v * scale + 4, yText);
        };
        mark(sc.lb, dim, `lower bound ${sc.lb}`, 190);
        mark(sc.opt, good, `optimum ${sc.opt}`, 204);
        const queue = sc.order.slice(sc.i).map((j) => sc.jobs[j]).join(' ');
        ctx.fillStyle = dim;
        ctx.fillText(`waiting (longest first): ${queue || 'none'}`, 12, 226);
        ctx.fillText(`the file: 1.0212 x OPT mean, 1.1739 worst, on 300 instances; arrival order 1.1221`, 12, 242);
        ctx.fillStyle = sc.ok ? good : warn;
        ctx.fillText(sc.ok ? 'invariant: every placement went to a least loaded machine; each job placed once' : 'INVARIANT BROKEN', 12, 258);
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
          new jobs
        </button>
        <span className="viz-stat">{snap.line || 'scheduling…'}</span>
      </div>
    </>
  );
}
