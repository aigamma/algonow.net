import { useEffect, useRef, useState } from 'react';
import { useCanvasLoop, isStill, holdTicks, mulberry32 } from './useCanvasLoop.js';

// One instance, two compasses. Eighteen requests on a timeline, stacked
// into display lanes. Act one: earliest-finish sweeps the clock: each
// pick flashes amber then settles green, and everything it blocks dims
// red. Act two: the same requests under shortest-first: picks arrive in
// duration order and the final count comes up short. The instance is
// seeded-searched so the shortfall is real on every cycle.
const W = 640;
const H = 300;
const SEED = 20260827;
const N = 18;
const TICKS_PER_PICK = 14;
const ACT_HOLD = 50;

function overlaps(a, b) {
  return a[0] < b[1] && b[0] < a[1];
}

function efPicks(ivs) {
  const order = [...ivs].sort((x, y) => x[1] - y[1]);
  const picks = [];
  let last = -Infinity;
  for (const iv of order) {
    if (iv[0] >= last) {
      picks.push(iv);
      last = iv[1];
    }
  }
  return picks;
}

function sfPicks(ivs) {
  const order = [...ivs].sort((x, y) => x[1] - x[0] - (y[1] - y[0]));
  const picks = [];
  for (const iv of order) {
    if (picks.every((c) => !overlaps(iv, c))) picks.push(iv);
  }
  return picks;
}

function makeScene(seed) {
  const rand = mulberry32(seed);
  let ivs = null;
  for (let tries = 0; tries < 200; tries++) {
    const cand = [];
    for (let i = 0; i < N; i++) {
      const s = Math.floor(rand() * 82);
      cand.push([s, s + 4 + Math.floor(rand() * 26)]);
    }
    if (sfPicks(cand).length < efPicks(cand).length) {
      ivs = cand;
      break;
    }
  }
  if (!ivs) {
    ivs = [[0, 10], [11, 21], [9, 12]];
  }
  // Display lanes: first-fit stacking.
  const lanes = [];
  const laneOf = new Map();
  const byStart = [...ivs].sort((a, b) => a[0] - b[0]);
  for (const iv of byStart) {
    let l = 0;
    while (l < lanes.length && lanes[l] > iv[0]) l += 1;
    if (l === lanes.length) lanes.push(0);
    lanes[l] = iv[1];
    laneOf.set(iv.join(','), l);
  }
  const acts = [
    { name: 'earliest finish', picks: efPicks(ivs), color: 'good' },
    { name: 'shortest first', picks: sfPicks(ivs), color: 'warn' },
  ];
  return { ivs, laneOf, laneCount: lanes.length, acts };
}

export default function ActivityViz() {
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
        const act = s.scene.acts[s.act];
        if (s.tick >= act.picks.length * TICKS_PER_PICK + ACT_HOLD) {
          s.tick = 0;
          s.act += 1;
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
        const act = s.scene.acts[actIdx];
        const shown = done
          ? act.picks.length
          : Math.min(Math.floor(s.tick / TICKS_PER_PICK) + (s.tick % TICKS_PER_PICK > 4 ? 1 : 0), act.picks.length);
        const picked = new Set(act.picks.slice(0, shown).map((iv) => iv.join(',')));
        const blocked = new Set();
        s.scene.ivs.forEach((iv) => {
          const key = iv.join(',');
          if (picked.has(key)) return;
          for (const p of act.picks.slice(0, shown)) {
            if (overlaps(iv, p)) {
              blocked.add(key);
              break;
            }
          }
        });

        const xOf = (t) => 22 + (t / 116) * (W - 44);
        const laneH = Math.min(26, 190 / Math.max(s.scene.laneCount, 1));
        s.scene.ivs.forEach((iv) => {
          const key = iv.join(',');
          const lane = s.scene.laneOf.get(key);
          const y = 46 + lane * laneH;
          const isPick = picked.has(key);
          const isBlocked = blocked.has(key);
          const fresh = shown > 0 && act.picks[shown - 1] && act.picks[shown - 1].join(',') === key && !done;
          ctx.globalAlpha = isBlocked ? 0.22 : 1;
          ctx.fillStyle = fresh ? heur : isPick ? good : isBlocked ? warn : `${algo}55`;
          ctx.strokeStyle = fresh ? heur : isPick ? good : isBlocked ? warn : algo;
          const x1 = xOf(iv[0]);
          const wdt = xOf(iv[1]) - x1;
          ctx.fillRect(x1, y, wdt, laneH - 8);
          ctx.globalAlpha = 1;
        });

        // The clock cursor for the earliest-finish act.
        if (actIdx === 0 && shown > 0 && !done) {
          const lastPick = act.picks[Math.min(shown, act.picks.length) - 1];
          const cx = xOf(lastPick[1]);
          ctx.strokeStyle = `${heur}aa`;
          ctx.setLineDash([4, 4]);
          ctx.beginPath();
          ctx.moveTo(cx, 38);
          ctx.lineTo(cx, 240);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.fillStyle = heur;
          ctx.font = '10px ui-monospace, monospace';
          ctx.fillText('room free', cx + 4, 246);
        }

        ctx.fillStyle = dim;
        ctx.font = '11px ui-monospace, monospace';
        ctx.fillText(
          actIdx === 0
            ? 'act 1 · earliest FINISH: take what frees the room soonest'
            : 'act 2 · shortest first: the same requests, the plausible compass',
          14,
          20,
        );
        const efCount = s.scene.acts[0].picks.length;
        const sfCount = s.scene.acts[1].picks.length;
        let line = `picked ${shown} · blocked ${blocked.size}`;
        if (done || shown >= act.picks.length) {
          if (actIdx === 0) {
            ctx.fillStyle = good;
            line = `earliest finish: ${efCount} bookings (this instance's optimum)`;
          } else {
            ctx.fillStyle = warn;
            line = `shortest first: ${sfCount} bookings · earliest finish got ${efCount}: plausible is not proven`;
          }
        } else {
          ctx.fillStyle = ink;
        }
        ctx.font = '12px ui-monospace, monospace';
        ctx.fillText(line, 14, H - 28);
        ctx.fillStyle = dim;
        ctx.font = '10px ui-monospace, monospace';
        ctx.fillText('green = booked · red dim = blocked by a booking · amber = the pick being made', 14, H - 10);

        statsRef.current = {
          line: done
            ? `same skeleton, different compass: ${efCount} vs ${sfCount}`
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
          new requests
        </button>
        <span className="viz-stat">
          {snap.line || 'collecting requests…'}
        </span>
      </div>
    </>
  );
}
