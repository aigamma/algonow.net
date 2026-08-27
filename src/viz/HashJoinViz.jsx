import { useEffect, useRef, useState } from 'react';
import { useCanvasLoop, isStill, holdTicks, mulberry32 } from './useCanvasLoop.js';

// Two acts of one join. Act one: the build phase drops each amber
// build row into its hash bucket; then the probe rows stream in
// blue, each lighting exactly one bucket, matches sparking green
// into the output tray: sixty touches where the all-pairs scan
// would pay hundreds. Act two: the sabotage: a constant hash sends
// every build row to bucket zero, and each probe now walks the
// whole chain: the touch counter grinds out exactly the nested
// loop bill the hash join was built to retire.
const W = 640;
const H = 300;
const SEED = 20260827;
const NBUCK = 12;
const NR = 24;
const NS = 36;
const END_HOLD = 70;

export function makeScene(seed) {
  const rand = mulberry32(seed);
  const keys = [];
  for (let i = 0; i < 10; i++) keys.push(3 + Math.floor(rand() * 96));
  const R = [];
  for (let i = 0; i < NR; i++) R.push(keys[Math.floor(rand() * keys.length)]);
  const S = [];
  for (let i = 0; i < NS; i++) S.push(keys[Math.floor(rand() * keys.length)]);

  function run(hashFn) {
    const buckets = Array.from({ length: NBUCK }, () => []);
    const events = [];
    let touches = 0;
    let matches = 0;
    for (let i = 0; i < NR; i++) {
      const b = hashFn(R[i]);
      buckets[b].push(R[i]);
      events.push({ tag: 'build', row: i, bucket: b, touches, matches });
    }
    for (let j = 0; j < NS; j++) {
      const b = hashFn(S[j]);
      let m = 0;
      for (const rk of buckets[b]) {
        touches += 1;
        if (rk === S[j]) m += 1;
      }
      matches += m;
      events.push({ tag: 'probe', row: j, bucket: b, hit: m, touches, matches });
    }
    return { buckets, events, touches, matches };
  }

  const good = run((k) => k % NBUCK);
  const bad = run(() => 0);
  return { R, S, good, bad };
}

export default function HashJoinViz() {
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
        const run = s.act === 0 ? s.scene.good : s.scene.bad;
        if (s.tick >= run.events.length * 3 + END_HOLD) {
          // Hold the finished act for the full rest before the next
          // act begins: every burst of motion earns its two minutes.
          s.tick = run.events.length * 3 + END_HOLD;
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
        const run = actIdx === 0 ? sc.good : sc.bad;
        const evs = run.events;
        const ei = Math.min(done ? evs.length - 1 : Math.floor(s.tick / 3), evs.length - 1);
        const ev = evs[ei];
        const finished = done || Math.floor(s.tick / 3) >= evs.length;

        ctx.fillStyle = dim;
        ctx.font = '11px ui-monospace, monospace';
        ctx.fillText(
          actIdx === 0
            ? 'act 1 · build the small side into buckets, stream the big side past them'
            : 'act 2 · the sabotage: a constant hash, every build row in bucket zero',
          14,
          20,
        );

        // Bucket columns: reconstruct fill level at this event.
        const fills = new Array(NBUCK).fill(0);
        for (let i = 0; i <= ei; i++) {
          if (evs[i].tag === 'build') fills[evs[i].bucket] += 1;
        }
        const bx = (b) => 30 + b * 38;
        for (let b = 0; b < NBUCK; b++) {
          ctx.strokeStyle = 'rgba(154,165,189,0.35)';
          ctx.lineWidth = 1;
          ctx.strokeRect(bx(b), 88, 30, 132);
          for (let c = 0; c < fills[b]; c++) {
            ctx.fillStyle = heur;
            ctx.globalAlpha = 0.85;
            ctx.fillRect(bx(b) + 2, 214 - c * 5.4, 26, 4.4);
            ctx.globalAlpha = 1;
          }
          ctx.fillStyle = dim;
          ctx.font = '9px ui-monospace, monospace';
          ctx.fillText(String(b), bx(b) + 11, 232);
        }

        // Current event: build drop or probe beam.
        if (!finished) {
          if (ev.tag === 'build') {
            ctx.fillStyle = heur;
            ctx.beginPath();
            ctx.arc(bx(ev.bucket) + 15, 66, 6, 0, Math.PI * 2);
            ctx.fill();
          } else {
            ctx.strokeStyle = ev.hit > 0 ? good : algo;
            ctx.lineWidth = 2.2;
            ctx.beginPath();
            ctx.moveTo(bx(ev.bucket) + 15, 56);
            ctx.lineTo(bx(ev.bucket) + 15, 86);
            ctx.stroke();
            ctx.fillStyle = algo;
            ctx.beginPath();
            ctx.arc(bx(ev.bucket) + 15, 50, 6, 0, Math.PI * 2);
            ctx.fill();
            if (ev.hit > 0) {
              ctx.fillStyle = good;
              ctx.font = '10px ui-monospace, monospace';
              ctx.fillText(`+${ev.hit}`, bx(ev.bucket) + 24, 52);
            }
          }
        }

        // Output tray.
        const rows = Math.min(ev.matches, 60);
        for (let m = 0; m < rows; m++) {
          ctx.fillStyle = good;
          ctx.globalAlpha = 0.8;
          ctx.fillRect(506 + (m % 5) * 24, 210 - Math.floor(m / 5) * 10, 20, 8);
          ctx.globalAlpha = 1;
        }
        ctx.fillStyle = dim;
        ctx.font = '10px ui-monospace, monospace';
        ctx.fillText('joined rows', 516, 232);

        const allPairs = NR * NS;
        let line;
        if (finished) {
          if (actIdx === 0) {
            line = `${NR} builds + ${NS} probes, ${run.touches} chain touches, ${run.matches} rows joined: the all-pairs scan pays ${allPairs}`;
            ctx.fillStyle = good;
          } else {
            line = `same rows out, but ${run.touches} touches: exactly ${NR}×${NS}: the nested loop it was built to retire`;
            ctx.fillStyle = warn;
          }
        } else {
          const what = ev.tag === 'build' ? `build row ${ev.row + 1}/${NR} → bucket ${ev.bucket}` : `probe ${ev.row + 1}/${NS} → bucket ${ev.bucket}`;
          line = `${what} · touches ${ev.touches} · rows ${ev.matches}`;
          ctx.fillStyle = actIdx === 1 && ev.tag === 'probe' ? warn : ink;
        }
        ctx.font = '12px ui-monospace, monospace';
        ctx.fillText(line, 14, H - 12);

        statsRef.current = {
          line: done
            ? `identical output both acts: ${sc.good.touches} touches with a real hash, ${sc.bad.touches} with a constant one`
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
          new tables
        </button>
        <span className="viz-stat">
          {snap.line || 'dealing the rows…'}
        </span>
      </div>
    </>
  );
}
