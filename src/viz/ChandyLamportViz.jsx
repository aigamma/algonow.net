import { useEffect, useRef, useState } from 'react';
import { useCanvasLoop, isStill, holdTicks, mulberry32 } from './useCanvasLoop.js';

// Two acts of one photograph. Act one: four banks trade money over
// FIFO channels; one bank clicks the shutter: records itself and
// sends markers down every channel: and each marker sweeps its
// channel clean, catching in-flight transfers in the recorded
// window. The tally: recorded balances plus channel catches:
// equals the invariant total, exactly, while the money never
// stopped moving. Act two: the naive photographer reads each bank
// at a different moment with no channel accounting: the total
// comes out wrong, and the missing money is pointed at, mid-air.
const W = 640;
const H = 300;
const SEED = 20260827;
const N = 4;
const TOTAL = 1000;
const END_HOLD = 70;
const EV_TICKS = 6;

export function runSim(seed, withSnapshot) {
  const rand = mulberry32(seed);
  const bal = [250, 250, 250, 250];
  const chan = new Map();
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) if (i !== j) chan.set(i + ',' + j, []);
  const started = Array(N).fill(false);
  const recorded = Array(N).fill(null);
  const chanOpen = new Map();
  const chanRec = new Map();
  for (const k of chan.keys()) {
    chanOpen.set(k, false);
    chanRec.set(k, []);
  }
  const events = [];
  const snapAt = 14;
  const naiveAt = [10, 18, 26, 34];
  const naiveRead = Array(N).fill(null);
  let ev = 0;
  const startSnap = (p) => {
    if (started[p]) return;
    started[p] = true;
    recorded[p] = bal[p];
    events.push({ t: ev, kind: 'record', p, val: bal[p] });
    for (let q = 0; q < N; q++)
      if (q !== p) {
        chan.get(p + ',' + q).push({ kind: 'M' });
        chanOpen.set(q + ',' + p, true);
      }
    events.push({ t: ev, kind: 'markers', p });
  };
  const STEPS = 60;
  while (ev < STEPS || [...chan.values()].some((c) => c.length)) {
    ev += 1;
    if (ev > 400) break;
    if (withSnapshot && ev === snapAt) startSnap(Math.floor(rand() * N));
    for (let p = 0; p < N; p++)
      if (naiveRead[p] === null && ev === naiveAt[p]) {
        naiveRead[p] = bal[p];
        events.push({ t: ev, kind: 'naive', p, val: bal[p] });
      }
    const deliverable = [...chan.entries()].filter(([, c]) => c.length);
    const doSend = ev <= STEPS && (deliverable.length === 0 || rand() < 0.5);
    if (doSend) {
      const p = Math.floor(rand() * N);
      let q = Math.floor(rand() * N);
      if (p === q) q = (q + 1) % N;
      if (bal[p] < 8) continue;
      const amt = 5 + Math.floor(rand() * Math.min(60, bal[p] / 3));
      bal[p] -= amt;
      chan.get(p + ',' + q).push({ kind: 'T', amt });
      events.push({ t: ev, kind: 'send', p, q, amt });
    } else {
      if (!deliverable.length) continue;
      const [key, c] = deliverable[Math.floor(rand() * deliverable.length)];
      const msg = c.shift();
      const [src, dst] = key.split(',').map(Number);
      if (msg.kind === 'M') {
        startSnap(dst);
        chanOpen.set(key, false);
        events.push({ t: ev, kind: 'marker-arrive', p: src, q: dst });
      } else {
        bal[dst] += msg.amt;
        if (chanOpen.get(key)) {
          chanRec.get(key).push(msg.amt);
          events.push({ t: ev, kind: 'catch', p: src, q: dst, amt: msg.amt });
        } else {
          events.push({ t: ev, kind: 'recv', p: src, q: dst, amt: msg.amt });
        }
      }
    }
  }
  const chanSum = [...chanRec.values()].reduce((a, v) => a + v.reduce((x, y) => x + y, 0), 0);
  const snapTotal = withSnapshot ? recorded.reduce((a, b) => a + b, 0) + chanSum : null;
  for (let p = 0; p < N; p++) if (naiveRead[p] === null) naiveRead[p] = bal[p];
  const naiveTotal = naiveRead.reduce((a, b) => a + b, 0);
  return { events, snapTotal, chanSum, recorded, naiveTotal, naiveRead, finalBal: bal };
}

export function makeScene(seed) {
  // Reroll so both stories are visible: the snapshot catches at
  // least one in-flight transfer, and the naive total is wrong.
  for (let k = 0; k < 30; k++) {
    const s1 = runSim(seed + k * 131, true);
    const s2 = runSim(seed + k * 131, false);
    if (s1.snapTotal === TOTAL && s1.chanSum > 0 && s2.naiveTotal !== TOTAL) {
      return { snap: s1, naive: s2 };
    }
  }
  return { snap: runSim(seed, true), naive: runSim(seed, false) };
}

const POS = [
  [160, 80],
  [480, 80],
  [480, 220],
  [160, 220],
];

export default function ChandyLamportViz() {
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
        const run = s.act === 0 ? s.scene.snap : s.scene.naive;
        const len = (run.events[run.events.length - 1]?.t ?? 10) * EV_TICKS + END_HOLD;
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
        const run = actIdx === 0 ? sc.snap : sc.naive;
        const maxT = run.events[run.events.length - 1]?.t ?? 10;
        const now = done ? maxT : Math.min(s.tick / EV_TICKS, maxT);
        const finished = done || now >= maxT;

        ctx.fillStyle = dim;
        ctx.font = '11px ui-monospace, monospace';
        ctx.fillText(
          actIdx === 0
            ? 'act 1 · the shutter clicks mid-flight: markers sweep every channel clean'
            : 'act 2 · the naive photographer: four reads at four different moments, no channel accounting',
          14,
          20,
        );

        // Replay balances and annotations up to `now`.
        const bal = [250, 250, 250, 250];
        const recorded = Array(N).fill(null);
        const naiveRead = Array(N).fill(null);
        const catches = [];
        let markersOut = false;
        for (const e of run.events) {
          if (e.t > now) break;
          if (e.kind === 'send') bal[e.p] -= e.amt;
          if (e.kind === 'recv' || e.kind === 'catch') bal[e.q] += e.amt;
          if (e.kind === 'record') recorded[e.p] = e.val;
          if (e.kind === 'markers') markersOut = true;
          if (e.kind === 'naive') naiveRead[e.p] = e.val;
          if (e.kind === 'catch') catches.push(e.amt);
        }

        // Banks.
        for (let p = 0; p < N; p++) {
          const [x, y] = POS[p];
          const rec = actIdx === 0 ? recorded[p] : naiveRead[p];
          ctx.strokeStyle = rec !== null ? (actIdx === 0 ? algo : warn) : dim;
          ctx.lineWidth = rec !== null ? 2.4 : 1.2;
          ctx.strokeRect(x - 52, y - 26, 104, 52);
          ctx.fillStyle = ink;
          ctx.font = '12px ui-monospace, monospace';
          ctx.fillText(`bank ${p + 1}`, x - 44, y - 8);
          ctx.fillText(`${bal[p]}`, x - 44, y + 12);
          if (rec !== null) {
            ctx.fillStyle = actIdx === 0 ? algo : warn;
            ctx.font = '10px ui-monospace, monospace';
            ctx.fillText(`photo: ${rec}`, x - 44, y + 38);
          }
        }

        // In-flight message dots on the most recent sends.
        const recent = run.events.filter((e) => e.t <= now && now - e.t < 2 && (e.kind === 'send'));
        for (const e of recent) {
          const [x1, y1] = POS[e.p];
          const [x2, y2] = POS[e.q];
          const u = (now - e.t) / 2;
          ctx.fillStyle = heur;
          ctx.beginPath();
          ctx.arc(x1 + (x2 - x1) * u, y1 + (y2 - y1) * u, 5, 0, Math.PI * 2);
          ctx.fill();
        }
        if (actIdx === 0 && markersOut && !finished) {
          ctx.fillStyle = algo;
          ctx.font = '10px ui-monospace, monospace';
          ctx.fillText('markers sweeping…', 285, 150);
        }

        let line;
        if (finished) {
          if (actIdx === 0) {
            line = `photos ${run.recorded.join('+')} + channel catches ${run.chanSum} = ${run.snapTotal}: the invariant, exactly, mid-flight`;
            ctx.fillStyle = good;
          } else {
            const miss = TOTAL - run.naiveTotal;
            line = `naive total ${run.naiveTotal} (${miss > 0 ? miss + ' missing in-flight' : -miss + ' double-counted'}): four true readings, one false world`;
            ctx.fillStyle = warn;
          }
        } else {
          const caught = catches.reduce((a, b) => a + b, 0);
          line =
            actIdx === 0
              ? `t=${Math.floor(now)} · transfers flying · channel catches so far: ${caught}`
              : `t=${Math.floor(now)} · reading banks one at a time while the money moves…`;
          ctx.fillStyle = ink;
        }
        ctx.font = '12px ui-monospace, monospace';
        ctx.fillText(line, 14, H - 12);
        statsRef.current = {
          line: done
            ? 'a consistent cut is a place in causality, not a moment on a clock'
            : line,
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
          new ledger
        </button>
        <span className="viz-stat">
          {snap.line || 'opening the vaults…'}
        </span>
      </div>
    </>
  );
}
