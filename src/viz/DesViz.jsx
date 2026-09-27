import { useEffect, useRef, useState } from 'react';
import { useCanvasLoop, isStill, holdTicks, mulberry32 } from './useCanvasLoop.js';

// A single-server queue driven two ways from the same arrivals and
// service times. Top: the event calendar, where each tick pops the
// earliest pending event (amber marker on the timeline) and the clock
// jumps to it. Bottom: fixed-increment time advance, where each tick
// moves the clock one slot and checks for events inside it. The
// counters compare steps taken and the running mean number in the
// system against the exact M/M/1 value.
const W = 640;
const H = 300;
const SEED = 20260926;
const LAM = 0.8;
const MU = 1.0;
const DT = 0.5;
const HORIZON = 60;

function expo(rand, rate) {
  return -Math.log(1 - rand()) / rate;
}

export function makeScene(seed) {
  const rand = mulberry32(seed);
  // pre-draw the arrivals and service times so both clocks see the same customers
  const arrivals = [];
  let t = 0;
  while (t < HORIZON + 10) {
    t += expo(rand, LAM);
    arrivals.push(t);
  }
  const services = arrivals.map(() => expo(rand, MU));
  const ev = { clock: 0, next: 0, queue: [], busyUntil: null, serving: null, inSystem: 0, area: 0, steps: 0, done: false, lastEvent: null, calendar: [{ t: arrivals[0], kind: 'arrival', idx: 0 }], history: [] };
  const fx = { clock: 0, next: 0, queue: [], busyUntil: null, serving: null, inSystem: 0, area: 0, steps: 0, done: false, history: [] };
  return { arrivals, services, ev, fx, done: false, exactL: (LAM / MU) / (1 - LAM / MU) };
}

function stepEvent(sc) {
  const R = sc.ev;
  if (R.done) return;
  if (R.calendar.length === 0 || R.clock >= HORIZON) {
    R.done = true;
    return;
  }
  R.calendar.sort((a, b) => a.t - b.t);
  const e = R.calendar.shift();
  if (e.t > HORIZON) {
    R.area += R.inSystem * (HORIZON - R.clock);
    R.clock = HORIZON;
    R.done = true;
    return;
  }
  R.area += R.inSystem * (e.t - R.clock);
  R.clock = e.t;
  R.steps += 1;
  R.lastEvent = e;
  if (e.kind === 'arrival') {
    R.inSystem += 1;
    if (e.idx + 1 < sc.arrivals.length) R.calendar.push({ t: sc.arrivals[e.idx + 1], kind: 'arrival', idx: e.idx + 1 });
    if (R.serving === null) {
      R.serving = e.idx;
      R.calendar.push({ t: R.clock + sc.services[e.idx], kind: 'departure', idx: e.idx });
    } else R.queue.push(e.idx);
  } else {
    R.inSystem -= 1;
    if (R.queue.length > 0) {
      R.serving = R.queue.shift();
      R.calendar.push({ t: R.clock + sc.services[R.serving], kind: 'departure', idx: R.serving });
    } else R.serving = null;
  }
  R.history.push([R.clock, R.inSystem]);
}

function stepFixed(sc) {
  const R = sc.fx;
  if (R.done) return;
  const end = R.clock + DT;
  R.area += R.inSystem * DT;
  R.steps += 1;
  if (R.busyUntil !== null && R.busyUntil <= end) {
    R.inSystem -= 1;
    if (R.queue.length > 0) {
      R.serving = R.queue.shift();
      R.busyUntil = end + sc.services[R.serving];
    } else {
      R.serving = null;
      R.busyUntil = null;
    }
  }
  while (R.next < sc.arrivals.length && sc.arrivals[R.next] <= end) {
    R.inSystem += 1;
    if (R.serving === null) {
      R.serving = R.next;
      R.busyUntil = end + sc.services[R.next];
    } else R.queue.push(R.next);
    R.next += 1;
  }
  R.clock = end;
  R.history.push([R.clock, R.inSystem]);
  if (R.clock >= HORIZON) R.done = true;
}

export function sceneTick(sc) {
  stepEvent(sc);
  stepFixed(sc);
  sc.done = sc.ev.done && sc.fx.done;
  return sc.done;
}

export default function DesViz() {
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
      stepMs: 120,
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
        const dim = css.getPropertyValue('--ink-dim').trim() || '#9aa5bd';
        const ink = css.getPropertyValue('--ink').trim() || '#e9edf6';
        const sc = s.scene;
        ctx.font = '11px ui-monospace, monospace';
        ctx.fillStyle = dim;
        ctx.fillText(`one queue, arrivals at rate ${LAM}, service at rate ${MU}, ${HORIZON} time units; the same customers through two clocks`, 12, 18);
        const panels = [
          { y0: 34, R: sc.ev, name: 'event calendar: the clock jumps to the next event', color: algo },
          { y0: 158, R: sc.fx, name: `fixed step ${DT}: the clock moves one slot per tick`, color: dim },
        ];
        const x0 = 12;
        const xw = 420;
        for (const p of panels) {
          const R = p.R;
          ctx.fillStyle = p.color;
          ctx.fillText(p.name, x0, p.y0);
          const base = p.y0 + 92;
          ctx.strokeStyle = `${dim}55`;
          ctx.beginPath();
          ctx.moveTo(x0, base);
          ctx.lineTo(x0 + xw, base);
          ctx.stroke();
          // step function of the number in system
          ctx.strokeStyle = p.color;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          let px = x0;
          let py = base;
          ctx.moveTo(px, py);
          for (const [t, n] of R.history) {
            const nx = x0 + (Math.min(t, HORIZON) / HORIZON) * xw;
            ctx.lineTo(nx, py);
            py = base - Math.min(n, 12) * 6;
            ctx.lineTo(nx, py);
            px = nx;
          }
          ctx.stroke();
          ctx.lineWidth = 1;
          // clock marker
          const cx = x0 + (Math.min(R.clock, HORIZON) / HORIZON) * xw;
          ctx.strokeStyle = heur;
          ctx.beginPath();
          ctx.moveTo(cx, p.y0 + 10);
          ctx.lineTo(cx, base + 4);
          ctx.stroke();
          if (p.R === sc.ev && R.lastEvent) {
            ctx.fillStyle = heur;
            ctx.fillText(`${R.lastEvent.kind} at t = ${R.clock.toFixed(2)}`, Math.min(cx + 6, x0 + xw - 120), p.y0 + 22);
          }
          const meanL = R.clock > 0 ? R.area / R.clock : 0;
          ctx.fillStyle = ink;
          ctx.fillText(`steps: ${R.steps}`, 446, p.y0 + 24);
          ctx.fillStyle = dim;
          ctx.fillText(`clock: ${R.clock.toFixed(2)}`, 446, p.y0 + 42);
          ctx.fillText(`in system now: ${R.inSystem}`, 446, p.y0 + 60);
          ctx.fillText(`mean so far: ${meanL.toFixed(2)} (exact ${sc.exactL.toFixed(1)})`, 446, p.y0 + 78);
        }
        let line;
        if (s.done) {
          line = `event calendar: ${sc.ev.steps} steps for ${HORIZON} time units; fixed step: ${sc.fx.steps}; both saw the same customers, one skipped the empty time`;
          ctx.fillStyle = good;
        } else {
          line = 'every unit of simulated time costs exactly as many steps as it has events; the slot clock pays for empty time too';
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
          new customers
        </button>
        <span className="viz-stat">{snap.line || 'simulating…'}</span>
      </div>
    </>
  );
}
