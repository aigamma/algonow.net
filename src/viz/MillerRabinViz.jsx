import { useEffect, useRef, useState } from 'react';
import { useCanvasLoop, isStill, holdTicks, mulberry32 } from './useCanvasLoop.js';

// The trial, watched, in three acts. Act one: 97, a prime, where every
// witness's squaring chain enters the ones through the front door (−1).
// Act two: 561, the Carmichael con artist with perfect Fermat references,
// convicted by the strong chain. Act three: 2047, where witness 2 lies
// and the next juror does not. Chains render box by box: a^d, then s
// squarings; green doors are ±1, red is a 1 reached from a stranger.
const W = 640;
const H = 300;
const SEED = 20260827;
const TICKS_PER_BOX = 9;
const VERDICT_HOLD = 36;

function powmod(a, e, m) {
  let r = 1;
  let b = a % m;
  let k = e;
  while (k > 0) {
    if (k & 1) r = (r * b) % m;
    b = (b * b) % m;
    k >>= 1;
  }
  return r;
}

function decompose(n) {
  let s = 0;
  let d = n - 1;
  while (d % 2 === 0) {
    s += 1;
    d = Math.floor(d / 2);
  }
  return { s, d };
}

function runWitness(n, a) {
  const { s, d } = decompose(n);
  const vals = [powmod(a, d, n)];
  for (let i = 0; i < s; i++) vals.push((vals[i] * vals[i]) % n);
  let pass = vals[0] === 1 || vals[0] === n - 1;
  for (let i = 1; i < s && !pass; i++) if (vals[i] === n - 1) pass = true;
  // Conviction site: the first 1 reached from a stranger, or a bad exit.
  let convictAt = -1;
  if (!pass) {
    for (let i = 0; i + 1 < vals.length; i++) {
      if (vals[i + 1] === 1 && vals[i] !== 1 && vals[i] !== n - 1) {
        convictAt = i + 1;
        break;
      }
    }
    if (convictAt < 0) convictAt = vals.length - 1; // Fermat exit failed
  }
  return { vals, pass, convictAt, s, d };
}

function makeScene(seed) {
  const rand = mulberry32(seed);
  const draw = (n) => 2 + Math.floor(rand() * (n - 4));
  // The closing witness of each composite act is redrawn until it
  // convicts, so the act always ends in the certificate. Liars are rare
  // (at most a quarter of the pool, measured far less), but a demo that
  // can stall on one is a demo that eventually will.
  const drawConvicting = (n) => {
    for (let t = 0; t < 60; t++) {
      const a = draw(n);
      if (!runWitness(n, a).pass) return a;
    }
    return 2;
  };
  const acts = [
    { n: 97, note: '97 is prime: every witness passes', witnesses: [draw(97), draw(97), draw(97)] },
    { n: 561, note: '561 = 3·11·17, Carmichael: Fermat sees a prime at all 320 coprime bases', witnesses: [draw(561), drawConvicting(561)] },
    { n: 2047, note: '2047 = 23·89: witness 2 lies, the jury does not', witnesses: [2, drawConvicting(2047)] },
  ];
  return acts.map((act) => ({
    ...act,
    runs: act.witnesses.map((a) => ({ a, ...runWitness(act.n, a) })),
  }));
}

export default function MillerRabinViz() {
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
        acts: makeScene(SEED + cycle.current * 7919),
        act: 0,
        wit: 0,
        tick: 0,
        rest: 0,
        stopAtRest: isStill(),
      }),
      tick: (s) => {
        if (s.act >= s.acts.length) {
          if (s.stopAtRest) return false;
          s.rest += 1;
          if (s.rest > holdTicks(s)) {
            cycle.current += 1;
            Object.assign(s, {
              acts: makeScene(SEED + cycle.current * 7919),
              act: 0,
              wit: 0,
              tick: 0,
              rest: 0,
            });
          }
          return true;
        }
        s.tick += 1;
        const run = s.acts[s.act].runs[s.wit];
        const total = run.vals.length * TICKS_PER_BOX + VERDICT_HOLD;
        if (s.tick >= total) {
          // Each witness run wipes and rebuilds the canvas, so each
          // holds its verdict for the full rest before the next one.
          s.tick = total;
          s.actRest = (s.actRest || 0) + 1;
          if (s.actRest > holdTicks(s)) {
            s.tick = 0;
            s.actRest = 0;
            s.wit += 1;
            if (s.wit >= s.acts[s.act].runs.length) {
              s.wit = 0;
              s.act += 1;
            }
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

        const done = s.act >= s.acts.length;
        const actIdx = done ? s.acts.length - 1 : s.act;
        const act = s.acts[actIdx];
        const run = done ? act.runs[act.runs.length - 1] : act.runs[s.wit];
        const shown = done
          ? run.vals.length
          : Math.min(Math.floor(s.tick / TICKS_PER_BOX), run.vals.length);
        const verdictNow = done || shown >= run.vals.length;

        ctx.fillStyle = dim;
        ctx.font = '11px ui-monospace, monospace';
        ctx.fillText(`act ${actIdx + 1}/3 · ${act.note}`, 14, 22);
        ctx.fillStyle = ink;
        ctx.font = '12px ui-monospace, monospace';
        ctx.fillText(`n = ${act.n}   n−1 = 2^${run.s} · ${run.d}`, 14, 52);
        ctx.fillStyle = heur;
        ctx.fillText(`witness a = ${run.a}`, 300, 52);

        // The chain boxes.
        const count = run.vals.length;
        const bw = Math.min(88, Math.floor((W - 48) / count) - 14);
        for (let i = 0; i < Math.min(shown, count); i++) {
          const x = 24 + i * (bw + 14);
          const y = 84;
          const v = run.vals[i];
          const isDoor = v === 1 || v === act.n - 1;
          const isCrime = !run.pass && verdictNow && (i === run.convictAt || i === run.convictAt - 1);
          ctx.fillStyle = isCrime ? `${warn}22` : isDoor ? `${good}18` : 'rgba(93,162,255,0.10)';
          ctx.fillRect(x, y, bw, 40);
          ctx.strokeStyle = isCrime ? warn : isDoor ? good : algo;
          ctx.lineWidth = isCrime ? 2.2 : 1.2;
          ctx.strokeRect(x + 0.5, y + 0.5, bw - 1, 39);
          ctx.fillStyle = ink;
          ctx.font = '12px ui-monospace, monospace';
          ctx.textAlign = 'center';
          ctx.fillText(String(v), x + bw / 2, y + 24);
          ctx.textAlign = 'start';
          ctx.fillStyle = dim;
          ctx.font = '9px ui-monospace, monospace';
          ctx.fillText(i === 0 ? 'a^d' : `sq ${i}`, x + 4, y - 4);
          if (v === act.n - 1) {
            ctx.fillStyle = good;
            ctx.fillText('≡ −1', x + 4, y + 52);
          } else if (v === 1) {
            ctx.fillStyle = good;
            ctx.fillText('≡ 1', x + 4, y + 52);
          }
          if (i < count - 1 && i < shown - 1) {
            ctx.fillStyle = dim;
            ctx.font = '11px ui-monospace, monospace';
            ctx.fillText('²→', x + bw + 1, y + 24);
          }
        }

        // The verdict.
        let line = '';
        if (verdictNow) {
          if (run.pass) {
            ctx.fillStyle = good;
            const how = run.vals[0] === 1 ? 'a^d ≡ 1' : 'entered through −1';
            line = `witness ${run.a} passes (${how})`;
          } else {
            ctx.fillStyle = warn;
            line =
              run.vals[run.vals.length - 1] !== 1
                ? `composite, certified: a^(n−1) ≢ 1`
                : `composite, certified: 1 reached from a stranger (nontrivial √1)`;
          }
          ctx.font = '12px ui-monospace, monospace';
          ctx.fillText(line, 14, 168);
        }

        // The running docket.
        ctx.fillStyle = dim;
        ctx.font = '11px ui-monospace, monospace';
        const docket = [];
        for (let i = 0; i < s.acts.length; i++) {
          const a2 = s.acts[i];
          if (i < actIdx || done) {
            const passes = a2.runs.filter((r) => r.pass).length;
            docket.push(
              a2.runs.every((r) => r.pass)
                ? `${a2.n}: probably prime (${a2.runs.length} rounds, error < 4^−${a2.runs.length})`
                : `${a2.n}: composite, proven${passes ? ` (${passes} liar${passes > 1 ? 's' : ''} first)` : ''}`,
            );
          }
        }
        docket.forEach((d, i) => ctx.fillText(d, 14, 206 + i * 20));
        ctx.fillText('convict on proof · acquit with confidence 4^−k · liars ≤ ¼ of any pool', 14, H - 10);

        statsRef.current = {
          line: done
            ? 'the docket rests: one prime acquitted, two composites certified'
            : line || `running the chain for witness ${run.a}…`,
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
          new witnesses
        </button>
        <span className="viz-stat">
          {snap.line || 'summoning witnesses…'}
        </span>
      </div>
    </>
  );
}
