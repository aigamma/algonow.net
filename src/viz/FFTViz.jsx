import { useEffect, useRef, useState } from 'react';
import { useCanvasLoop, isStill, holdTicks, mulberry32 } from './useCanvasLoop.js';

// Two acts. Act one: the cascade itself, sixteen lanes from bit-reversed
// input to natural-order spectrum, the butterflies of each stage drawn
// pair by pair (blue even arm, amber odd arm with its twiddle), the
// multiplication counter running against the definition's 256. Act two:
// the payoff: a 128-sample signal hiding three tones in noise, its
// spectrum rising bar by bar, the three true bins flagged green.
const W = 640;
const H = 300;
const SEED = 20260827;
const N1 = 16;
const TICKS_PER_FLY = 4;
const STAGE_HOLD = 16;
const ACT2_STEPS = 90;

function fftPairs(re, im, invert) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j |= bit;
    if (i < j) {
      [re[i], re[j]] = [re[j], re[i]];
      [im[i], im[j]] = [im[j], im[i]];
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = ((invert ? 1 : -1) * 2 * Math.PI) / len;
    for (let i = 0; i < n; i += len) {
      for (let k = 0; k < len / 2; k++) {
        const wr = Math.cos(ang * k);
        const wi = Math.sin(ang * k);
        const a = i + k;
        const b = i + k + len / 2;
        const vr = re[b] * wr - im[b] * wi;
        const vi = re[b] * wi + im[b] * wr;
        re[b] = re[a] - vr;
        im[b] = im[a] - vi;
        re[a] += vr;
        im[a] += vi;
      }
    }
  }
  if (invert) for (let i = 0; i < n; i++) { re[i] /= n; im[i] /= n; }
}

function bitrev(i, bits) {
  let r = 0;
  for (let b = 0; b < bits; b++) if (i & (1 << b)) r |= 1 << (bits - 1 - b);
  return r;
}

function makeScene(seed) {
  const rand = mulberry32(seed);
  // Act 1: the butterfly schedule for n = 16 (structure, not values).
  const stages = [];
  for (let len = 2, s = 0; len <= N1; len <<= 1, s++) {
    const flies = [];
    for (let i = 0; i < N1; i += len) {
      for (let k = 0; k < len / 2; k++) {
        flies.push({ a: i + k, b: i + k + len / 2, k, len });
      }
    }
    stages.push(flies);
  }
  // Act 2: three tones in noise, spectrum computed by the same code.
  const n2 = 128;
  const bins = [7, 19, 43];
  const amps = [1.0, 0.7, 0.45];
  const sig = [];
  for (let t = 0; t < n2; t++) {
    let v = 0;
    for (let i = 0; i < 3; i++) v += amps[i] * Math.cos((2 * Math.PI * bins[i] * t) / n2);
    sig.push(v + (rand() - 0.5) * 0.5);
  }
  const re = sig.slice();
  const im = new Array(n2).fill(0);
  fftPairs(re, im, false);
  const mags = [];
  for (let k = 1; k < n2 / 2; k++) mags.push(Math.hypot(re[k], im[k]));
  return { stages, sig, mags, bins };
}

export default function FFTViz() {
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
        const act1Total =
          s.scene.stages.reduce((t, st) => t + st.length * TICKS_PER_FLY + STAGE_HOLD, 0) + 30;
        if (s.act === 0 && s.tick >= act1Total) {
          s.tick = 0;
          s.act = 1;
        } else if (s.act === 1 && s.tick >= ACT2_STEPS + 60) {
          s.tick = 0;
          s.act = 2;
        }
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
        const done = s.act >= 2;
        let line = '';

        if (s.act === 0 || (done && false)) {
          // Act 1: the cascade.
          const laneY = (i) => 44 + i * 14.5;
          const colX = [70, 190, 310, 430, 550];
          // Lanes.
          for (let i = 0; i < N1; i++) {
            ctx.strokeStyle = '#232c40';
            ctx.beginPath();
            ctx.moveTo(colX[0], laneY(i));
            ctx.lineTo(colX[4], laneY(i));
            ctx.stroke();
            ctx.fillStyle = dim;
            ctx.font = '8px ui-monospace, monospace';
            ctx.fillText(`x[${bitrev(i, 4)}]`, 26, laneY(i) + 3);
            ctx.fillText(`X[${i}]`, colX[4] + 8, laneY(i) + 3);
          }
          // Butterflies revealed so far.
          let t = s.tick;
          let shownStages = 0;
          let mults = 0;
          for (let st = 0; st < 4; st++) {
            const flies = s.scene.stages[st];
            const stageTicks = flies.length * TICKS_PER_FLY + STAGE_HOLD;
            const upTo =
              t >= stageTicks
                ? flies.length
                : Math.min(Math.floor(t / TICKS_PER_FLY) + 1, flies.length);
            for (let f = 0; f < upTo; f++) {
              const { a, b, k } = flies[f];
              const x1 = colX[st];
              const x2 = colX[st + 1];
              const fresh = t < stageTicks && f === upTo - 1;
              ctx.strokeStyle = fresh ? ink : `${algo}77`;
              ctx.lineWidth = fresh ? 1.8 : 1;
              ctx.beginPath();
              ctx.moveTo(x1, laneY(a));
              ctx.lineTo(x2, laneY(b));
              ctx.stroke();
              ctx.strokeStyle = fresh ? heur : `${heur}77`;
              ctx.beginPath();
              ctx.moveTo(x1, laneY(b));
              ctx.lineTo(x2, laneY(a));
              ctx.stroke();
              if (k > 0 && fresh) {
                ctx.fillStyle = heur;
                ctx.font = '9px ui-monospace, monospace';
                ctx.fillText(`×W^${k}`, (x1 + x2) / 2 - 10, laneY(b) + 11);
              }
            }
            mults += upTo;
            if (t >= stageTicks) {
              shownStages += 1;
              t -= stageTicks;
            } else break;
          }
          ctx.fillStyle = dim;
          ctx.font = '11px ui-monospace, monospace';
          ctx.fillText('act 1 · the cascade: 4 stages of 8 butterflies, n = 16', 14, 20);
          line = `stage ${Math.min(shownStages + 1, 4)}/4 · mults so far ${mults} · the definition needs 256`;
          ctx.fillStyle = ink;
          ctx.fillText(line, 14, H - 12);
          if (shownStages >= 4) {
            ctx.fillStyle = good;
            line = 'total: 32 = (n/2)·log₂ n · the definition: 256 · the gap grows forever';
            ctx.fillText(line, 300, H - 12);
          }
        } else {
          // Act 2: the payoff.
          const { sig, mags, bins } = s.scene;
          const upTo = done ? ACT2_STEPS : Math.min(s.tick, ACT2_STEPS);
          // Waveform.
          ctx.strokeStyle = algo;
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          sig.forEach((v, i) => {
            const x = 20 + (i / (sig.length - 1)) * (W - 40);
            const y = 78 - v * 22;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          });
          ctx.stroke();
          // Spectrum bars rising.
          const mmax = Math.max(...mags);
          const bw = (W - 40) / mags.length;
          const frac = upTo / ACT2_STEPS;
          mags.forEach((m, idx) => {
            const k = idx + 1;
            const h = (m / mmax) * 130 * Math.min(1, frac * 1.4);
            const isTone = bins.includes(k);
            ctx.fillStyle = isTone && frac > 0.8 ? good : `${heur}66`;
            ctx.fillRect(20 + idx * bw, 258 - h, Math.max(1, bw - 1), h);
            if (isTone && frac >= 1) {
              ctx.fillStyle = good;
              ctx.font = '9px ui-monospace, monospace';
              ctx.fillText(String(k), 16 + idx * bw, 268);
            }
          });
          ctx.fillStyle = dim;
          ctx.font = '11px ui-monospace, monospace';
          ctx.fillText('act 2 · the payoff: 128 noisy samples → the spectrum', 14, 20);
          ctx.fillText('time domain', 14, 42);
          ctx.fillText('frequency domain', 14, 128);
          line =
            frac >= 1
              ? `three hidden tones surface at bins ${bins.join(', ')} · 448 mults, not 16,384`
              : `transforming… (${Math.round(frac * 100)}%)`;
          ctx.fillStyle = frac >= 1 ? good : ink;
          ctx.fillText(line, 14, H - 12);
        }

        statsRef.current = {
          line: done
            ? 'the cascade builds the spectrum: (n/2)·log₂ n multiplies, and the noise never hid the tones'
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
          new signal
        </button>
        <span className="viz-stat">
          {snap.line || 'bit-reversing the choir…'}
        </span>
      </div>
    </>
  );
}
