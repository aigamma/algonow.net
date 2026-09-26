import { useEffect, useRef, useState } from 'react';
import { useCanvasLoop, isStill, holdTicks, mulberry32 } from './useCanvasLoop.js';

// Five processes, three resource types, the same stream of one-unit
// requests played through two granters. Left: the banker, which grants
// only when the resulting state passes the greedy safe-state check
// (the amber rows are the finishing order the check found; a refused
// request flashes the row red and the process waits). Right: grant
// whatever is free, which walks into deadlock whenever a circular wait
// forms. Each process declares a maximum but actually needs a random
// part of it; only the banker's caution costs waits.
const W = 640;
const H = 300;
const SEED = 20260926;
const NP = 5;
const NR = 3;

function gaussianInt(rand, lo, hi) {
  return lo + Math.floor(rand() * (hi - lo + 1));
}

function isSafe(available, allocation, need) {
  const work = [...available];
  const finished = new Array(NP).fill(false);
  const order = [];
  let progress = true;
  while (progress) {
    progress = false;
    for (let i = 0; i < NP; i++) {
      if (finished[i]) continue;
      if (need[i].every((v, j) => v <= work[j])) {
        for (let j = 0; j < NR; j++) work[j] += allocation[i][j];
        finished[i] = true;
        order.push(i);
        progress = true;
      }
    }
  }
  return { safe: finished.every(Boolean), order };
}

function makeWorld(rand) {
  const total = Array.from({ length: NR }, () => gaussianInt(rand, 6, 12));
  const maxes = Array.from({ length: NP }, () => total.map((t) => gaussianInt(rand, 1, t)));
  const actual = maxes.map((row) => row.map((m) => gaussianInt(rand, 0, m)));
  return { total, maxes, actual };
}

function makeRun(world, kind) {
  return {
    kind,
    allocation: Array.from({ length: NP }, () => new Array(NR).fill(0)),
    need: world.maxes.map((r) => [...r]),
    available: [...world.total],
    done: new Array(NP).fill(false),
    deferrals: 0,
    grants: 0,
    lastOrder: [],
    flash: null,
    status: 'running',
  };
}

export function makeScene(seed) {
  const rand = mulberry32(seed);
  const world = makeWorld(rand);
  // two independent generators with the same seed give both granters the same stream
  return { world, banker: makeRun(world, 'banker'), naive: makeRun(world, 'naive'), randB: mulberry32(seed + 17), randN: mulberry32(seed + 17), done: false };
}

function stepRun(sc, R, rand) {
  if (R.status !== 'running') return;
  const { world } = sc;
  const candidates = [];
  for (let i = 0; i < NP; i++) if (!R.done[i]) candidates.push(i);
  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }
  R.flash = null;
  for (const i of candidates) {
    const wants = [];
    for (let j = 0; j < NR; j++) if (R.allocation[i][j] < world.actual[i][j]) wants.push(j);
    if (wants.length === 0) {
      for (let j = 0; j < NR; j++) {
        R.available[j] += R.allocation[i][j];
        R.allocation[i][j] = 0;
      }
      R.done[i] = true;
      R.flash = { i, kind: 'finish' };
      if (R.done.every(Boolean)) R.status = 'finished';
      return;
    }
    const j = wants[Math.floor(rand() * wants.length)];
    if (R.available[j] < 1) continue;
    if (R.kind === 'banker') {
      R.available[j] -= 1;
      R.allocation[i][j] += 1;
      R.need[i][j] -= 1;
      const { safe, order } = isSafe(R.available, R.allocation, R.need);
      if (!safe) {
        R.available[j] += 1;
        R.allocation[i][j] -= 1;
        R.need[i][j] += 1;
        R.deferrals += 1;
        R.flash = { i, kind: 'unsafe' };
        continue;
      }
      R.lastOrder = order;
    } else {
      R.available[j] -= 1;
      R.allocation[i][j] += 1;
      R.need[i][j] -= 1;
    }
    R.grants += 1;
    R.flash = { i, kind: 'grant', j };
    return;
  }
  R.status = 'deadlock';
}

export function sceneTick(sc) {
  stepRun(sc, sc.banker, sc.randB);
  stepRun(sc, sc.naive, sc.randN);
  sc.done = sc.banker.status !== 'running' && sc.naive.status !== 'running';
  return sc.done;
}

export default function BankersViz() {
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
      stepMs: 200,
      init: () => ({ scene: makeScene(SEED + cycle.current * 7919), done: false, rest: 0, stopAtRest: isStill() }),
      tick: (s) => {
        if (s.done) {
          if (s.stopAtRest) return false;
          s.rest += 1;
          if (s.rest > holdTicks(s)) {
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
        const { world } = sc;
        ctx.font = '11px ui-monospace, monospace';
        ctx.fillStyle = dim;
        ctx.fillText(`${NP} processes, ${NR} resource types (${world.total.join(', ')} units); one request per tick; declared maxima, actual needs below them`, 12, 18);
        const panels = [
          { x0: 12, R: sc.banker, name: 'banker: grant only if the state stays safe', color: algo },
          { x0: 330, R: sc.naive, name: 'grant whatever is free', color: dim },
        ];
        const rowH = 28;
        const y0 = 34;
        for (const p of panels) {
          const R = p.R;
          ctx.fillStyle = p.color;
          ctx.fillText(p.name, p.x0, y0);
          for (let i = 0; i < NP; i++) {
            const y = y0 + 10 + i * rowH;
            const inOrder = R.kind === 'banker' ? R.lastOrder.indexOf(i) : -1;
            if (R.flash && R.flash.i === i) {
              ctx.fillStyle = R.flash.kind === 'unsafe' ? `${warn}44` : R.flash.kind === 'finish' ? `${good}44` : `${heur}33`;
              ctx.fillRect(p.x0 - 2, y - 2, 300, rowH - 4);
            }
            ctx.fillStyle = R.done[i] ? good : ink;
            ctx.fillText(`P${i}${R.done[i] ? ' done' : ''}`, p.x0, y + 12);
            for (let j = 0; j < NR; j++) {
              const bx = p.x0 + 56 + j * 82;
              const unit = 6;
              const maxW = world.maxes[i][j] * unit;
              ctx.strokeStyle = `${dim}66`;
              ctx.strokeRect(bx, y + 2, Math.max(2, maxW), 10);
              ctx.fillStyle = `${dim}55`;
              ctx.fillRect(bx, y + 2, world.actual[i][j] * unit, 10);
              ctx.fillStyle = p.color;
              ctx.fillRect(bx, y + 2, R.allocation[i][j] * unit, 10);
            }
            if (inOrder >= 0 && !R.done[i]) {
              ctx.fillStyle = heur;
              ctx.fillText(`${inOrder + 1}`, p.x0 + 300, y + 12);
            }
          }
          const yb = y0 + 10 + NP * rowH + 6;
          ctx.fillStyle = dim;
          ctx.fillText(`free: ${R.available.join(' / ')} of ${world.total.join(' / ')}`, p.x0, yb);
          ctx.fillStyle = R.status === 'deadlock' ? warn : R.status === 'finished' ? good : ink;
          ctx.fillText(R.status === 'deadlock' ? `DEADLOCK after ${R.grants} grants: nobody can move` : R.status === 'finished' ? `all ${NP} finished after ${R.grants} grants` : `${R.grants} grants${R.kind === 'banker' ? `, ${R.deferrals} refused as unsafe` : ''}`, p.x0, yb + 18);
        }
        ctx.fillStyle = heur;
        ctx.fillText('bars: allocation (color) inside actual need (gray) inside declared max (outline); amber digits: the finishing order the check found', 12, 250);
        let line;
        if (s.done) {
          const b = sc.banker;
          const nv = sc.naive;
          line = nv.status === 'deadlock'
            ? `banker finished all ${NP} with ${b.deferrals} refusals; the naive granter deadlocked after ${nv.grants} grants on the same stream`
            : `both finished this time: the banker paid ${b.deferrals} refusals for a guarantee the naive granter got by luck`;
          ctx.fillStyle = good;
        } else {
          line = 'safe means some finishing order exists if everyone claims their declared maximum; the check finds it greedily';
          ctx.fillStyle = ink;
        }
        ctx.fillText(line, 12, H - 8);
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
          new workload
        </button>
        <span className="viz-stat">{snap.line || 'granting…'}</span>
      </div>
    </>
  );
}
