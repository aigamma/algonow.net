import { useEffect, useRef, useState } from 'react';
import { useCanvasLoop, isStill, holdTicks, mulberry32 } from './useCanvasLoop.js';

// Two acts on one machine. Act one: repetitive prose: the amber
// cursor extends while the table knows the phrase, each emission
// flashes the span blue, mints one new chip, and the output bits bar
// stays comfortably shorter than the raw bar. Act two: random noise:
// phrases never learn to grow, twelve bits leave for nearly every
// byte, and the output bar overtakes the raw bar in red: the
// expansion, drawn.
const W = 640;
const H = 300;
const SEED = 20260827;
const STEP_TICKS = 11;
const END_HOLD = 64;

function traceEncode(text) {
  // Per-emission steps over a character string (codes conceptual).
  const table = new Map();
  for (let i = 0; i < 256; i++) table.set(String.fromCharCode(i), i);
  let next = 256;
  const steps = [];
  let start = 0;
  let w = '';
  for (let i = 0; i < text.length; i++) {
    const wc = w + text[i];
    if (table.has(wc)) {
      w = wc;
    } else {
      steps.push({ start, len: w.length, code: table.get(w), mint: wc });
      table.set(wc, next++);
      w = text[i];
      start = i;
    }
  }
  if (w) steps.push({ start, len: w.length, code: table.get(w), mint: null });
  return steps;
}

function makeScene(seed) {
  const rand = mulberry32(seed);
  const words = ['the cat', 'the hat', 'and the cat', 'and the hat'];
  let prose = '';
  while (prose.length < 66) prose += words[Math.floor(rand() * words.length)] + ' ';
  prose = prose.slice(0, 66);
  let noise = '';
  const glyphs = 'abcdefghjkmnpqrstuvwxyz0123456789#%&*+=?';
  for (let i = 0; i < 44; i++) noise += glyphs[Math.floor(rand() * glyphs.length)];
  return {
    acts: [
      { text: prose, steps: traceEncode(prose), note: 'act 1 · repetitive prose: the dictionary earns its keep', bad: false },
      { text: noise, steps: traceEncode(noise), note: 'act 2 · random bytes: nothing to learn, 12 bits leave anyway', bad: true },
    ],
  };
}

export default function LzwViz() {
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
        const act = s.scene.acts[s.act];
        const total = act.steps.length * STEP_TICKS + END_HOLD;
        s.tick += 1;
        if (s.tick >= total) {
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
        const tick = done ? act.steps.length * STEP_TICKS + END_HOLD - 1 : s.tick;
        const emitted = Math.min(Math.floor(tick / STEP_TICKS), act.steps.length);
        const finished = emitted >= act.steps.length;
        const cur = finished ? null : act.steps[emitted];

        // The input row.
        const cw = 606 / Math.max(act.text.length, 1);
        ctx.font = '11px ui-monospace, monospace';
        const processedTo = cur ? cur.start : act.text.length;
        for (let i = 0; i < act.text.length; i++) {
          ctx.fillStyle = i < processedTo ? dim : ink;
          ctx.fillText(act.text[i], 18 + i * cw, 58);
        }
        // Current phrase: amber box growing across the span.
        if (cur) {
          const frac = Math.min(1, ((tick % STEP_TICKS) + 1) / (STEP_TICKS - 3));
          const span = Math.max(1, Math.round(cur.len * frac));
          ctx.strokeStyle = heur;
          ctx.lineWidth = 1.6;
          ctx.strokeRect(16 + cur.start * cw, 44, span * cw, 20);
        }

        // Minted chips: the last few phrases the table learned.
        const mints = act.steps.slice(0, emitted).map((st) => st.mint).filter(Boolean);
        const recent = mints.slice(-6);
        ctx.font = '11px ui-monospace, monospace';
        let mx = 18;
        ctx.fillStyle = dim;
        ctx.fillText('minted:', mx, 102);
        mx += 58;
        recent.forEach((m, k) => {
          const label = `"${m}"`;
          const wpx = ctx.measureText(label).width + 12;
          const newest = k === recent.length - 1;
          ctx.strokeStyle = newest ? heur : '#2a3450';
          ctx.strokeRect(mx, 88, wpx, 20);
          ctx.fillStyle = newest ? heur : dim;
          ctx.fillText(label, mx + 6, 102);
          mx += wpx + 8;
        });
        ctx.fillStyle = dim;
        ctx.fillText(`table: ${256 + mints.length}`, 545, 102);

        // Output strip: one blue cell per emitted code.
        const cellW = Math.min(14, 606 / Math.max(act.steps.length, 1));
        for (let k = 0; k < emitted; k++) {
          ctx.fillStyle = act.steps[k].len > 1 ? algo : '#33507a';
          ctx.fillRect(18 + k * cellW, 126, cellW - 2, 16);
        }
        ctx.fillStyle = dim;
        ctx.fillText('codes out (12 bits each; darker = a 1-byte phrase)', 18, 160);

        // The bits bars.
        const rawBits = 8 * processedTo;
        const outBits = 12 * emitted;
        const scale = 570 / (8 * act.text.length * 1.6);
        ctx.fillStyle = '#2a3450';
        ctx.fillRect(18, 186, 8 * act.text.length * scale, 10);
        ctx.fillStyle = dim;
        ctx.fillRect(18, 186, rawBits * scale, 10);
        ctx.fillText(`raw in: ${rawBits} bits`, 18 + 8 * act.text.length * scale + 8, 195);
        const over = outBits > rawBits;
        ctx.fillStyle = over ? warn : algo;
        ctx.fillRect(18, 206, outBits * scale, 10);
        ctx.fillStyle = over ? warn : algo;
        ctx.fillText(`codes out: ${outBits} bits`, 18 + Math.max(outBits, 1) * scale + 8, 215);

        ctx.fillStyle = dim;
        ctx.font = '11px ui-monospace, monospace';
        ctx.fillText(act.note, 14, 20);

        let line;
        if (!finished) {
          const phrase = cur ? act.text.substr(cur.start, cur.len) : '';
          line = `emit "${phrase}" (${cur ? cur.len : 0} byte${cur && cur.len > 1 ? 's' : ''}) · mint ${cur && cur.mint ? `"${cur.mint}"` : 'nothing: final flush'}`;
          ctx.fillStyle = ink;
        } else {
          const ratio = rawBits / Math.max(outBits, 1);
          if (act.bad) {
            line = `${outBits} bits out for ${rawBits} in: a ${(outBits / rawBits).toFixed(2)}x EXPANSION: nothing to learn, 12 bits anyway`;
            ctx.fillStyle = warn;
          } else {
            line = `${outBits} bits out for ${rawBits} in: ${ratio.toFixed(2)}x: the dictionary rode inside the data`;
            ctx.fillStyle = good;
          }
        }
        ctx.font = '12px ui-monospace, monospace';
        ctx.fillText(line, 14, H - 12);

        statsRef.current = {
          line: done
            ? 'phrases in, codes out, no codebook on the wire: and noise pays 12 bits a byte'
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
          new stream
        </button>
        <span className="viz-stat">
          {snap.line || 'the table warms up…'}
        </span>
      </div>
    </>
  );
}
