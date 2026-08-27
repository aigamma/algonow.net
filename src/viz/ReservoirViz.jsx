import { useEffect, useRef, useState } from 'react';
import { useCanvasLoop, isStill, holdTicks, mulberry32 } from './useCanvasLoop.js';

// The lifeboat, live. Items stream past the twelve-seat reservoir; item n
// boards with probability 12/n (watch the printed odds fall), evicting a
// random resident. Below, a histogram accumulates across whole streams:
// each finished stream drops its final sample into ten bins by arrival
// decile. Early arrivals board easily and are evicted often; late ones
// rarely board but rarely leave: the bars flatten toward the green line,
// which is uniformity happening in public.
const K = 12;
const N = 400;
const W = 640;
const H = 300;
const SEED = 20260827;
const ITEMS_PER_TICK = 2;

export default function ReservoirViz() {
  const canvasRef = useRef(null);
  const cycle = useRef(0);
  const binsRef = useRef(new Array(10).fill(0));
  const streamsRef = useRef(0);
  const statsRef = useRef({ n: 0, admits: 0, streams: 0 });
  const [restart, setRestart] = useState(0);
  const [snap, setSnap] = useState({ n: 0, admits: 0, streams: 0 });

  useEffect(() => {
    const id = setInterval(() => setSnap({ ...statsRef.current }), 400);
    return () => clearInterval(id);
  }, []);

  useCanvasLoop(
    canvasRef,
    {
      width: W,
      height: H,
      stepMs: 40,
      init: () => ({
        rand: mulberry32(SEED + cycle.current * 7919),
        sample: [],
        n: 0,
        admits: 0,
        lastEvent: null,
        rest: 0,
        stopAtRest: isStill(),
      }),
      tick: (s) => {
        if (s.n >= N) {
          if (s.rest === 0) {
            // Bank this stream's final sample into the deciles.
            for (const item of s.sample) {
              binsRef.current[Math.min(Math.floor((item / N) * 10), 9)] += 1;
            }
            streamsRef.current += 1;
          }
          if (s.stopAtRest) return false;
          s.rest += 1;
          if (s.rest > holdTicks(s)) {
            cycle.current += 1;
            Object.assign(s, {
              rand: mulberry32(SEED + cycle.current * 7919),
              sample: [],
              n: 0,
              admits: 0,
              lastEvent: null,
              rest: 0,
            });
          }
          return true;
        }
        for (let b = 0; b < ITEMS_PER_TICK && s.n < N; b++) {
          s.n += 1;
          if (s.sample.length < K) {
            s.sample.push(s.n - 1);
            s.admits += 1;
            s.lastEvent = { kind: 'fill', item: s.n };
          } else {
            const j = Math.floor(s.rand() * s.n);
            if (j < K) {
              s.lastEvent = { kind: 'admit', item: s.n, seat: j, evicted: s.sample[j] };
              s.sample[j] = s.n - 1;
              s.admits += 1;
            } else {
              s.lastEvent = { kind: 'refuse', item: s.n };
            }
          }
        }
        statsRef.current = { n: s.n, admits: s.admits, streams: streamsRef.current };
        return true;
      },
      draw: (ctx, s) => {
        ctx.clearRect(0, 0, W, H);
        const css = getComputedStyle(document.documentElement);
        const algo = css.getPropertyValue('--algo').trim() || '#5da2ff';
        const heur = css.getPropertyValue('--heur').trim() || '#f0b94b';
        const warn = css.getPropertyValue('--warn').trim() || '#e06767';
        const path = css.getPropertyValue('--path').trim() || '#62d98a';
        const dim = css.getPropertyValue('--ink-dim').trim() || '#9aa5bd';

        ctx.font = '11px ui-monospace, monospace';
        ctx.fillStyle = dim;
        const odds = s.n > K ? `p = ${K}/${s.n} = ${((K / s.n) * 100).toFixed(1)}%` : 'boarding freely';
        const ev = s.lastEvent;
        const evText =
          ev == null
            ? ''
            : ev.kind === 'refuse'
              ? ` · item ${ev.item}: refused`
              : ev.kind === 'admit'
                ? ` · item ${ev.item}: boarded seat ${ev.seat}, evicting #${ev.evicted + 1}`
                : ` · item ${ev.item}: filling`;
        ctx.fillText(
          s.n >= N ? `stream ended at ${N} · sample banked · resting` : `item ${s.n} of ${N} · ${odds}${evText}`,
          14,
          18,
        );

        // The reservoir: twelve seats.
        for (let i = 0; i < K; i++) {
          const x = 14 + i * 51;
          const y = 30;
          const flash = ev && ev.kind === 'admit' && ev.seat === i && s.n < N;
          ctx.fillStyle = 'rgba(255,255,255,0.05)';
          ctx.fillRect(x, y, 46, 26);
          ctx.strokeStyle = flash ? heur : 'rgba(255,255,255,0.16)';
          ctx.lineWidth = flash ? 1.8 : 1;
          ctx.strokeRect(x + 0.5, y + 0.5, 45, 25);
          if (s.sample[i] !== undefined) {
            ctx.fillStyle = flash ? heur : '#e9edf6';
            ctx.font = '11px ui-monospace, monospace';
            ctx.textAlign = 'center';
            ctx.fillText(`#${s.sample[i] + 1}`, x + 23, y + 17);
            ctx.textAlign = 'start';
          }
        }
        if (ev && ev.kind === 'refuse' && s.n < N) {
          ctx.fillStyle = warn;
          ctx.fillRect(14, 60, 12 * 51 - 5, 2);
        }

        // The uniformity histogram across finished streams.
        const bins = binsRef.current;
        const streams = streamsRef.current;
        const y0 = 92;
        const hMax = 150;
        const expected = (streams * K) / 10 || 1;
        const scale = hMax / (expected * 2.2);
        ctx.fillStyle = dim;
        ctx.fillText(
          streams > 0
            ? `final samples of ${streams} finished stream${streams === 1 ? '' : 's'}, by arrival decile:`
            : 'when a stream ends, its sample banks here, by arrival decile:',
          14,
          y0 - 6,
        );
        for (let b = 0; b < 10; b++) {
          const x = 14 + b * 61;
          const hgt = Math.min(bins[b] * scale, hMax);
          ctx.fillStyle = `${algo}77`;
          ctx.fillRect(x, y0 + hMax - hgt, 52, hgt);
          ctx.fillStyle = dim;
          ctx.font = '9px ui-monospace, monospace';
          ctx.fillText(`${b * 10}-${b * 10 + 10}%`, x + 4, y0 + hMax + 12);
        }
        const eY = y0 + hMax - Math.min(expected * scale, hMax);
        ctx.strokeStyle = path;
        ctx.lineWidth = 1.4;
        ctx.setLineDash([5, 4]);
        ctx.beginPath();
        ctx.moveTo(14, eY);
        ctx.lineTo(14 + 10 * 61 - 9, eY);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = path;
        ctx.fillText('uniform', W - 66, eY - 4);
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
            binsRef.current = new Array(10).fill(0);
            streamsRef.current = 0;
            setRestart((t) => t + 1);
          }}
        >
          reset the tally
        </button>
        <span className="viz-stat">
          {snap.n > 0
            ? <>admissions so far: <strong>{snap.admits}</strong> of {snap.n} · every decile converges to the green line</>
            : 'boarding the lifeboat…'}
        </span>
      </div>
    </>
  );
}
