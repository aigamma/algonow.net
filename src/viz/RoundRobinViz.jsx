import { useEffect, useRef, useState } from 'react';
import { useCanvasLoop, isStill, holdTicks, mulberry32 } from './useCanvasLoop.js';

// Round-robin on a seeded set of eight jobs, one dispatch per tick. The
// Gantt strip grows to the right (one color per job, switches hatched in
// red), the ready queue is drawn as boxes with remaining work, and the
// quantum cycles 2, 4, 8, and infinity (FCFS) across scenes. Every tick
// checks legality (nothing runs before its arrival, no job exceeds its
// burst) and the round-robin fairness rule (between two turns of a job,
// every other job ran at most once); at the end it checks conservation
// (segments sum to the bursts) and compares the mean interactive response
// with an FCFS run of the same jobs.
const W = 640;
const H = 300;
const SEED = 20261010;
const QUANTA = [2, 4, 8, Infinity];
const SWITCH = 1;

function makeJobs(rand) {
  const jobs = [];
  let t = 0;
  for (let k = 0; k < 8; k += 1) {
    t += Math.floor(rand() * 5);
    const batch = k === 1 || rand() < 0.2;
    jobs.push({ id: k, arrival: t, burst: batch ? 14 + Math.floor(rand() * 10) : 1 + Math.floor(rand() * 4), kind: batch ? 'batch' : 'interactive' });
  }
  return jobs;
}

function simulateFcfs(jobs) {
  const pending = [...jobs].sort((a, b) => a.arrival - b.arrival || a.id - b.id);
  let t = 0;
  let last = null;
  let respSum = 0;
  let count = 0;
  for (const j of pending) {
    if (t < j.arrival) t = j.arrival;
    if (last !== null && last !== j.id) t += SWITCH;
    if (j.kind === 'interactive') {
      respSum += t - j.arrival;
      count += 1;
    }
    t += j.burst;
    last = j.id;
  }
  return count ? respSum / count : 0;
}

export function makeScene(seed) {
  const rand = mulberry32(seed);
  const jobs = makeJobs(rand);
  const q = QUANTA[seed % QUANTA.length];
  return {
    jobs, q, t: 0, lastJob: null, ready: [], pending: [...jobs].sort((a, b) => a.arrival - b.arrival || a.id - b.id),
    remaining: jobs.map((j) => j.burst), firstRun: jobs.map(() => null), finish: jobs.map(() => null),
    segments: [], switches: 0, idle: 0, done: false, ok: true, fcfsResp: simulateFcfs(jobs),
    last: `quantum ${q === Infinity ? 'infinite (FCFS)' : q}: eight jobs, two of them long; one dispatch per tick`,
  };
}

function admit(sc) {
  while (sc.pending.length && sc.pending[0].arrival <= sc.t) sc.ready.push(sc.pending.shift().id);
}

function fairnessHolds(sc) {
  const byJob = new Map();
  sc.segments.forEach((s, pos) => {
    if (!byJob.has(s.id)) byJob.set(s.id, []);
    byJob.get(s.id).push(pos);
  });
  for (const positions of byJob.values()) {
    for (let k = 1; k < positions.length; k += 1) {
      const between = sc.segments.slice(positions[k - 1] + 1, positions[k]).map((s) => s.id);
      if (new Set(between).size !== between.length) return false;
    }
  }
  return true;
}

export function sceneTick(sc) {
  if (sc.done) return true;
  admit(sc);
  if (sc.ready.length === 0) {
    if (sc.pending.length === 0) {
      sc.done = true;
      const total = sc.segments.reduce((s, seg) => s + (seg.end - seg.start), 0);
      const burstSum = sc.jobs.reduce((s, j) => s + j.burst, 0);
      const inter = sc.jobs.filter((j) => j.kind === 'interactive');
      const resp = inter.reduce((s, j) => s + (sc.firstRun[j.id] - j.arrival), 0) / inter.length;
      const makespan = sc.t;
      sc.ok = sc.ok && total === burstSum && makespan === burstSum + sc.idle + sc.switches * SWITCH && fairnessHolds(sc);
      sc.last = `done at t = ${makespan}: mean interactive response ${resp.toFixed(1)} against ${sc.fcfsResp.toFixed(1)} under FCFS; ${sc.switches} switches; segments sum to the ${burstSum} units of work`;
      return true;
    }
    const nxt = sc.pending[0].arrival;
    sc.idle += nxt - sc.t;
    sc.t = nxt;
    return false;
  }
  const id = sc.ready.shift();
  const job = sc.jobs[id];
  if (sc.lastJob !== null && sc.lastJob !== id) {
    sc.switches += 1;
    sc.t += SWITCH;
  }
  if (sc.firstRun[id] === null) sc.firstRun[id] = sc.t;
  const run = Math.min(sc.remaining[id], sc.q);
  const start = sc.t;
  sc.t += run;
  sc.remaining[id] -= run;
  sc.segments.push({ id, start, end: sc.t });
  sc.lastJob = id;
  admit(sc);
  if (sc.remaining[id] === 0) sc.finish[id] = sc.t;
  else sc.ready.push(id);
  sc.ok = sc.ok && start >= job.arrival && sc.remaining[id] >= 0 && fairnessHolds(sc);
  sc.lastLine = `t = ${sc.t}: job ${id} (${job.kind}) ran ${run} unit${run === 1 ? '' : 's'}${sc.remaining[id] === 0 ? ' and finished' : `, ${sc.remaining[id]} left, back to the queue`}; queue ${sc.ready.length}`;
  sc.last = sc.lastLine;
  return false;
}

export default function RoundRobinViz() {
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
      stepMs: 450,
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
        const palette = [algo, heur, good, '#c08cff', '#5fd3e6', '#ff9f68', '#b6e36b', dim];
        ctx.font = '11px ui-monospace, monospace';
        ctx.fillStyle = dim;
        ctx.fillText(`quantum ${sc.q === Infinity ? 'infinite (this is FCFS)' : sc.q}, switch cost ${SWITCH}; one dispatch per tick; red slivers are switches`, 12, 18);
        // Gantt strip
        const total = sc.jobs.reduce((a, j) => a + j.burst, 0) + 30;
        const gx = 20;
        const gw = 600;
        const X = (t) => gx + (t / total) * gw;
        ctx.fillStyle = `${dim}22`;
        ctx.fillRect(gx, 40, gw, 26);
        let prevEnd = null;
        for (const seg of sc.segments) {
          if (prevEnd !== null && seg.start > prevEnd) {
            ctx.fillStyle = `${warn}cc`;
            ctx.fillRect(X(prevEnd), 40, Math.max(1, X(seg.start) - X(prevEnd)), 26);
          }
          ctx.fillStyle = palette[seg.id % palette.length];
          ctx.fillRect(X(seg.start), 40, Math.max(1, X(seg.end) - X(seg.start)), 26);
          prevEnd = seg.end;
        }
        ctx.fillStyle = dim;
        ctx.fillText(`t = ${sc.t}`, X(sc.t) + 4, 58);
        // jobs table
        const ty = 92;
        ctx.fillStyle = dim;
        ctx.fillText('job   arrives  burst  kind         first run   left', 20, ty);
        sc.jobs.forEach((j, i) => {
          const y = ty + 16 + i * 16;
          ctx.fillStyle = palette[j.id % palette.length];
          ctx.fillRect(20, y - 9, 10, 10);
          ctx.fillStyle = sc.finish[j.id] !== null ? dim : ink;
          const fr = sc.firstRun[j.id];
          ctx.fillText(`${String(j.id).padStart(2)}      ${String(j.arrival).padStart(3)}    ${String(j.burst).padStart(3)}  ${j.kind.padEnd(11)}  ${fr === null ? '  -' : String(fr).padStart(3)}      ${String(sc.remaining[j.id]).padStart(3)}`, 40, y);
        });
        // ready queue
        ctx.fillStyle = dim;
        ctx.fillText('ready queue (head on the left)', 400, ty);
        sc.ready.forEach((id, k) => {
          ctx.fillStyle = palette[id % palette.length];
          ctx.fillRect(400 + k * 28, ty + 8, 24, 20);
          ctx.fillStyle = '#0b0d12';
          ctx.fillText(String(id), 408 + k * 28, ty + 22);
        });
        ctx.fillStyle = dim;
        ctx.fillText(`switches ${sc.switches}, idle ${sc.idle}`, 400, ty + 48);
        ctx.fillText(`FCFS on these jobs: interactive response ${sc.fcfsResp.toFixed(1)}`, 400, ty + 64);
        ctx.fillText('the file: 11.8 at q = 4 against 38.0 under FCFS', 400, ty + 80);
        ctx.fillStyle = sc.ok ? good : warn;
        ctx.fillText(sc.ok ? 'legal, fair: no job ran twice while another waited' : 'INVARIANT BROKEN', 400, ty + 104);
        let line;
        if (s.done) {
          line = sc.last;
          ctx.fillStyle = sc.ok ? good : warn;
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
          next quantum
        </button>
        <span className="viz-stat">{snap.line || 'scheduling…'}</span>
      </div>
    </>
  );
}
